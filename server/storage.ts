import { users, type User, type InsertUser, profiles, type Profile, type InsertProfile, leadGenAssignments, type LeadGenAssignment, type InsertLeadGenAssignment, salesAssignments, type SalesAssignment, type InsertSalesAssignment, targets, type Target, type InsertTarget, progressUpdates, type ProgressUpdate, type InsertProgressUpdate, leadEntries, type LeadEntry, type InsertLeadEntry } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(role?: string): Promise<User[]>;
  
  // Profile operations
  getProfile(id: number): Promise<Profile | undefined>;
  getProfiles(): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  
  // Lead Gen Assignment operations
  getLeadGenAssignment(userId: number): Promise<LeadGenAssignment | undefined>;
  getLeadGenAssignments(): Promise<LeadGenAssignment[]>;
  createLeadGenAssignment(assignment: InsertLeadGenAssignment): Promise<LeadGenAssignment>;
  updateLeadGenAssignment(userId: number, profileId: number): Promise<LeadGenAssignment | undefined>;
  
  // Sales Assignment operations
  getSalesAssignments(userId?: number): Promise<SalesAssignment[]>;
  createSalesAssignment(assignment: InsertSalesAssignment): Promise<SalesAssignment>;
  deleteSalesAssignment(id: number): Promise<boolean>;
  
  // Target operations
  getTargets(userId?: number): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: number, jobsToFetch: number, jobsToApply: number): Promise<Target | undefined>;
  
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
  sessionStore: session.SessionStore;
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
  
  sessionStore: session.SessionStore;

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
    
    // Initialize with default profiles
    this.initializeDefaultProfiles();
  }
  
  private async initializeDefaultProfiles() {
    const defaultProfiles = [
      { name: "Software Engineer", description: "Full-stack developer with 5 years of experience in React, Node.js, and AWS." },
      { name: "UX Designer", description: "Designer with expertise in user research, wireframing, and prototyping." },
      { name: "Project Manager", description: "PMP certified manager with experience leading agile teams." },
      { name: "Marketing Specialist", description: "Digital marketing expert with SEO and content creation skills." },
      { name: "Data Analyst", description: "Skilled in data visualization, SQL, and statistical analysis." }
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
  
  async getUsers(role?: string): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (role) {
      return users.filter(user => user.role === role);
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
    const profile: Profile = { ...insertProfile, id };
    this.profiles.set(id, profile);
    return profile;
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
    const update: ProgressUpdate = { ...insertUpdate, id };
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
    const entry: LeadEntry = { ...insertEntry, id };
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
    
    if (user.role === 'lead_gen') {
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
    
    if (user.role === 'sales') {
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
    const leadGenUsers = await this.getUsers('lead_gen');
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
export const storage = new MemStorage();
