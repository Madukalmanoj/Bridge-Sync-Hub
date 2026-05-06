import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  applicationsTable,
  deptApplicationsTable,
  documentRequestsTable,
  workflowEventsTable,
  eventLogTable,
} from "@workspace/db";
import {
  SubmitApplicationBody,
  GetApplicationParams,
  RespondDocumentParams,
  RespondDocumentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateAppId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `KA-2026-${num}`;
}

function translateToFoodSafety(app: {
  citizenName: string;
  aadhaar?: string | null;
  mobile: string;
  email?: string | null;
  businessName: string;
  businessType: string;
  district: string;
  description?: string | null;
  startDate?: string | null;
  documents?: string | null;
}) {
  return {
    applicant_name: app.citizenName,
    id_proof_number: app.aadhaar ?? "",
    contact_phone: app.mobile,
    communication_email: app.email ?? "",
    establishment_name: app.businessName,
    activity_category: app.businessType,
    jurisdiction_area: app.district,
    nature_of_business: app.description ?? "",
    proposed_commencement_date: app.startDate ?? "",
    document_checklist: app.documents ?? "",
  };
}

function translateToLabour(app: {
  citizenName: string;
  aadhaar?: string | null;
  mobile: string;
  email?: string | null;
  businessName: string;
  businessType: string;
  district: string;
  description?: string | null;
  startDate?: string | null;
  documents?: string | null;
}) {
  return {
    worker_establishment_name: app.businessName,
    proprietor_name: app.citizenName,
    aadhaar_reference: app.aadhaar ?? "",
    mobile_contact: app.mobile,
    email_id: app.email ?? "",
    industry_type: app.businessType,
    district_code: app.district,
    business_description: app.description ?? "",
    commencement_date: app.startDate ?? "",
    supporting_docs: app.documents ?? "",
  };
}

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = SubmitApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const appId = generateAppId();

  const [app] = await db.insert(applicationsTable).values({
    appId,
    citizenName: data.citizenName,
    aadhaar: data.aadhaar,
    mobile: data.mobile,
    email: data.email,
    businessName: data.businessName,
    businessType: data.businessType,
    district: data.district,
    description: data.description,
    startDate: data.startDate,
    documents: data.documents,
    overallStatus: "Submitted",
  }).returning();

  const foodSafetyFields = translateToFoodSafety(data);
  const labourFields = translateToLabour(data);

  await db.insert(deptApplicationsTable).values([
    {
      appId,
      department: "Food Safety Department",
      nativeFieldsJson: JSON.stringify(foodSafetyFields),
      status: "Received",
      assignedOfficer: "Officer Priya Sharma",
    },
    {
      appId,
      department: "Labour Department",
      nativeFieldsJson: JSON.stringify(labourFields),
      status: "Received",
      assignedOfficer: "Officer Ravi Kumar",
    },
  ]);

  await db.insert(workflowEventsTable).values([
    { appId, department: "Single Window", eventType: "application.submitted", fromState: null, toState: "Submitted", actor: data.citizenName, notes: "Application submitted via Single Window Portal" },
    { appId, department: "Food Safety Department", eventType: "adapter.foodsafety.received", fromState: null, toState: "Received", actor: "BridgeSync Adapter", notes: "Fields mapped: 10/10 | Status: SUCCESS" },
    { appId, department: "Labour Department", eventType: "adapter.labour.received", fromState: null, toState: "Received", actor: "BridgeSync Adapter", notes: "Fields mapped: 10/10 | Status: SUCCESS" },
  ]);

  await db.insert(eventLogTable).values([
    { eventType: "application.submitted", appId, message: `EVENT: application.submitted | ID: ${appId} | Routing to departments...`, status: "SUCCESS" },
    { eventType: "adapter.foodsafety.received", appId, message: `EVENT: adapter.foodsafety.received | Fields mapped: 10/10 | Status: SUCCESS`, status: "SUCCESS" },
    { eventType: "adapter.labour.received", appId, message: `EVENT: adapter.labour.received | Fields mapped: 10/10 | Status: SUCCESS`, status: "SUCCESS" },
  ]);

  res.status(201).json(app);
});

router.get("/applications/:appId", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { appId } = params.data;

  const [application] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.appId, appId));

  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const deptApplications = await db
    .select()
    .from(deptApplicationsTable)
    .where(eq(deptApplicationsTable.appId, appId));

  const documentRequests = await db
    .select()
    .from(documentRequestsTable)
    .where(eq(documentRequestsTable.appId, appId));

  const workflowEvents = await db
    .select()
    .from(workflowEventsTable)
    .where(eq(workflowEventsTable.appId, appId))
    .orderBy(workflowEventsTable.createdAt);

  res.json({ application, deptApplications, documentRequests, workflowEvents });
});

router.post("/applications/:appId/respond-document", async (req, res): Promise<void> => {
  const params = RespondDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RespondDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentId, citizenResponse } = parsed.data;

  const [docReq] = await db
    .update(documentRequestsTable)
    .set({ citizenResponse, fulfilledAt: new Date() })
    .where(eq(documentRequestsTable.id, documentId))
    .returning();

  if (!docReq) {
    res.status(404).json({ error: "Document request not found" });
    return;
  }

  await db.insert(workflowEventsTable).values({
    appId: params.data.appId,
    department: docReq.department,
    eventType: "document.submitted",
    fromState: "Documents Requested",
    toState: "Documents Requested",
    actor: "Citizen",
    notes: `Citizen submitted: ${citizenResponse}`,
  });

  res.json(docReq);
});

export default router;
