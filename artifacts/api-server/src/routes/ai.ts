import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { applicationsTable, deptApplicationsTable, fieldMappingsTable } from "@workspace/db";
import {
  RunSchemaMappingBody,
  DiscoverSchemaBody,
  ChatWithAssistantBody,
  GetFieldMappingsParams,
  UpdateFieldMappingParams,
  UpdateFieldMappingBody,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { mapSchemaFields, detectAnomalies, discoverDeptFields, chatWithCitizenAssistant } from "../lib/aiService";

const router: IRouter = Router();

router.post("/ai/schema-map", async (req, res): Promise<void> => {
  const parsed = RunSchemaMappingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sourceSystem, targetSystem, sourceFields, targetFields } = parsed.data;
  const mappings = await mapSchemaFields(sourceSystem, targetSystem, sourceFields, targetFields);

  await db.delete(fieldMappingsTable).where(
    and(eq(fieldMappingsTable.sourceSystem, sourceSystem), eq(fieldMappingsTable.targetSystem, targetSystem))
  );

  await db.insert(fieldMappingsTable).values(
    mappings.map(m => ({
      sourceSystem,
      targetSystem,
      sourceField: m.sourceField,
      targetField: m.targetField,
      confidence: m.confidence,
      confirmed: "false",
      corrected: "false",
    }))
  );

  res.json(mappings);
});

router.post("/ai/anomaly-scan", async (_req, res): Promise<void> => {
  const [allApps, deptApps] = await Promise.all([
    db.select().from(applicationsTable),
    db.select().from(deptApplicationsTable),
  ]);

  const stats = {
    totalApplications: allApps.length,
    pendingApplications: allApps.filter(a => !["Approved", "Rejected"].includes(a.overallStatus)).length,
    approvedApplications: allApps.filter(a => a.overallStatus === "Approved").length,
    rejectedApplications: allApps.filter(a => a.overallStatus === "Rejected").length,
    byDepartment: ["Food Safety Department", "Labour Department"].map(dept => {
      const apps = deptApps.filter(a => a.department === dept);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return {
        department: dept,
        total: apps.length,
        pending: apps.filter(a => !["Approved", "Rejected"].includes(a.status)).length,
        slaBreaches: apps.filter(a => !["Approved", "Rejected"].includes(a.status) && new Date(a.createdAt) < sevenDaysAgo).length,
        idleCount: apps.filter(a => {
          const daysSinceUpdate = (Date.now() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate > 5 && !["Approved", "Rejected"].includes(a.status);
        }).length,
      };
    }),
  };

  const anomalies = await detectAnomalies(stats);
  res.json(anomalies);
});

router.post("/ai/schema-discover", async (req, res): Promise<void> => {
  const parsed = DiscoverSchemaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fields = await discoverDeptFields(parsed.data.departmentName, parsed.data.systemType);
  res.json(fields);
});

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = ChatWithAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, appId, language } = parsed.data;
  let appStatus = null;

  if (appId) {
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.appId, appId));
    if (app) {
      const deptApps = await db.select().from(deptApplicationsTable).where(eq(deptApplicationsTable.appId, appId));
      appStatus = { application: app, deptApplications: deptApps };
    }
  }

  const reply = await chatWithCitizenAssistant(message, appStatus, language ?? "en");
  res.json({ reply });
});

router.get("/field-mappings/:source/:target", async (req, res): Promise<void> => {
  const params = GetFieldMappingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const mappings = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.sourceSystem, decodeURIComponent(params.data.source)),
      eq(fieldMappingsTable.targetSystem, decodeURIComponent(params.data.target))
    ));

  const result = mappings.map(m => ({
    ...m,
    confirmed: m.confirmed === "true",
    corrected: m.corrected === "true",
  }));

  res.json(result);
});

router.put("/field-mappings/:id", async (req, res): Promise<void> => {
  const params = UpdateFieldMappingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFieldMappingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.targetField !== undefined) updateData.targetField = parsed.data.targetField;
  if (parsed.data.confirmed !== undefined) updateData.confirmed = parsed.data.confirmed ? "true" : "false";
  if (parsed.data.corrected !== undefined) updateData.corrected = parsed.data.corrected ? "true" : "false";

  const [updated] = await db
    .update(fieldMappingsTable)
    .set(updateData)
    .where(eq(fieldMappingsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Mapping not found" });
    return;
  }

  res.json({
    ...updated,
    confirmed: updated.confirmed === "true",
    corrected: updated.corrected === "true",
  });
});

export default router;
