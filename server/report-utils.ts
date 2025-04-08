import { format } from 'date-fns';
import { storage } from './storage';
import { ProgressUpdate, LeadEntry } from '@shared/schema';
import { 
  Document, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  AlignmentType, 
  WidthType,
  HeadingLevel,
  BorderStyle,
  Packer
} from 'docx';

// Helper function to generate formatted dates for the report title
export function formatReportDateRange(fromDate: Date, toDate: Date): string {
  const fromDay = format(fromDate, 'do');
  const toDay = format(toDate, 'do');
  const month = format(fromDate, 'MMMM');
  
  return `${fromDay} ${month}–${toDay} ${month}`;
}

// Function to generate weekly sales report as a DOCX in the exact format as the sample
export async function generateWeeklySalesReport(fromDate: Date, toDate: Date): Promise<Buffer> {
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
  
  // Format the date range for the report title
  const dateRange = formatReportDateRange(fromDate, toDate);
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: `Total Fetching & Applies ${dateRange}`,
              bold: true,
              size: 28,
            }),
          ],
          spacing: {
            after: 400,
          },
        }),
        
        // Employee joining information
        ...leadGenUsers.map(user => 
          new Paragraph({
            children: [
              new TextRun({
                text: `${user.name}, Joining Date 1st Feb`,
                size: 24,
              }),
            ],
            spacing: {
              after: 200,
            },
          })
        ),
        
        // Spacer
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 200 },
        }),
        
        // Table with profile data
        createWeeklySalesTable(leadGenUsers, profiles, userProfileMap),
      ],
    }],
  });
  
  // Generate buffer
  return await Packer.toBuffer(doc);
}

// Helper function to create a table for the weekly sales report
function createWeeklySalesTable(
  users: any[], 
  profiles: any[], 
  userProfileMap: Record<number, Record<number, number>>
): Table {
  // Create the table
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      // Header row 1: S# and Employee Name + Profile names
      new TableRow({
        children: [
          // S# header
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "S #", bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            verticalAlign: "center",
          }),
          // Employee Name header
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Employee Name", bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            verticalAlign: "center",
          }),
          // Profile name headers
          ...profiles.map(profile => 
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: profile.name, bold: true })],
                alignment: AlignmentType.CENTER,
              })],
              verticalAlign: "center",
            })
          ),
        ],
      }),
      
      // Header row 2: Empty + Empty + "Applied" for each profile
      new TableRow({
        children: [
          // Empty S# cell
          new TableCell({
            children: [new Paragraph({ children: [] })],
          }),
          // Empty Employee Name cell
          new TableCell({
            children: [new Paragraph({ children: [] })],
          }),
          // "Applied" cells for each profile
          ...profiles.map(() => 
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "Applied", bold: true })],
                alignment: AlignmentType.CENTER,
              })],
            })
          ),
        ],
      }),
      
      // Data rows: one per user
      ...users.map((user, index) => 
        new TableRow({
          children: [
            // S# cell
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: (index + 1).toString() })],
                alignment: AlignmentType.CENTER,
              })],
            }),
            // Employee Name cell
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: user.name })],
              })],
            }),
            // Data cells for each profile
            ...profiles.map(profile => {
              const appliedCount = userProfileMap[user.id]?.[profile.id] || '';
              return new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: appliedCount.toString() })],
                  alignment: AlignmentType.CENTER,
                })],
              });
            }),
          ],
        })
      ),
    ],
  });
  
  return table;
}

// Function to generate daily report as a DOCX file
export async function generateDailyReport(date: Date): Promise<Buffer> {
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
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: `Daily Performance Report for ${formattedDate}`,
              bold: true,
              size: 28,
            }),
          ],
          spacing: {
            after: 400,
          },
        }),
        
        // Create table for daily report
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "S #", bold: true })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Employee Name", bold: true })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Profile", bold: true })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Jobs Fetched", bold: true })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Jobs Applied", bold: true })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Completion", bold: true })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
              ],
            }),
            
            // Data rows
            ...leadGenUsers.map((user, index) => {
              const userData = userUpdates[user.id];
              const jobsFetched = userData ? userData.jobsFetched : 0;
              const jobsApplied = userData ? userData.jobsApplied : 0;
              const profileName = userData ? userData.profileName : "No data";
              const completion = jobsFetched > 0 
                ? ((jobsApplied / jobsFetched) * 100).toFixed(1) + "%" 
                : "0%";
              
              return new TableRow({
                children: [
                  // S# cell
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: (index + 1).toString() })],
                      alignment: AlignmentType.CENTER,
                    })],
                  }),
                  // Employee Name cell
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: user.name })],
                    })],
                  }),
                  // Profile cell
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: profileName })],
                    })],
                  }),
                  // Jobs Fetched cell
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: jobsFetched.toString() })],
                      alignment: AlignmentType.CENTER,
                    })],
                  }),
                  // Jobs Applied cell
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: jobsApplied.toString() })],
                      alignment: AlignmentType.CENTER,
                    })],
                  }),
                  // Completion cell
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: completion })],
                      alignment: AlignmentType.CENTER,
                    })],
                  }),
                ],
              });
            }),
          ],
        }),
      ],
    }],
  });
  
  // Generate buffer
  return await Packer.toBuffer(doc);
}