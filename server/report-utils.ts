import { format } from 'date-fns';
import { storage } from './storage';
import { ProgressUpdate, LeadEntry } from '@shared/schema';

// Helper function to generate formatted dates for the report title
export function formatReportDateRange(fromDate: Date, toDate: Date): string {
  const fromDay = format(fromDate, 'do');
  const toDay = format(toDate, 'do');
  const month = format(fromDate, 'MMMM');
  
  return `${fromDay} ${month}–${toDay} ${month}`;
}

// Function to generate weekly sales report in the exact format as the sample
export async function generateWeeklySalesReport(fromDate: Date, toDate: Date): Promise<string> {
  // Get all lead gen users
  const leadGenUsers = await storage.getUsers('lead_gen');
  
  // Get all profiles
  const profiles = await storage.getProfiles();
  
  // Get progress updates for the date range
  const progressUpdates = await storage.getProgressUpdates(undefined, fromDate, toDate);
  
  // Group updates by user and profile
  const userProfileMap: Record<number, Record<number, number>> = {};
  
  progressUpdates.forEach((update: ProgressUpdate) => {
    if (!userProfileMap[update.userId]) {
      userProfileMap[update.userId] = {};
    }
    
    // Sum up jobs applied for each user-profile combination
    if (!userProfileMap[update.userId][update.profileId]) {
      userProfileMap[update.userId][update.profileId] = 0;
    }
    
    userProfileMap[update.userId][update.profileId] += update.jobsApplied;
  });
  
  // Format the report
  const dateRange = formatReportDateRange(fromDate, toDate);
  let report = `Total Fetching & Applies ${dateRange}\n\n`;
  
  // Add user joining dates (placeholder - would need actual joining dates from the user schema)
  const employeeInfo = leadGenUsers.map(user => `${user.name} Joining Date 1st Feb`).join("\n");
  report += `${employeeInfo}\n\n\n\n`;
  
  // Create table headers - S# and Employee Name are fixed, profile names are dynamic
  report += 'S #\tEmployee Name';
  
  // Add profile names as column headers
  profiles.forEach(profile => {
    report += `\t${profile.name}`;
  });
  
  report += '\n\t\t' + profiles.map(() => 'Applied').join('\t') + '\n';
  
  // Add data rows
  leadGenUsers.forEach((user, index) => {
    report += `${index + 1}\t${user.name}`;
    
    // For each profile, add the jobs applied count
    profiles.forEach(profile => {
      const appliedCount = userProfileMap[user.id]?.[profile.id] || '';
      report += `\t${appliedCount}`;
    });
    
    report += '\n';
  });
  
  return report;
}

// Function to generate daily report
export async function generateDailyReport(date: Date): Promise<string> {
  const formattedDate = format(date, 'MMM do, yyyy');
  
  // Get all lead gen users
  const leadGenUsers = await storage.getUsers('lead_gen');
  
  // Get all profiles
  const profiles = await storage.getProfiles();
  
  // Get progress updates for the date
  const progressUpdates = await storage.getProgressUpdates(undefined, date, date);
  
  // Group updates by user
  const userUpdates: Record<number, {
    jobsFetched: number;
    jobsApplied: number;
    profileName: string;
  }> = {};
  
  progressUpdates.forEach((update: ProgressUpdate) => {
    if (!userUpdates[update.userId]) {
      const profile = profiles.find(p => p.id === update.profileId);
      userUpdates[update.userId] = {
        jobsFetched: 0,
        jobsApplied: 0,
        profileName: profile?.name || 'Unknown Profile'
      };
    }
    
    userUpdates[update.userId].jobsFetched += update.jobsFetched;
    userUpdates[update.userId].jobsApplied += update.jobsApplied;
  });
  
  // Format the report
  let report = `Daily Performance Report for ${formattedDate}\n\n`;
  
  // Create table
  report += 'S #\tEmployee Name\tProfile\tJobs Fetched\tJobs Applied\tCompletion\n';
  
  leadGenUsers.forEach((user, index) => {
    const userData = userUpdates[user.id];
    if (userData) {
      const completion = ((userData.jobsApplied / userData.jobsFetched) * 100).toFixed(1);
      report += `${index + 1}\t${user.name}\t${userData.profileName}\t${userData.jobsFetched}\t${userData.jobsApplied}\t${completion}%\n`;
    } else {
      report += `${index + 1}\t${user.name}\tNo data\t0\t0\t0%\n`;
    }
  });
  
  return report;
}