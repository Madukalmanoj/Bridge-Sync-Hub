import { Router, type IRouter } from "express";
import { eq, sql, and, lt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  applicationsTable,
  deptApplicationsTable,
  workflowStatesTable,
  eventLogTable,
} from "@workspace/db";
import {
  AddWorkflowStateBody,
} from "@workspace/api-zod";
import { detectAnomalies } from "../lib/aiService";

const router: IRouter = Router();

router.get("/analytics/summary", async (_req, res): Promise<void> => {
  const allApps = await db.select().from(applicationsTable);
  const totalApplications = allApps.length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayApplications = allApps.filter(a => new Date(a.submittedAt) >= todayStart).length;
  const weekApplications = allApps.filter(a => new Date(a.submittedAt) >= weekStart).length;
  const pendingApplications = allApps.filter(a => !["Approved", "Rejected"].includes(a.overallStatus)).length;
  const approvedApplications = allApps.filter(a => a.overallStatus === "Approved").length;
  const rejectedApplications = allApps.filter(a => a.overallStatus === "Rejected").length;

  const deptApps = await db.select().from(deptApplicationsTable);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const slaBreaches = deptApps.filter(a =>
    !["Approved", "Rejected"].includes(a.status) &&
    new Date(a.createdAt) < sevenDaysAgo
  ).length;

  const appIds = [...new Set(deptApps.filter(a => ["Approved", "Rejected"].includes(a.status)).map(a => a.appId))];
  const processingTimes = appIds.map(appId => {
    const app = allApps.find(a => a.appId === appId);
    if (!app) return null;
    const deptApp = deptApps.find(d => d.appId === appId && ["Approved", "Rejected"].includes(d.status));
    if (!deptApp) return null;
    return (new Date(deptApp.updatedAt).getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
  }).filter((t): t is number => t !== null);

  const avgProcessingDays = processingTimes.length > 0
    ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    : 0;

  res.json({
    totalApplications,
    todayApplications,
    weekApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    slaBreaches,
    avgProcessingDays: Math.round(avgProcessingDays * 10) / 10,
  });
});

router.get("/analytics/dept-stats", async (_req, res): Promise<void> => {
  const deptApps = await db.select({
    id: deptApplicationsTable.id,
    appId: deptApplicationsTable.appId,
    department: deptApplicationsTable.department,
    status: deptApplicationsTable.status,
    createdAt: deptApplicationsTable.createdAt,
    updatedAt: deptApplicationsTable.updatedAt,
  }).from(deptApplicationsTable);

  const depts = ["Food Safety Department", "Labour Department"];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stats = depts.map(dept => {
    const apps = deptApps.filter(a => a.department === dept);
    const total = apps.length;
    const pending = apps.filter(a => !["Approved", "Rejected"].includes(a.status)).length;
    const approved = apps.filter(a => a.status === "Approved").length;
    const rejected = apps.filter(a => a.status === "Rejected").length;
    const slaBreaches = apps.filter(a => !["Approved", "Rejected"].includes(a.status) && new Date(a.createdAt) < sevenDaysAgo).length;

    const resolved = apps.filter(a => ["Approved", "Rejected"].includes(a.status));
    const avgDaysRaw = resolved.length > 0
      ? resolved.reduce((sum, a) => sum + (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / resolved.length
      : 0;
    const avgDays = Math.round(avgDaysRaw * 10) / 10;

    const slaCompliancePct = total > 0 ? ((total - slaBreaches) / total) * 100 : 100;
    const rejectionRate = total > 0 ? (rejected / total) * 100 : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(
      slaCompliancePct * 0.5 + (100 - rejectionRate) * 0.3 + (avgDays < 3 ? 100 : avgDays < 7 ? 60 : 20) * 0.2
    )));

    return { department: dept, total, pending, approved, rejected, avgDays, slaBreaches, healthScore };
  });

  res.json(stats);
});

router.get("/workflow-states", async (_req, res): Promise<void> => {
  const states = await db.select().from(workflowStatesTable);
  res.json(states);
});

router.post("/workflow-states", async (req, res): Promise<void> => {
  const parsed = AddWorkflowStateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [state] = await db.insert(workflowStatesTable).values(parsed.data).returning();
  res.status(201).json(state);
});

router.get("/events/stream", async (_req, res): Promise<void> => {
  const events = await db
    .select()
    .from(eventLogTable)
    .orderBy(sql`${eventLogTable.timestamp} DESC`)
    .limit(50);

  res.json(events.reverse());
});

export default router;
