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
  
  // Get lead entries for the date range
  const leadEntries = await storage.getLeadEntries(undefined, fromDate, toDate);
  
  // Group updates by user, profile and day
  const userProfileMap: Record<number, Record<number, number>> = {};
  const userProfileDayMap: Record<string, Record<number, Record<number, number>>> = {
    'Monday': {},
    'Tuesday': {},
    'Wednesday': {},
    'Thursday': {},
    'Friday': {}
  };
  
  // Track totals by profile
  const profileTotals: Record<number, number> = {};
  profiles.forEach(profile => {
    profileTotals[profile.id] = 0;
  });
  
  // Track daily counts for sales coordinators
  const dailyLeadCounts: Record<string, Record<number, number>> = {
    'Monday': {},
    'Tuesday': {},
    'Wednesday': {},
    'Thursday': {},
    'Friday': {}
  };
  
  // Process progress updates and group them
  progressUpdates.forEach((update: ProgressUpdate) => {
    // Overall totals
    if (!userProfileMap[update.userId]) {
      userProfileMap[update.userId] = {};
    }
    
    if (!userProfileMap[update.userId][update.profileId]) {
      userProfileMap[update.userId][update.profileId] = 0;
    }
    
    userProfileMap[update.userId][update.profileId] += update.jobsApplied;
    
    // Add to profile totals
    profileTotals[update.profileId] = (profileTotals[update.profileId] || 0) + update.jobsApplied;
    
    // Daily data
    const updateDate = new Date(update.date);
    const dayOfWeek = format(updateDate, 'EEEE');
    
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek)) {
      if (!userProfileDayMap[dayOfWeek][update.userId]) {
        userProfileDayMap[dayOfWeek][update.userId] = {};
      }
      
      if (!userProfileDayMap[dayOfWeek][update.userId][update.profileId]) {
        userProfileDayMap[dayOfWeek][update.userId][update.profileId] = 0;
      }
      
      userProfileDayMap[dayOfWeek][update.userId][update.profileId] += update.jobsApplied;
    }
  });
  
  // Process lead entries for sales coordinator data
  leadEntries.forEach((entry: LeadEntry) => {
    const entryDate = new Date(entry.date);
    const dayOfWeek = format(entryDate, 'EEEE');
    
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek)) {
      if (!dailyLeadCounts[dayOfWeek][entry.profileId]) {
        dailyLeadCounts[dayOfWeek][entry.profileId] = 0;
      }
      
      dailyLeadCounts[dayOfWeek][entry.profileId] += entry.newLeads;
    }
  });
  
  // Format the date range for the report title
  const dateRange = formatReportDateRange(fromDate, toDate);
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title with th superscript
        new Paragraph({
          children: [
            new TextRun({
              text: "Total Fetching & Applies ",
              bold: true,
              size: 32,
            }),
            new TextRun({
              text: format(fromDate, 'do'),
              bold: true,
              size: 32,
            }),
            new TextRun({
              text: " ",
              bold: true,
              size: 32,
            }),
            new TextRun({
              text: format(fromDate, 'MMMM'),
              bold: true,
              size: 32,
            }),
            new TextRun({
              text: "–",
              bold: true,
              size: 32,
            }),
            new TextRun({
              text: format(toDate, 'do'),
              bold: true, 
              size: 32,
            }),
            new TextRun({
              text: format(toDate, 'MMMM'),
              bold: true,
              size: 32,
            }),
          ],
          spacing: {
            after: 200,
          },
          alignment: AlignmentType.CENTER,
          border: {
            bottom: {
              color: "auto",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 1,
            },
          },
        }),
        
        // Employee joining information
        ...leadGenUsers.map(user => 
          new Paragraph({
            children: [
              new TextRun({
                text: `${user.name} Joining Date 1st Feb`,
                size: 24,
              }),
            ],
            spacing: {
              after: 120,
            },
            alignment: AlignmentType.CENTER,
          })
        ),
        
        // Spacer
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 200 },
        }),
        
        // Main weekly table with profile data
        createWeeklySalesTable(leadGenUsers, profiles, userProfileMap),
        
        // Spacer
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 400 },
        }),
        
        // Add totals table
        createTotalsTable(profiles, profileTotals),
        
        // Spacer
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 400 },
        }),
        
        // Add daily sales coordinator data
        createSalesCoordinatorTable(profiles, dailyLeadCounts),
      ],
    }],
  });
  
  // Generate buffer
  return await Packer.toBuffer(doc);
}

// Helper function to create the main weekly sales table
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
              // Special cases like "WAS", "ON", "LEAVE" based on sample
              let displayText = appliedCount.toString();
              let color = undefined;
              
              // Random coloring for sample data values
              if (appliedCount === 0 || appliedCount === '') {
                displayText = '';
              } else if (displayText === "WAS" || displayText === "ON" || displayText === "LEAVE") {
                color = "00FF00"; // Green color for these special status values
              }
              
              return new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ 
                    text: displayText,
                    color: color,
                  })],
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

// Helper function to create the totals table
function createTotalsTable(
  profiles: any[],
  profileTotals: Record<number, number>
): Table {
  return new Table({
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
        children: profiles.map(profile => 
          new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({
                  text: `Total Applied 24th March – 28th March\n${profile.name}\nProfile`,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          })
        ),
      }),
      
      // Totals row
      new TableRow({
        children: profiles.map(profile => 
          new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({
                  text: (profileTotals[profile.id] || 0).toString(),
                  bold: true,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          })
        ),
      }),
    ],
  });
}

// Helper function to create the sales coordinator data table
function createSalesCoordinatorTable(
  profiles: any[],
  dailyLeadCounts: Record<string, Record<number, number>>
): Table {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  return new Table({
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
              children: [new TextRun({ text: "Day", bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            shading: {
              fill: "B0D6E8", // Light blue shading similar to the example
            },
          }),
          // Profile columns
          ...profiles.map(profile => 
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: profile.name, bold: true })],
                alignment: AlignmentType.CENTER,
              })],
            })
          ),
        ],
      }),
      
      // Day rows
      ...days.map(day => 
        new TableRow({
          children: [
            // Day cell
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: day })],
                alignment: AlignmentType.LEFT,
              })],
              shading: {
                fill: day === 'Total' ? "B0D6E8" : "E8E5C0", // Light beige for days
              },
            }),
            // Values for each profile on this day
            ...profiles.map(profile => {
              const count = dailyLeadCounts[day]?.[profile.id] || 0;
              return new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: count.toString() })],
                  alignment: AlignmentType.CENTER,
                })],
              });
            }),
          ],
        })
      ),
      
      // Total row
      new TableRow({
        children: [
          // Total cell
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: "Total", bold: true })],
              alignment: AlignmentType.LEFT,
            })],
            shading: {
              fill: "B0D6E8", // Light blue for total row
            },
          }),
          // Total values for each profile
          ...profiles.map(profile => {
            // Calculate total for this profile across all days
            const total = days.reduce((sum, day) => {
              return sum + (dailyLeadCounts[day]?.[profile.id] || 0);
            }, 0);
            
            return new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: total.toString(), bold: true })],
                alignment: AlignmentType.CENTER,
              })],
            });
          }),
        ],
      }),
    ],
  });
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