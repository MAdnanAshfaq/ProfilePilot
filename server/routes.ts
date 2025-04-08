import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertProfileSchema, insertLeadGenAssignmentSchema, insertSalesAssignmentSchema, insertTargetSchema, insertProgressUpdateSchema, insertLeadEntrySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { parsePdfBuffer, bufferToBase64, base64ToBuffer } from "./pdf-utils";

// Configure multer for PDF file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase();
    if (extname !== '.pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check role
const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Profile routes
  app.get("/api/profiles", isAuthenticated, async (req, res) => {
    try {
      const profiles = await storage.getProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });
  
  app.get("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const profile = await storage.getProfile(id);
      
      if (profile) {
        res.json(profile);
      } else {
        res.status(404).json({ message: "Profile not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  app.post("/api/profiles", hasRole(["manager"]), async (req, res) => {
    try {
      const validationResult = insertProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: validationResult.error.errors });
      }
      
      const profile = await storage.createProfile(validationResult.data);
      res.status(201).json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to create profile" });
    }
  });
  
  // PDF upload route
  app.post("/api/profiles/upload-resume", hasRole(["manager"]), upload.single('resumeFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }
      
      const pdfBuffer = req.file.buffer;
      const resumeContent = await parsePdfBuffer(pdfBuffer);
      const resumeBuffer = bufferToBase64(pdfBuffer);
      
      res.json({
        resumeContent,
        resumeFileName: req.file.originalname,
        resumeBuffer
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ message: "Failed to process PDF file" });
    }
  });
  
  app.patch("/api/profiles/:id", hasRole(["manager"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updatedProfile = await storage.updateProfile(id, req.body);
      
      if (updatedProfile) {
        res.json(updatedProfile);
      } else {
        res.status(404).json({ message: "Profile not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  app.delete("/api/profiles/:id", hasRole(["manager"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteProfile(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Profile not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });
  
  // Users routes
  app.get("/api/users", hasRole(["manager"]), async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.getUsers(role);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Lead Generation Assignment routes
  app.get("/api/lead-gen-assignments", hasRole(["manager"]), async (req, res) => {
    try {
      const assignments = await storage.getLeadGenAssignments();
      
      // Expand the assignment data with user and profile information
      const expandedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const user = await storage.getUser(assignment.userId);
          const profile = await storage.getProfile(assignment.profileId);
          return {
            ...assignment,
            user,
            profile
          };
        })
      );
      
      res.json(expandedAssignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lead generation assignments" });
    }
  });
  
  app.post("/api/lead-gen-assignments", hasRole(["manager"]), async (req, res) => {
    try {
      const validationResult = insertLeadGenAssignmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid assignment data", errors: validationResult.error.errors });
      }
      
      const assignment = await storage.createLeadGenAssignment(validationResult.data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create lead generation assignment" });
    }
  });
  
  // Sales Assignment routes
  app.get("/api/sales-assignments", hasRole(["manager"]), async (req, res) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const assignments = await storage.getSalesAssignments(userId);
      
      // Expand the assignment data with user and profile information
      const expandedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const user = await storage.getUser(assignment.userId);
          const profile = await storage.getProfile(assignment.profileId);
          return {
            ...assignment,
            user,
            profile
          };
        })
      );
      
      res.json(expandedAssignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales assignments" });
    }
  });
  
  app.post("/api/sales-assignments", hasRole(["manager"]), async (req, res) => {
    try {
      const validationResult = insertSalesAssignmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid assignment data", errors: validationResult.error.errors });
      }
      
      const assignment = await storage.createSalesAssignment(validationResult.data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create sales assignment" });
    }
  });
  
  app.delete("/api/sales-assignments/:id", hasRole(["manager"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteSalesAssignment(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Assignment not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sales assignment" });
    }
  });
  
  // Target routes
  app.get("/api/targets", isAuthenticated, async (req, res) => {
    try {
      // If user is a manager, they can see all targets
      // If user is lead_gen or sales, they can only see their own targets
      let userId: number | undefined = undefined;
      
      if (req.user!.role !== "manager") {
        userId = req.user!.id;
      } else if (req.query.userId) {
        userId = Number(req.query.userId);
      }
      
      const targets = await storage.getTargets(userId);
      
      // Expand the target data with user and profile information
      const expandedTargets = await Promise.all(
        targets.map(async (target) => {
          const user = await storage.getUser(target.userId);
          const profile = await storage.getProfile(target.profileId);
          return {
            ...target,
            user,
            profile
          };
        })
      );
      
      res.json(expandedTargets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch targets" });
    }
  });
  
  app.post("/api/targets", hasRole(["manager"]), async (req, res) => {
    try {
      const validationResult = insertTargetSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid target data", errors: validationResult.error.errors });
      }
      
      const target = await storage.createTarget(validationResult.data);
      res.status(201).json(target);
    } catch (error) {
      res.status(500).json({ message: "Failed to create target" });
    }
  });
  
  app.patch("/api/targets/:id", hasRole(["manager"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { jobsToFetch, jobsToApply } = req.body;
      
      if (typeof jobsToFetch !== 'number' || typeof jobsToApply !== 'number') {
        return res.status(400).json({ message: "Invalid target data" });
      }
      
      const target = await storage.updateTarget(id, jobsToFetch, jobsToApply);
      
      if (target) {
        res.json(target);
      } else {
        res.status(404).json({ message: "Target not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update target" });
    }
  });
  
  // Progress Update routes
  app.get("/api/progress-updates", isAuthenticated, async (req, res) => {
    try {
      // If user is a manager, they can see all progress updates
      // If user is lead_gen, they can only see their own progress updates
      let userId: number | undefined = undefined;
      
      if (req.user!.role !== "manager") {
        userId = req.user!.id;
      } else if (req.query.userId) {
        userId = Number(req.query.userId);
      }
      
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
      
      const updates = await storage.getProgressUpdates(userId, fromDate, toDate);
      
      // Expand the update data with user and profile information
      const expandedUpdates = await Promise.all(
        updates.map(async (update) => {
          const user = await storage.getUser(update.userId);
          const profile = await storage.getProfile(update.profileId);
          return {
            ...update,
            user,
            profile
          };
        })
      );
      
      res.json(expandedUpdates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress updates" });
    }
  });
  
  app.post("/api/progress-updates", hasRole(["lead_gen"]), async (req, res) => {
    try {
      // Make sure the user is only submitting progress for their assigned profile
      const assignedProfile = await storage.getUserAssignedProfile(req.user!.id);
      if (!assignedProfile) {
        return res.status(400).json({ message: "No profile assigned to this user" });
      }
      
      const data = {
        ...req.body,
        userId: req.user!.id,
        profileId: assignedProfile.profile.id
      };
      
      const validationResult = insertProgressUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid progress update data", errors: validationResult.error.errors });
      }
      
      const update = await storage.createProgressUpdate(validationResult.data);
      res.status(201).json(update);
    } catch (error) {
      res.status(500).json({ message: "Failed to create progress update" });
    }
  });
  
  // Lead Entry routes
  app.get("/api/lead-entries", isAuthenticated, async (req, res) => {
    try {
      // If user is a manager, they can see all lead entries
      // If user is sales, they can only see their own lead entries
      let userId: number | undefined = undefined;
      
      if (req.user!.role !== "manager") {
        userId = req.user!.id;
      } else if (req.query.userId) {
        userId = Number(req.query.userId);
      }
      
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
      
      const entries = await storage.getLeadEntries(userId, fromDate, toDate);
      
      // Expand the entry data with user and profile information
      const expandedEntries = await Promise.all(
        entries.map(async (entry) => {
          const user = await storage.getUser(entry.userId);
          const profile = await storage.getProfile(entry.profileId);
          return {
            ...entry,
            user,
            profile
          };
        })
      );
      
      res.json(expandedEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lead entries" });
    }
  });
  
  app.post("/api/lead-entries", hasRole(["sales"]), async (req, res) => {
    try {
      // Make sure the user is only submitting lead entries for their assigned profiles
      const assignedProfiles = await storage.getUserAssignedProfiles(req.user!.id);
      const profileIds = assignedProfiles.map(p => p.id);
      
      if (!profileIds.includes(req.body.profileId)) {
        return res.status(400).json({ message: "Profile not assigned to this user" });
      }
      
      const data = {
        ...req.body,
        userId: req.user!.id
      };
      
      const validationResult = insertLeadEntrySchema.safeParse(data);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid lead entry data", errors: validationResult.error.errors });
      }
      
      const entry = await storage.createLeadEntry(validationResult.data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to create lead entry" });
    }
  });
  
  app.patch("/api/lead-entries/:id", hasRole(["sales"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const entry = await storage.updateLeadEntry(id, req.body);
      
      if (entry) {
        res.json(entry);
      } else {
        res.status(404).json({ message: "Lead entry not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead entry" });
    }
  });
  
  // Assigned Profile routes
  app.get("/api/my-profile", hasRole(["lead_gen"]), async (req, res) => {
    try {
      const profile = await storage.getUserAssignedProfile(req.user!.id);
      
      if (profile) {
        res.json(profile);
      } else {
        res.status(404).json({ message: "No profile assigned" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned profile" });
    }
  });
  
  app.get("/api/my-profiles", hasRole(["sales"]), async (req, res) => {
    try {
      const profiles = await storage.getUserAssignedProfiles(req.user!.id);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned profiles" });
    }
  });
  
  // PDF download route - accessible to anyone with an assigned profile
  app.get("/api/profiles/:id/resume", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const profile = await storage.getProfile(id);
      
      if (!profile || !profile.resumeBuffer) {
        return res.status(404).json({ message: "Resume not found" });
      }
      
      // Check if user is authorized to download this resume
      const user = req.user!;
      let authorized = false;
      
      if (user.role === "manager") {
        authorized = true;
      } else if (user.role === "lead_gen") {
        const assignment = await storage.getLeadGenAssignment(user.id);
        authorized = assignment?.profileId === id;
      } else if (user.role === "sales") {
        const assignments = await storage.getSalesAssignments(user.id);
        authorized = assignments.some(a => a.profileId === id);
      }
      
      if (!authorized) {
        return res.status(403).json({ message: "You don't have permission to access this resume" });
      }
      
      // Send the PDF file
      const buffer = base64ToBuffer(profile.resumeBuffer);
      const fileName = profile.resumeFileName || `resume-${id}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error('Error downloading resume:', error);
      res.status(500).json({ message: "Failed to download resume" });
    }
  });
  
  // Team Performance route
  app.get("/api/team-performance", hasRole(["manager"]), async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
      
      const performanceData = await storage.getTeamPerformanceData(fromDate, toDate);
      res.json(performanceData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team performance data" });
    }
  });
  
  // Report Generation (CSV)
  app.get("/api/reports/team-performance", hasRole(["manager"]), async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
      
      const performanceData = await storage.getTeamPerformanceData(fromDate, toDate);
      
      // Format for CSV
      const headers = ['Name', 'Profile', 'Target (Fetch)', 'Target (Apply)', 'Jobs Fetched', 'Jobs Applied', 'Completion (%)'];
      const rows = performanceData.map(data => [
        data.name,
        data.profile,
        data.targetJobsToFetch,
        data.targetJobsToApply,
        data.jobsFetched,
        data.jobsApplied,
        `${data.completion}%`
      ]);
      
      // Create CSV content
      let csv = headers.join(',') + '\n';
      rows.forEach(row => {
        csv += row.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=team-performance.csv');
      
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report" });
    }
  });
  
  app.get("/api/reports/lead-entries", hasRole(["manager"]), async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
      
      const entries = await storage.getLeadEntries(undefined, fromDate, toDate);
      
      // Expand the entry data
      const expandedEntries = await Promise.all(
        entries.map(async (entry) => {
          const user = await storage.getUser(entry.userId);
          const profile = await storage.getProfile(entry.profileId);
          return {
            ...entry,
            userName: user?.name || 'Unknown',
            profileName: profile?.name || 'Unknown'
          };
        })
      );
      
      // Format for CSV
      const headers = ['Date', 'Sales Coordinator', 'Profile', 'New Leads', 'Client Rejections', 'Team Rejections'];
      const rows = expandedEntries.map(entry => [
        entry.date,
        entry.userName,
        entry.profileName,
        entry.newLeads,
        entry.clientRejections,
        entry.teamRejections
      ]);
      
      // Create CSV content
      let csv = headers.join(',') + '\n';
      rows.forEach(row => {
        csv += row.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=lead-entries.csv');
      
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
