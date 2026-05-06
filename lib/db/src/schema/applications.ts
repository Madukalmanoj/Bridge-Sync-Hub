import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull().unique(),
  citizenName: text("citizen_name").notNull(),
  aadhaar: text("aadhaar"),
  mobile: text("mobile").notNull(),
  email: text("email"),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  district: text("district").notNull(),
  description: text("description"),
  startDate: text("start_date"),
  documents: text("documents"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  overallStatus: text("overall_status").notNull().default("Submitted"),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, submittedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;

export const deptApplicationsTable = pgTable("dept_applications", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull(),
  department: text("department").notNull(),
  nativeFieldsJson: text("native_fields_json").notNull().default("{}"),
  status: text("status").notNull().default("Received"),
  assignedOfficer: text("assigned_officer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeptApplicationSchema = createInsertSchema(deptApplicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeptApplication = z.infer<typeof insertDeptApplicationSchema>;
export type DeptApplication = typeof deptApplicationsTable.$inferSelect;

export const documentRequestsTable = pgTable("document_requests", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull(),
  department: text("department").notNull(),
  documentName: text("document_name").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  citizenResponse: text("citizen_response"),
});

export const insertDocumentRequestSchema = createInsertSchema(documentRequestsTable).omit({ id: true, requestedAt: true });
export type InsertDocumentRequest = z.infer<typeof insertDocumentRequestSchema>;
export type DocumentRequest = typeof documentRequestsTable.$inferSelect;

export const workflowEventsTable = pgTable("workflow_events", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull(),
  department: text("department").notNull(),
  eventType: text("event_type").notNull(),
  fromState: text("from_state"),
  toState: text("to_state"),
  actor: text("actor"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkflowEventSchema = createInsertSchema(workflowEventsTable).omit({ id: true, createdAt: true });
export type InsertWorkflowEvent = z.infer<typeof insertWorkflowEventSchema>;
export type WorkflowEvent = typeof workflowEventsTable.$inferSelect;

export const officersTable = pgTable("officers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  role: text("role").notNull().default("Inspector"),
});

export type Officer = typeof officersTable.$inferSelect;

export const fieldMappingsTable = pgTable("field_mappings", {
  id: serial("id").primaryKey(),
  sourceSystem: text("source_system").notNull(),
  targetSystem: text("target_system").notNull(),
  sourceField: text("source_field").notNull(),
  targetField: text("target_field").notNull(),
  confidence: integer("confidence").notNull().default(80),
  confirmed: text("confirmed").notNull().default("false"),
  corrected: text("corrected").notNull().default("false"),
});

export type FieldMapping = typeof fieldMappingsTable.$inferSelect;

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  systemType: text("system_type").notNull().default("REST"),
  adapterStatus: text("adapter_status").notNull().default("active"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }).defaultNow(),
});

export type Department = typeof departmentsTable.$inferSelect;

export const workflowStatesTable = pgTable("workflow_states", {
  id: serial("id").primaryKey(),
  swState: text("sw_state").notNull(),
  foodSafetyState: text("food_safety_state").notNull(),
  labourState: text("labour_state").notNull(),
});

export type WorkflowState = typeof workflowStatesTable.$inferSelect;

export const eventLogTable = pgTable("event_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  eventType: text("event_type").notNull(),
  appId: text("app_id"),
  message: text("message").notNull(),
  status: text("status").notNull().default("SUCCESS"),
});

export type EventLog = typeof eventLogTable.$inferSelect;
