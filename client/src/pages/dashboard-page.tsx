import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/ui/loading";
import { LineChart, BarChart, PieChart, Line, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Users, Briefcase, TrendingUp } from "lucide-react";

// Manager Dashboard components
function ManagerStats() {
  const { data: teamPerformance } = useQuery({
    queryKey: ["/api/team-performance"],
  });
  
  const { data: leadEntries } = useQuery({
    queryKey: ["/api/lead-entries"],
  });
  
  // Calculate summary statistics
  const totalJobsApplied = teamPerformance ? 
    teamPerformance.reduce((sum: number, item: any) => sum + item.jobsApplied, 0) : 0;
  
  const totalLeadsGenerated = leadEntries ? 
    leadEntries.reduce((sum: number, item: any) => sum + item.newLeads, 0) : 0;
  
  const leadConversionRate = totalJobsApplied > 0 ? 
    Math.round((totalLeadsGenerated / totalJobsApplied) * 100) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-medium text-sm">Total Jobs Applied</p>
              <h3 className="text-2xl font-bold mt-1">{totalJobsApplied}</h3>
              <div className="flex items-center mt-1 text-success text-sm">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>12% from last week</span>
              </div>
            </div>
            <div className="bg-primary bg-opacity-10 p-2 rounded-full">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-medium text-sm">Total Leads Generated</p>
              <h3 className="text-2xl font-bold mt-1">{totalLeadsGenerated}</h3>
              <div className="flex items-center mt-1 text-success text-sm">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>8% from last week</span>
              </div>
            </div>
            <div className="bg-green-500 bg-opacity-10 p-2 rounded-full">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-medium text-sm">Lead Conversion Rate</p>
              <h3 className="text-2xl font-bold mt-1">{leadConversionRate}%</h3>
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <ArrowDown className="h-4 w-4 mr-1" />
                <span>3% from last week</span>
              </div>
            </div>
            <div className="bg-purple-500 bg-opacity-10 p-2 rounded-full">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ManagerCharts() {
  // Weekly performance data
  const weeklyData = [
    { name: 'Mon', jobsApplied: 42, leadsGenerated: 12 },
    { name: 'Tue', jobsApplied: 38, leadsGenerated: 15 },
    { name: 'Wed', jobsApplied: 35, leadsGenerated: 10 },
    { name: 'Thu', jobsApplied: 29, leadsGenerated: 8 },
    { name: 'Fri', jobsApplied: 33, leadsGenerated: 9 },
    { name: 'Sat', jobsApplied: 20, leadsGenerated: 5 },
    { name: 'Sun', jobsApplied: 18, leadsGenerated: 4 },
  ];
  
  // Profile distribution data
  const profileData = [
    { name: 'Software Engineer', value: 35 },
    { name: 'UX Designer', value: 25 },
    { name: 'Project Manager', value: 20 },
    { name: 'Marketing Specialist', value: 15 },
    { name: 'Data Analyst', value: 5 },
  ];
  
  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Weekly Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="jobsApplied" 
                  name="Jobs Applied" 
                  stroke="#3B82F6" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="leadsGenerated" 
                  name="Leads Generated" 
                  stroke="#10B981" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Profile Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profileData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {profileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ManagerTeamTable() {
  const { data: teamPerformance, isLoading } = useQuery({
    queryKey: ["/api/team-performance"],
  });
  
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Team Member",
    },
    {
      accessorKey: "profile",
      header: "Profile",
    },
    {
      accessorKey: "targetJobsToApply",
      header: "Target (Jobs)",
    },
    {
      accessorKey: "jobsApplied",
      header: "Applied",
    },
    {
      accessorKey: "completion",
      header: "Progress",
      cell: ({ row }) => {
        const completion = row.original.completion || 0;
        let colorClass = "bg-success";
        
        if (completion < 60) {
          colorClass = "bg-warning";
        } else if (completion < 40) {
          colorClass = "bg-danger";
        }
        
        return (
          <div>
            <div className="w-full bg-neutral-bg rounded-full h-2">
              <div className={`${colorClass} rounded-full h-2`} style={{ width: `${completion}%` }}></div>
            </div>
            <span className="text-xs text-neutral-medium mt-1 inline-block">{completion}%</span>
          </div>
        );
      },
    },
  ];
  
  if (isLoading) return <Loading />;
  
  return (
    <Card className="bg-white shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Team Performance</h3>
        </div>
        <DataTable 
          columns={columns} 
          data={teamPerformance || []} 
        />
      </CardContent>
    </Card>
  );
}

// Lead Generation Dashboard Components
function LeadGenStats() {
  const { user } = useAuth();
  
  const { data: myProfile, isLoading } = useQuery({
    queryKey: ["/api/my-profile"],
  });
  
  const { data: progressUpdates } = useQuery({
    queryKey: ["/api/progress-updates"],
  });
  
  if (isLoading) return <Loading />;
  
  if (!myProfile) {
    return (
      <Card className="bg-white shadow mb-8">
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-neutral-medium">No profile assigned yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate progress percentages
  const target = myProfile.target || { jobsToApply: 0, jobsToFetch: 0 };
  const applied = progressUpdates ? 
    progressUpdates.reduce((sum: number, update: any) => sum + update.jobsApplied, 0) : 0;
  const fetched = progressUpdates ? 
    progressUpdates.reduce((sum: number, update: any) => sum + update.jobsFetched, 0) : 0;
  
  const completionPercentage = target.jobsToApply > 0 ? 
    Math.round((applied / target.jobsToApply) * 100) : 0;
  
  return (
    <Card className="bg-white shadow mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="font-semibold">Your Profile</h3>
            <div className="mt-2 inline-block px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full">
              {myProfile.profile.name}
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end">
            <div className="text-sm text-neutral-medium">Weekly Target Progress</div>
            <div className="mt-1 text-2xl font-bold flex items-center">
              <span>{applied} / {target.jobsToApply}</span>
              <span className="ml-2 px-2 py-1 bg-success bg-opacity-10 text-success text-sm rounded-full">
                {completionPercentage}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadGenCharts() {
  const { data: progressUpdates, isLoading } = useQuery({
    queryKey: ["/api/progress-updates"],
  });
  
  if (isLoading) return <Loading />;
  
  // Format data for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  
  // Map progress updates to respective days
  const progressData = last7Days.map(day => {
    const dayUpdates = progressUpdates?.filter((update: any) => 
      update.date === day
    ) || [];
    
    const jobsFetched = dayUpdates.reduce((sum: number, update: any) => sum + update.jobsFetched, 0);
    const jobsApplied = dayUpdates.reduce((sum: number, update: any) => sum + update.jobsApplied, 0);
    
    // Format day label as 'Mon', 'Tue', etc.
    const date = new Date(day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      name: dayName,
      jobsFetched,
      jobsApplied
    };
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">My Daily Progress</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="jobsFetched" name="Jobs Fetched" fill="#3B82F6" />
                <Bar dataKey="jobsApplied" name="Jobs Applied" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Today's Targets</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-neutral-medium">Jobs to Fetch</span>
                <span className="font-bold">8 / 12</span>
              </div>
              <div className="w-full bg-neutral-bg rounded-full h-2">
                <div className="bg-primary rounded-full h-2" style={{ width: '67%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-neutral-medium">Jobs to Apply</span>
                <span className="font-bold">6 / 10</span>
              </div>
              <div className="w-full bg-neutral-bg rounded-full h-2">
                <div className="bg-success rounded-full h-2" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sales Coordinator Dashboard Components
function SalesStats() {
  const { data: leadEntries } = useQuery({
    queryKey: ["/api/lead-entries"],
  });
  
  // Calculate summary statistics
  const newLeads = leadEntries ? 
    leadEntries.reduce((sum: number, entry: any) => sum + entry.newLeads, 0) : 0;
  
  const clientRejections = leadEntries ? 
    leadEntries.reduce((sum: number, entry: any) => sum + entry.clientRejections, 0) : 0;
  
  const teamRejections = leadEntries ? 
    leadEntries.reduce((sum: number, entry: any) => sum + entry.teamRejections, 0) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-medium text-sm">New Leads</p>
              <h3 className="text-2xl font-bold mt-1">{newLeads}</h3>
              <div className="flex items-center mt-1 text-success text-sm">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>8% from yesterday</span>
              </div>
            </div>
            <div className="bg-primary bg-opacity-10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-medium text-sm">Client Rejections</p>
              <h3 className="text-2xl font-bold mt-1">{clientRejections}</h3>
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>2% from yesterday</span>
              </div>
            </div>
            <div className="bg-red-500 bg-opacity-10 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-medium text-sm">Team Rejections</p>
              <h3 className="text-2xl font-bold mt-1">{teamRejections}</h3>
              <div className="flex items-center mt-1 text-success text-sm">
                <ArrowDown className="h-4 w-4 mr-1" />
                <span>5% from yesterday</span>
              </div>
            </div>
            <div className="bg-yellow-500 bg-opacity-10 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="17" y1="8" x2="22" y2="13" />
                <line x1="22" y1="8" x2="17" y2="13" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesCharts() {
  const { data: leadEntries, isLoading } = useQuery({
    queryKey: ["/api/lead-entries"],
  });
  
  const { data: myProfiles } = useQuery({
    queryKey: ["/api/my-profiles"],
  });
  
  if (isLoading) return <Loading />;
  
  // Format data for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  
  // Map lead entries to respective days
  const leadData = last7Days.map(day => {
    const dayEntries = leadEntries?.filter((entry: any) => 
      entry.date === day
    ) || [];
    
    const newLeads = dayEntries.reduce((sum: number, entry: any) => sum + entry.newLeads, 0);
    const rejections = dayEntries.reduce((sum: number, entry: any) => 
      sum + entry.clientRejections + entry.teamRejections, 0);
    
    // Format day label as 'Mon', 'Tue', etc.
    const date = new Date(day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      name: dayName,
      newLeads,
      rejections
    };
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Lead Conversion Rates</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="newLeads" 
                  name="New Leads" 
                  stroke="#3B82F6" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="rejections" 
                  name="Rejections" 
                  stroke="#EF4444" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">My Assigned Profiles</h3>
          
          {myProfiles && myProfiles.length > 0 ? (
            <div className="space-y-4">
              {myProfiles.map((profile: any) => (
                <div key={profile.id} className="border rounded-md p-4">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">{profile.name}</h4>
                      <div className="flex items-center text-sm text-neutral-medium mt-1">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>
                          {leadEntries?.filter((entry: any) => entry.profileId === profile.id)
                            .reduce((sum: number, entry: any) => sum + entry.newLeads, 0) || 0} Leads
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-neutral-medium">No profiles assigned yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Dashboard Page Component
export default function DashboardPage() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <DashboardLayout title="Dashboard">
      {user.role === "manager" && (
        <>
          <ManagerStats />
          <ManagerCharts />
          <ManagerTeamTable />
        </>
      )}
      
      {user.role === "lead_gen" && (
        <>
          <LeadGenStats />
          <LeadGenCharts />
        </>
      )}
      
      {user.role === "sales" && (
        <>
          <SalesStats />
          <SalesCharts />
        </>
      )}
    </DashboardLayout>
  );
}
