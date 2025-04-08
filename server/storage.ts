import { users, type User, type InsertUser, profiles, type Profile, type InsertProfile, leadGenAssignments, type LeadGenAssignment, type InsertLeadGenAssignment, salesAssignments, type SalesAssignment, type InsertSalesAssignment, targets, type Target, type InsertTarget, progressUpdates, type ProgressUpdate, type InsertProgressUpdate, leadEntries, type LeadEntry, type InsertLeadEntry } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { z } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, gte, lte, and } from "drizzle-orm";
import pg from "pg";
const { Pool } = pg;

// Create a connection pool to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Drizzle with the PostgreSQL connection
const db = drizzle(pool);

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Define the user role type for strong typing
type UserRole = "manager" | "lead_gen" | "sales";

// Define a generic session store type for simplicity
type SessionStore = any;

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(role?: UserRole | string): Promise<User[]>;
  
  // Profile operations
  getProfile(id: number): Promise<Profile | undefined>;
  getProfiles(): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: number, profile: Partial<InsertProfile>): Promise<Profile | undefined>;
  deleteProfile(id: number): Promise<boolean>;
  
  // Lead Gen Assignment operations
  getLeadGenAssignment(userId: number): Promise<LeadGenAssignment | undefined>;
  getLeadGenAssignments(): Promise<LeadGenAssignment[]>;
  createLeadGenAssignment(assignment: InsertLeadGenAssignment): Promise<LeadGenAssignment>;
  deleteLeadGenAssignment(userId: number): Promise<boolean>;
  updateLeadGenAssignment(userId: number, profileId: number): Promise<LeadGenAssignment | undefined>;
  
  // Sales Assignment operations
  getSalesAssignments(userId?: number): Promise<SalesAssignment[]>;
  createSalesAssignment(assignment: InsertSalesAssignment): Promise<SalesAssignment>;
  deleteSalesAssignment(id: number): Promise<boolean>;
  
  // Target operations
  getTargets(userId?: number): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: number, jobsToFetch: number, jobsToApply: number): Promise<Target | undefined>;
  deleteTarget(id: number): Promise<boolean>;
  
  // Progress Update operations
  getProgressUpdates(userId?: number, fromDate?: Date, toDate?: Date): Promise<ProgressUpdate[]>;
  createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate>;
  
  // Lead Entry operations
  getLeadEntries(userId?: number, fromDate?: Date, toDate?: Date): Promise<LeadEntry[]>;
  createLeadEntry(entry: InsertLeadEntry): Promise<LeadEntry>;
  updateLeadEntry(id: number, entry: Partial<InsertLeadEntry>): Promise<LeadEntry | undefined>;
  
  // Combined data operations
  getUserAssignedProfile(userId: number): Promise<{profile: Profile, target?: Target} | undefined>;
  getUserAssignedProfiles(userId: number): Promise<Profile[]>;
  getTeamPerformanceData(fromDate?: Date, toDate?: Date): Promise<any[]>;
  
  // Session store
  sessionStore: SessionStore;
  
  // Default users initialization
  initializeDefaultUsers(): Promise<void>;
  
  // Resume operations
  getProfileResume(profileId: number): Promise<{content: string, filename: string} | undefined>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private profiles: Map<number, Profile>;
  private leadGenAssignments: Map<number, LeadGenAssignment>;
  private salesAssignments: Map<number, SalesAssignment>;
  private targets: Map<number, Target>;
  private progressUpdates: Map<number, ProgressUpdate>;
  private leadEntries: Map<number, LeadEntry>;
  
  currentUserId: number;
  currentProfileId: number;
  currentLeadGenAssignmentId: number;
  currentSalesAssignmentId: number;
  currentTargetId: number;
  currentProgressUpdateId: number;
  currentLeadEntryId: number;
  
  sessionStore: SessionStore;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.leadGenAssignments = new Map();
    this.salesAssignments = new Map();
    this.targets = new Map();
    this.progressUpdates = new Map();
    this.leadEntries = new Map();
    
    this.currentUserId = 1;
    this.currentProfileId = 1;
    this.currentLeadGenAssignmentId = 1;
    this.currentSalesAssignmentId = 1;
    this.currentTargetId = 1;
    this.currentProgressUpdateId = 1;
    this.currentLeadEntryId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with default data
    this._initializeDefaultUsers();
    this.initializeDefaultProfiles();
  }

  // Helper method for initializing during construction
  private async _initializeDefaultUsers() {
    await this.initializeDefaultUsers();
  }
  
  private async initializeDefaultProfiles() {
    const defaultProfiles = [
      { 
        name: "Software Engineer", 
        description: "Full-stack developer with 5 years of experience in React, Node.js, and AWS.",
        resumeContent: "John Doe\nSoftware Engineer\n\nExperience:\n- Full Stack Developer at Tech Co (2018-Present)\n- Frontend Developer at Web Solutions (2016-2018)\n\nSkills:\n- JavaScript, TypeScript, React, Node.js\n- AWS, Docker, Kubernetes\n- REST API design, GraphQL\n- Agile methodologies"
      },
      { 
        name: "UX Designer", 
        description: "Designer with expertise in user research, wireframing, and prototyping.",
        resumeContent: "Jane Smith\nUX Designer\n\nExperience:\n- Senior UX Designer at Design Studio (2019-Present)\n- UX Researcher at User First (2017-2019)\n\nSkills:\n- User research and testing\n- Wireframing and prototyping\n- Figma, Sketch, Adobe XD\n- Information architecture"
      },
      { 
        name: "Project Manager", 
        description: "PMP certified manager with experience leading agile teams.",
        resumeContent: "Michael Johnson\nProject Manager\n\nExperience:\n- Senior Project Manager at Enterprise Inc (2016-Present)\n- Project Coordinator at Business Solutions (2014-2016)\n\nSkills:\n- PMP Certified\n- Agile and Scrum methodologies\n- Budget management\n- Team leadership"
      },
      { 
        name: "Marketing Specialist", 
        description: "Digital marketing expert with SEO and content creation skills.",
        resumeContent: "Sarah Williams\nMarketing Specialist\n\nExperience:\n- Digital Marketing Manager at Brand Co (2018-Present)\n- Content Creator at Marketing Agency (2016-2018)\n\nSkills:\n- SEO optimization\n- Content strategy\n- Social media management\n- Analytics and reporting"
      },
      { 
        name: "Data Analyst", 
        description: "Skilled in data visualization, SQL, and statistical analysis.",
        resumeContent: "David Chen\nData Analyst\n\nExperience:\n- Senior Data Analyst at Analytics Corp (2017-Present)\n- Business Intelligence Analyst at Data Solutions (2015-2017)\n\nSkills:\n- SQL, Python, R\n- Tableau, Power BI\n- Statistical analysis\n- Data cleaning and ETL processes"
      }
    ];
    
    for (const profile of defaultProfiles) {
      await this.createProfile(profile);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(role?: UserRole | string): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (role) {
      // Cast the role to a valid user role
      return users.filter(user => user.role === role as UserRole);
    }
    return users;
  }
  
  // Profile operations
  async getProfile(id: number): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }
  
  async getProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }
  
  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = this.currentProfileId++;
    const profile: Profile = {
      ...insertProfile,
      id,
      resumeContent: insertProfile.resumeContent || null,
      resumeFileName: insertProfile.resumeFileName || null,
      resumeBuffer: insertProfile.resumeBuffer || null,
      createdBy: insertProfile.createdBy || null,
      createdAt: new Date(),
    };
    this.profiles.set(id, profile);
    return profile;
  }
  
  async updateProfile(id: number, updatedFields: Partial<InsertProfile>): Promise<Profile | undefined> {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...updatedFields };
    this.profiles.set(id, updatedProfile);
    
    return updatedProfile;
  }
  
  async deleteProfile(id: number): Promise<boolean> {
    // First check if the profile is assigned to any users
    const leadGenAssignments = Array.from(this.leadGenAssignments.values()).filter(
      assignment => assignment.profileId === id
    );
    
    const salesAssignments = Array.from(this.salesAssignments.values()).filter(
      assignment => assignment.profileId === id
    );
    
    const targets = Array.from(this.targets.values()).filter(
      target => target.profileId === id
    );
    
    const progressUpdates = Array.from(this.progressUpdates.values()).filter(
      update => update.profileId === id
    );
    
    const leadEntries = Array.from(this.leadEntries.values()).filter(
      entry => entry.profileId === id
    );
    
    // If profile is in use, don't delete
    if (leadGenAssignments.length > 0 || 
        salesAssignments.length > 0 || 
        targets.length > 0 || 
        progressUpdates.length > 0 || 
        leadEntries.length > 0) {
      return false;
    }
    
    return this.profiles.delete(id);
  }
  
  // Lead Gen Assignment operations
  async getLeadGenAssignment(userId: number): Promise<LeadGenAssignment | undefined> {
    return Array.from(this.leadGenAssignments.values()).find(
      (assignment) => assignment.userId === userId
    );
  }
  
  async getLeadGenAssignments(): Promise<LeadGenAssignment[]> {
    return Array.from(this.leadGenAssignments.values());
  }
  
  async createLeadGenAssignment(assignment: InsertLeadGenAssignment): Promise<LeadGenAssignment> {
    // First check if user already has an assignment
    const existingAssignment = await this.getLeadGenAssignment(assignment.userId);
    if (existingAssignment) {
      // Update existing assignment instead of creating a new one
      existingAssignment.profileId = assignment.profileId;
      return existingAssignment;
    }
    
    const id = this.currentLeadGenAssignmentId++;
    const newAssignment: LeadGenAssignment = { ...assignment, id };
    this.leadGenAssignments.set(id, newAssignment);
    return newAssignment;
  }
  
  async deleteLeadGenAssignment(userId: number): Promise<boolean> {
    const assignment = await this.getLeadGenAssignment(userId);
    if (!assignment) return false;
    
    return this.leadGenAssignments.delete(assignment.id);
  }
  
  async updateLeadGenAssignment(userId: number, profileId: number): Promise<LeadGenAssignment | undefined> {
    const assignment = await this.getLeadGenAssignment(userId);
    if (!assignment) return undefined;
    
    assignment.profileId = profileId;
    return assignment;
  }
  
  // Sales Assignment operations
  async getSalesAssignments(userId?: number): Promise<SalesAssignment[]> {
    const assignments = Array.from(this.salesAssignments.values());
    if (userId) {
      return assignments.filter(assignment => assignment.userId === userId);
    }
    return assignments;
  }
  
  async createSalesAssignment(assignment: InsertSalesAssignment): Promise<SalesAssignment> {
    // Check if this assignment already exists
    const existingAssignment = Array.from(this.salesAssignments.values()).find(
      a => a.userId === assignment.userId && a.profileId === assignment.profileId
    );
    
    if (existingAssignment) {
      return existingAssignment;
    }
    
    const id = this.currentSalesAssignmentId++;
    const newAssignment: SalesAssignment = { ...assignment, id };
    this.salesAssignments.set(id, newAssignment);
    return newAssignment;
  }
  
  async deleteSalesAssignment(id: number): Promise<boolean> {
    return this.salesAssignments.delete(id);
  }
  
  // Target operations
  async getTargets(userId?: number): Promise<Target[]> {
    const targets = Array.from(this.targets.values());
    if (userId) {
      return targets.filter(target => target.userId === userId);
    }
    return targets;
  }
  
  async createTarget(insertTarget: InsertTarget): Promise<Target> {
    const id = this.currentTargetId++;
    const target: Target = { ...insertTarget, id };
    this.targets.set(id, target);
    return target;
  }
  
  async updateTarget(id: number, jobsToFetch: number, jobsToApply: number): Promise<Target | undefined> {
    const target = this.targets.get(id);
    if (!target) return undefined;
    
    target.jobsToFetch = jobsToFetch;
    target.jobsToApply = jobsToApply;
    
    return target;
  }
  
  async deleteTarget(id: number): Promise<boolean> {
    return this.targets.delete(id);
  }
  
  async getProfileResume(profileId: number): Promise<{content: string, filename: string} | undefined> {
    const profile = await this.getProfile(profileId);
    if (!profile || !profile.resumeContent) return undefined;
    
    return {
      content: profile.resumeContent,
      filename: `${profile.name.replace(/\s+/g, '_')}_Resume.pdf`
    };
  }
  
  // Public method to initialize default users (mainly for API access)
  async initializeDefaultUsers(): Promise<void> {
    // Create default users if they don't exist
    const defaultUsers: {
      username: string;
      password: string;
      name: string;
      email: string;
      role: "manager" | "lead_gen" | "sales";
    }[] = [
      {
        username: "manager",
        password: "password123", // In production this would be hashed
        name: "Manager User",
        email: "manager@example.com",
        role: "manager"
      },
      {
        username: "leadgen1",
        password: "password123",
        name: "Lead Gen User 1",
        email: "leadgen1@example.com",
        role: "lead_gen"
      },
      {
        username: "leadgen2",
        password: "password123",
        name: "Lead Gen User 2",
        email: "leadgen2@example.com",
        role: "lead_gen"
      },
      {
        username: "sales1",
        password: "password123",
        name: "Sales User 1",
        email: "sales1@example.com",
        role: "sales"
      },
      {
        username: "sales2",
        password: "password123",
        name: "Sales User 2",
        email: "sales2@example.com",
        role: "sales"
      }
    ];

    for (const user of defaultUsers) {
      const existingUser = await this.getUserByUsername(user.username);
      if (!existingUser) {
        await this.createUser(user);
      }
    }
  }
  
  // Progress Update operations
  async getProgressUpdates(userId?: number, fromDate?: Date, toDate?: Date): Promise<ProgressUpdate[]> {
    let updates = Array.from(this.progressUpdates.values());
    
    if (userId) {
      updates = updates.filter(update => update.userId === userId);
    }
    
    if (fromDate) {
      updates = updates.filter(update => new Date(update.date) >= fromDate);
    }
    
    if (toDate) {
      updates = updates.filter(update => new Date(update.date) <= toDate);
    }
    
    return updates;
  }
  
  async createProgressUpdate(insertUpdate: InsertProgressUpdate): Promise<ProgressUpdate> {
    const id = this.currentProgressUpdateId++;
    const update: ProgressUpdate = { 
      ...insertUpdate, 
      id,
      notes: insertUpdate.notes || null 
    };
    this.progressUpdates.set(id, update);
    return update;
  }
  
  // Lead Entry operations
  async getLeadEntries(userId?: number, fromDate?: Date, toDate?: Date): Promise<LeadEntry[]> {
    let entries = Array.from(this.leadEntries.values());
    
    if (userId) {
      entries = entries.filter(entry => entry.userId === userId);
    }
    
    if (fromDate) {
      entries = entries.filter(entry => new Date(entry.date) >= fromDate);
    }
    
    if (toDate) {
      entries = entries.filter(entry => new Date(entry.date) <= toDate);
    }
    
    return entries;
  }
  
  async createLeadEntry(insertEntry: InsertLeadEntry): Promise<LeadEntry> {
    const id = this.currentLeadEntryId++;
    const entry: LeadEntry = { 
      ...insertEntry, 
      id,
      notes: insertEntry.notes || null 
    };
    this.leadEntries.set(id, entry);
    return entry;
  }
  
  async updateLeadEntry(id: number, updatedFields: Partial<InsertLeadEntry>): Promise<LeadEntry | undefined> {
    const entry = this.leadEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, ...updatedFields };
    this.leadEntries.set(id, updatedEntry);
    
    return updatedEntry;
  }
  
  // Combined data operations
  async getUserAssignedProfile(userId: number): Promise<{profile: Profile, target?: Target} | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    if (user.role === 'lead_gen' as UserRole) {
      const assignment = await this.getLeadGenAssignment(userId);
      if (!assignment) return undefined;
      
      const profile = await this.getProfile(assignment.profileId);
      if (!profile) return undefined;
      
      // Get the most recent target
      const userTargets = await this.getTargets(userId);
      const currentTarget = userTargets.length > 0 
        ? userTargets.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
        : undefined;
      
      return { profile, target: currentTarget };
    }
    
    return undefined;
  }
  
  async getUserAssignedProfiles(userId: number): Promise<Profile[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    if (user.role === 'sales' as UserRole) {
      const assignments = await this.getSalesAssignments(userId);
      if (assignments.length === 0) return [];
      
      const profiles: Profile[] = [];
      for (const assignment of assignments) {
        const profile = await this.getProfile(assignment.profileId);
        if (profile) profiles.push(profile);
      }
      
      return profiles;
    }
    
    return [];
  }
  
  async getTeamPerformanceData(fromDate?: Date, toDate?: Date): Promise<any[]> {
    const leadGenUsers = await this.getUsers('lead_gen' as UserRole);
    const result = [];
    
    for (const user of leadGenUsers) {
      const assignedProfile = await this.getUserAssignedProfile(user.id);
      if (!assignedProfile) continue;
      
      const progressUpdates = await this.getProgressUpdates(user.id, fromDate, toDate);
      
      const totalJobsFetched = progressUpdates.reduce((sum, update) => sum + update.jobsFetched, 0);
      const totalJobsApplied = progressUpdates.reduce((sum, update) => sum + update.jobsApplied, 0);
      
      const targetJobs = assignedProfile.target ? assignedProfile.target.jobsToApply : 0;
      const completion = targetJobs > 0 ? Math.round((totalJobsApplied / targetJobs) * 100) : 0;
      
      result.push({
        userId: user.id,
        name: user.name,
        profile: assignedProfile.profile.name,
        targetJobsToFetch: assignedProfile.target?.jobsToFetch || 0,
        targetJobsToApply: targetJobs,
        jobsFetched: totalJobsFetched,
        jobsApplied: totalJobsApplied,
        completion: completion
      });
    }
    
    return result;
  }
}

// Create and export the storage instance
// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values(user).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUsers(role?: UserRole | string): Promise<User[]> {
    try {
      if (role) {
        return await db.select().from(users).where(eq(users.role, role as UserRole));
      }
      return await db.select().from(users);
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Profile operations
  async getProfile(id: number): Promise<Profile | undefined> {
    try {
      const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting profile:', error);
      return undefined;
    }
  }

  async getProfiles(): Promise<Profile[]> {
    try {
      return await db.select().from(profiles);
    } catch (error) {
      console.error('Error getting profiles:', error);
      return [];
    }
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    try {
      const result = await db.insert(profiles).values({
        ...profile,
        createdAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async updateProfile(id: number, updatedFields: Partial<InsertProfile>): Promise<Profile | undefined> {
    try {
      const result = await db.update(profiles).set(updatedFields).where(eq(profiles.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error('Error updating profile:', error);
      return undefined;
    }
  }

  async deleteProfile(id: number): Promise<boolean> {
    try {
      // Check if profile is in use
      const leadGenAssignmentCount = await db.select({ count: { count: leadGenAssignments.id } })
        .from(leadGenAssignments)
        .where(eq(leadGenAssignments.profileId, id));
      
      const salesAssignmentCount = await db.select({ count: { count: salesAssignments.id } })
        .from(salesAssignments)
        .where(eq(salesAssignments.profileId, id));
      
      const targetCount = await db.select({ count: { count: targets.id } })
        .from(targets)
        .where(eq(targets.profileId, id));
      
      const progressUpdateCount = await db.select({ count: { count: progressUpdates.id } })
        .from(progressUpdates)
        .where(eq(progressUpdates.profileId, id));
      
      const leadEntryCount = await db.select({ count: { count: leadEntries.id } })
        .from(leadEntries)
        .where(eq(leadEntries.profileId, id));
      
      // If profile is in use, don't delete
      if (leadGenAssignmentCount[0].count > 0 || 
          salesAssignmentCount[0].count > 0 || 
          targetCount[0].count > 0 || 
          progressUpdateCount[0].count > 0 || 
          leadEntryCount[0].count > 0) {
        return false;
      }
      
      // Delete profile
      await db.delete(profiles).where(eq(profiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      return false;
    }
  }

  // Lead Gen Assignment operations
  async getLeadGenAssignment(userId: number): Promise<LeadGenAssignment | undefined> {
    try {
      const result = await db.select().from(leadGenAssignments).where(eq(leadGenAssignments.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting lead gen assignment:', error);
      return undefined;
    }
  }

  async getLeadGenAssignments(): Promise<LeadGenAssignment[]> {
    try {
      return await db.select().from(leadGenAssignments);
    } catch (error) {
      console.error('Error getting lead gen assignments:', error);
      return [];
    }
  }

  async createLeadGenAssignment(assignment: InsertLeadGenAssignment): Promise<LeadGenAssignment> {
    try {
      // Check if user already has an assignment
      const existingAssignment = await this.getLeadGenAssignment(assignment.userId);
      if (existingAssignment) {
        // Update existing assignment
        const result = await db.update(leadGenAssignments)
          .set({ profileId: assignment.profileId })
          .where({ userId: assignment.userId })
          .returning();
        return result[0];
      }
      
      // Create new assignment
      const result = await db.insert(leadGenAssignments).values(assignment).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating lead gen assignment:', error);
      throw error;
    }
  }

  async deleteLeadGenAssignment(userId: number): Promise<boolean> {
    try {
      await db.delete(leadGenAssignments).where(eq(leadGenAssignments.userId, userId));
      return true;
    } catch (error) {
      console.error('Error deleting lead gen assignment:', error);
      return false;
    }
  }

  async updateLeadGenAssignment(userId: number, profileId: number): Promise<LeadGenAssignment | undefined> {
    try {
      const result = await db.update(leadGenAssignments)
        .set({ profileId })
        .where(eq(leadGenAssignments.userId, userId))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating lead gen assignment:', error);
      return undefined;
    }
  }

  // Sales Assignment operations
  async getSalesAssignments(userId?: number): Promise<SalesAssignment[]> {
    try {
      if (userId) {
        return await db.select().from(salesAssignments).where(eq(salesAssignments.userId, userId));
      }
      return await db.select().from(salesAssignments);
    } catch (error) {
      console.error('Error getting sales assignments:', error);
      return [];
    }
  }

  async createSalesAssignment(assignment: InsertSalesAssignment): Promise<SalesAssignment> {
    try {
      // Check if assignment already exists
      const existingAssignments = await db.select()
        .from(salesAssignments)
        .where(
          eq(salesAssignments.userId, assignment.userId)
        )
        .where(
          eq(salesAssignments.profileId, assignment.profileId)
        )
        .limit(1);
      
      if (existingAssignments.length > 0) {
        return existingAssignments[0];
      }
      
      // Create new assignment
      const result = await db.insert(salesAssignments).values(assignment).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating sales assignment:', error);
      throw error;
    }
  }

  async deleteSalesAssignment(id: number): Promise<boolean> {
    try {
      await db.delete(salesAssignments).where(eq(salesAssignments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting sales assignment:', error);
      return false;
    }
  }

  // Target operations
  async getTargets(userId?: number): Promise<Target[]> {
    try {
      if (userId) {
        return await db.select().from(targets).where(eq(targets.userId, userId));
      }
      return await db.select().from(targets);
    } catch (error) {
      console.error('Error getting targets:', error);
      return [];
    }
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    try {
      const result = await db.insert(targets).values(target).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating target:', error);
      throw error;
    }
  }

  async updateTarget(id: number, jobsToFetch: number, jobsToApply: number): Promise<Target | undefined> {
    try {
      const result = await db.update(targets)
        .set({ jobsToFetch, jobsToApply })
        .where(eq(targets.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating target:', error);
      return undefined;
    }
  }

  async deleteTarget(id: number): Promise<boolean> {
    try {
      await db.delete(targets).where(eq(targets.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting target:', error);
      return false;
    }
  }

  // Resume operations
  async getProfileResume(profileId: number): Promise<{content: string, filename: string} | undefined> {
    try {
      const profile = await this.getProfile(profileId);
      if (!profile || !profile.resumeContent) return undefined;
      
      return {
        content: profile.resumeContent,
        filename: `${profile.name.replace(/\s+/g, '_')}_Resume.pdf`
      };
    } catch (error) {
      console.error('Error getting profile resume:', error);
      return undefined;
    }
  }

  // Progress Update operations
  async getProgressUpdates(userId?: number, fromDate?: Date, toDate?: Date): Promise<ProgressUpdate[]> {
    try {
      let query = db.select().from(progressUpdates);
      
      if (userId) {
        query = query.where(eq(progressUpdates.userId, userId));
      }
      
      if (fromDate) {
        query = query.where(gte(progressUpdates.date, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(progressUpdates.date, toDate));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting progress updates:', error);
      return [];
    }
  }

  async createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate> {
    try {
      const result = await db.insert(progressUpdates).values(update).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating progress update:', error);
      throw error;
    }
  }

  // Lead Entry operations
  async getLeadEntries(userId?: number, fromDate?: Date, toDate?: Date): Promise<LeadEntry[]> {
    try {
      let query = db.select().from(leadEntries);
      
      if (userId) {
        query = query.where(eq(leadEntries.userId, userId));
      }
      
      if (fromDate) {
        query = query.where(gte(leadEntries.date, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(leadEntries.date, toDate));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting lead entries:', error);
      return [];
    }
  }

  async createLeadEntry(entry: InsertLeadEntry): Promise<LeadEntry> {
    try {
      const result = await db.insert(leadEntries).values(entry).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating lead entry:', error);
      throw error;
    }
  }

  async updateLeadEntry(id: number, entry: Partial<InsertLeadEntry>): Promise<LeadEntry | undefined> {
    try {
      const result = await db.update(leadEntries)
        .set(entry)
        .where(eq(leadEntries.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating lead entry:', error);
      return undefined;
    }
  }

  // Combined data operations
  async getUserAssignedProfile(userId: number): Promise<{profile: Profile, target?: Target} | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      if (user.role === 'lead_gen') {
        const assignment = await this.getLeadGenAssignment(userId);
        if (!assignment) return undefined;
        
        const profile = await this.getProfile(assignment.profileId);
        if (!profile) return undefined;
        
        const userTargets = await this.getTargets(userId);
        const target = userTargets.find(t => t.profileId === profile.id);
        
        return { profile, target };
      } else if (user.role === 'sales') {
        // For sales users, return the first assigned profile
        const assignments = await this.getSalesAssignments(userId);
        if (assignments.length === 0) return undefined;
        
        const profile = await this.getProfile(assignments[0].profileId);
        if (!profile) return undefined;
        
        return { profile };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting user assigned profile:', error);
      return undefined;
    }
  }

  async getUserAssignedProfiles(userId: number): Promise<Profile[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];
      
      if (user.role === 'lead_gen') {
        const assignment = await this.getLeadGenAssignment(userId);
        if (!assignment) return [];
        
        const profile = await this.getProfile(assignment.profileId);
        return profile ? [profile] : [];
      } else if (user.role === 'sales') {
        const assignments = await this.getSalesAssignments(userId);
        if (assignments.length === 0) return [];
        
        const profiles: Profile[] = [];
        for (const assignment of assignments) {
          const profile = await this.getProfile(assignment.profileId);
          if (profile) profiles.push(profile);
        }
        
        return profiles;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user assigned profiles:', error);
      return [];
    }
  }

  async getTeamPerformanceData(fromDate?: Date, toDate?: Date): Promise<any[]> {
    try {
      // Get all progress updates for the date range
      const progressData = await this.getProgressUpdates(undefined, fromDate, toDate);
      
      // Get all lead entries for the date range
      const leadData = await this.getLeadEntries(undefined, fromDate, toDate);
      
      // Group data by user
      const userPerformance: Record<number, any> = {};
      
      // Process progress updates
      for (const update of progressData) {
        if (!userPerformance[update.userId]) {
          const user = await this.getUser(update.userId);
          userPerformance[update.userId] = {
            userId: update.userId,
            name: user?.name || 'Unknown',
            email: user?.email || '',
            role: user?.role || '',
            jobsFetched: 0,
            jobsApplied: 0,
            newLeads: 0,
            clientRejections: 0,
            teamRejections: 0
          };
        }
        
        userPerformance[update.userId].jobsFetched += update.jobsFetched;
        userPerformance[update.userId].jobsApplied += update.jobsApplied;
      }
      
      // Process lead entries
      for (const entry of leadData) {
        if (!userPerformance[entry.userId]) {
          const user = await this.getUser(entry.userId);
          userPerformance[entry.userId] = {
            userId: entry.userId,
            name: user?.name || 'Unknown',
            email: user?.email || '',
            role: user?.role || '',
            jobsFetched: 0,
            jobsApplied: 0,
            newLeads: 0,
            clientRejections: 0,
            teamRejections: 0
          };
        }
        
        userPerformance[entry.userId].newLeads += entry.newLeads;
        userPerformance[entry.userId].clientRejections += entry.clientRejections;
        userPerformance[entry.userId].teamRejections += entry.teamRejections;
      }
      
      return Object.values(userPerformance);
    } catch (error) {
      console.error('Error getting team performance data:', error);
      return [];
    }
  }

  // Initialize default users
  async initializeDefaultUsers(): Promise<void> {
    const defaultUsers: InsertUser[] = [
      {
        username: "manager1",
        password: "password123",
        name: "Manager User",
        email: "manager@example.com",
        role: "manager"
      },
      {
        username: "leadgen1",
        password: "password123",
        name: "Lead Gen User 1",
        email: "leadgen1@example.com",
        role: "lead_gen"
      },
      {
        username: "leadgen2",
        password: "password123",
        name: "Lead Gen User 2",
        email: "leadgen2@example.com",
        role: "lead_gen"
      },
      {
        username: "sales1",
        password: "password123",
        name: "Sales User 1",
        email: "sales1@example.com",
        role: "sales"
      },
      {
        username: "sales2",
        password: "password123",
        name: "Sales User 2",
        email: "sales2@example.com",
        role: "sales"
      }
    ];

    for (const user of defaultUsers) {
      try {
        const existingUser = await this.getUserByUsername(user.username);
        if (!existingUser) {
          await this.createUser(user);
          console.log(`Created default user: ${user.username}`);
        }
      } catch (error) {
        console.error(`Error creating default user ${user.username}:`, error);
      }
    }
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
