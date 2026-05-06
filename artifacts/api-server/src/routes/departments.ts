import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  applicationsTable,
  deptApplicationsTable,
  documentRequestsTable,
  workflowEventsTable,
  officersTable,
  departmentsTable,
  eventLogTable,
} from "@workspace/db";
import {
  GetDeptApplicationsParams,
  GetDeptApplicationsQueryParams,
  UpdateDeptApplicationStatusParams,
  UpdateDeptApplicationStatusBody,
  RequestDocumentParams,
  RequestDocumentBody,
  GetOfficersParams,
  OnboardDepartmentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/officers/:deptName", async (req, res): Promise<void> => {
  const params = GetOfficersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const officers = await db
    .select()
    .from(officersTable)
    .where(eq(officersTable.department, decodeURIComponent(params.data.deptName)));

  res.json(officers);
});

router.get("/dept/:deptName/applications", async (req, res): Promise<void> => {
  const params = GetDeptApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetDeptApplicationsQueryParams.safeParse(req.query);
  const deptName = decodeURIComponent(params.data.deptName);

  const deptApps = await db
    .select({
      id: deptApplicationsTable.id,
      appId: deptApplicationsTable.appId,
      department: deptApplicationsTable.department,
      nativeFieldsJson: deptApplicationsTable.nativeFieldsJson,
      status: deptApplicationsTable.status,
      assignedOfficer: deptApplicationsTable.assignedOfficer,
      createdAt: deptApplicationsTable.createdAt,
      updatedAt: deptApplicationsTable.updatedAt,
      citizenName: applicationsTable.citizenName,
      businessType: applicationsTable.businessType,
      district: applicationsTable.district,
    })
    .from(deptApplicationsTable)
    .leftJoin(applicationsTable, eq(deptApplicationsTable.appId, applicationsTable.appId))
    .where(eq(deptApplicationsTable.department, deptName));

  const now = Date.now();
  const result = deptApps.map((app) => ({
    ...app,
    daysPending: Math.floor((now - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  res.json(result);
});

router.put("/dept/:deptName/applications/:appId/status", async (req, res): Promise<void> => {
  const params = UpdateDeptApplicationStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDeptApplicationStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const deptName = decodeURIComponent(params.data.deptName);
  const { appId } = params.data;
  const { status, actor, notes } = parsed.data;

  const [existing] = await db
    .select()
    .from(deptApplicationsTable)
    .where(and(eq(deptApplicationsTable.appId, appId), eq(deptApplicationsTable.department, deptName)));

  if (!existing) {
    res.status(404).json({ error: "Department application not found" });
    return;
  }

  const [updated] = await db
    .update(deptApplicationsTable)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(deptApplicationsTable.appId, appId), eq(deptApplicationsTable.department, deptName)))
    .returning();

  // Build rich notes for the workflow event
  const richNotes = notes
    ? notes
    : status === "Approved"
      ? `Application reviewed and approved by ${actor ?? "Officer"}. Decision: ✓ Granted.`
      : status === "Rejected"
        ? `Application rejected by ${actor ?? "Officer"}.`
        : status === "Under Review"
          ? `Application is now under active review by ${actor ?? "Officer"}.`
          : null;

  await db.insert(workflowEventsTable).values({
    appId,
    department: deptName,
    eventType: "workflow.state.changed",
    fromState: existing.status,
    toState: status,
    actor: actor ?? "Officer",
    notes: richNotes,
  });

  // Smart overallStatus: check all dept statuses after this update
  if (status === "Approved" || status === "Rejected") {
    const allDeptApps = await db
      .select()
      .from(deptApplicationsTable)
      .where(eq(deptApplicationsTable.appId, appId));

    const allStatuses = allDeptApps.map(d =>
      d.department === deptName ? status : d.status
    );

    let newOverallStatus: string;
    if (allStatuses.some(s => s === "Rejected")) {
      newOverallStatus = "Rejected";
    } else if (allStatuses.every(s => s === "Approved")) {
      newOverallStatus = "Approved";
    } else {
      newOverallStatus = "Under Review";
    }

    await db
      .update(applicationsTable)
      .set({ overallStatus: newOverallStatus })
      .where(eq(applicationsTable.appId, appId));
  }

  await db.insert(eventLogTable).values({
    eventType: "workflow.state.translated",
    appId,
    message: `EVENT: workflow.state.translated | ${deptName}: ${existing.status} → ${status} | Actor: ${actor ?? "Officer"}`,
    status: "SUCCESS",
  });

  res.json(updated);
});

router.post("/dept/:deptName/applications/:appId/request-document", async (req, res): Promise<void> => {
  const params = RequestDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RequestDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const deptName = decodeURIComponent(params.data.deptName);
  const { appId } = params.data;
  const { documentName, officerName } = parsed.data;

  const [docReq] = await db.insert(documentRequestsTable).values({
    appId,
    department: deptName,
    documentName,
  }).returning();

  await db
    .update(deptApplicationsTable)
    .set({ status: "Documents Requested", updatedAt: new Date() })
    .where(and(eq(deptApplicationsTable.appId, appId), eq(deptApplicationsTable.department, deptName)));

  await db.insert(workflowEventsTable).values({
    appId,
    department: deptName,
    eventType: "document.requested",
    fromState: "Under Review",
    toState: "Documents Requested",
    actor: officerName ?? "Officer",
    notes: `Document requested: ${documentName}`,
  });

  res.status(201).json(docReq);
});

router.get("/departments", async (_req, res): Promise<void> => {
  const depts = await db.select().from(departmentsTable);
  res.json(depts);
});

router.post("/departments", async (req, res): Promise<void> => {
  const parsed = OnboardDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dept] = await db.insert(departmentsTable).values({
    name: parsed.data.name,
    systemType: parsed.data.systemType,
    adapterStatus: "active",
  }).returning();

  await db.insert(officersTable).values([
    { name: `Officer A (${parsed.data.name})`, department: parsed.data.name, role: "Inspector" },
    { name: `Officer B (${parsed.data.name})`, department: parsed.data.name, role: "Senior Inspector" },
    { name: `Officer C (${parsed.data.name})`, department: parsed.data.name, role: "Inspector" },
  ]);

  res.status(201).json(dept);
});

export default router;
