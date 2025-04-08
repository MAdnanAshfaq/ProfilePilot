import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model and schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["manager", "lead_gen", "sales"] }).notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    name: true,
    email: true,
    role: true,
  })
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    role: z.enum(["manager", "lead_gen", "sales"], {
      errorMap: () => ({ message: "Please select a valid role" })
    })
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Profile model and schema
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  resumeContent: text("resume_content"), // Store the parsed resume text content
  resumeFileName: text("resume_file_name"), // Original filename of the uploaded PDF
  resumeBuffer: text("resume_buffer"), // Base64 encoded PDF binary for download
  createdBy: integer("created_by").references(() => users.id), // Track who created the profile
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles)
  .pick({
    name: true,
    description: true,
    resumeContent: true,
    resumeFileName: true,
    resumeBuffer: true,
    createdBy: true,
  })
  .extend({
    resumeContent: z.string().min(1, "Resume content is required"),
    resumeFileName: z.string().optional(),
    resumeBuffer: z.string().optional(),
  });

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// Profile Assignment model and schema for Lead Generation Team
export const leadGenAssignments = pgTable("lead_gen_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
});

export const insertLeadGenAssignmentSchema = createInsertSchema(leadGenAssignments).pick({
  userId: true,
  profileId: true,
});

export type InsertLeadGenAssignment = z.infer<typeof insertLeadGenAssignmentSchema>;
export type LeadGenAssignment = typeof leadGenAssignments.$inferSelect;

// Profile Assignment model and schema for Sales Coordinators
export const salesAssignments = pgTable("sales_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
});

export const insertSalesAssignmentSchema = createInsertSchema(salesAssignments).pick({
  userId: true,
  profileId: true,
});

export type InsertSalesAssignment = z.infer<typeof insertSalesAssignmentSchema>;
export type SalesAssignment = typeof salesAssignments.$inferSelect;

// Targets model and schema
export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
  jobsToFetch: integer("jobs_to_fetch").notNull(),
  jobsToApply: integer("jobs_to_apply").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isWeekly: boolean("is_weekly").notNull(),
});

export const insertTargetSchema = createInsertSchema(targets).pick({
  userId: true,
  profileId: true,
  jobsToFetch: true,
  jobsToApply: true,
  startDate: true,
  endDate: true,
  isWeekly: true,
});

export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Target = typeof targets.$inferSelect;

// Progress model and schema for Lead Generation Team
export const progressUpdates = pgTable("progress_updates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
  date: date("date").notNull(),
  jobsFetched: integer("jobs_fetched").notNull(),
  jobsApplied: integer("jobs_applied").notNull(),
  notes: text("notes"),
});

export const insertProgressUpdateSchema = createInsertSchema(progressUpdates).pick({
  userId: true,
  profileId: true,
  date: true,
  jobsFetched: true,
  jobsApplied: true,
  notes: true,
});

export type InsertProgressUpdate = z.infer<typeof insertProgressUpdateSchema>;
export type ProgressUpdate = typeof progressUpdates.$inferSelect;

// Lead Entry model and schema for Sales Coordinators
export const leadEntries = pgTable("lead_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
  date: date("date").notNull(),
  newLeads: integer("new_leads").notNull(),
  clientRejections: integer("client_rejections").notNull(),
  teamRejections: integer("team_rejections").notNull(),
  notes: text("notes"),
});

export const insertLeadEntrySchema = createInsertSchema(leadEntries).pick({
  userId: true,
  profileId: true,
  date: true,
  newLeads: true,
  clientRejections: true,
  teamRejections: true,
  notes: true,
});

export type InsertLeadEntry = z.infer<typeof insertLeadEntrySchema>;
export type LeadEntry = typeof leadEntries.$inferSelect;
