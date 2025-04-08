import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function MyProfilesPage() {
  // Get assigned profiles
  const { data: myProfiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["/api/my-profiles"],
  });
  
  // Get lead entries
  const { data: leadEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/lead-entries"],
  });
  
  // Loading state
  if (isLoadingProfiles || isLoadingEntries) {
    return (
      <DashboardLayout title="My Profiles">
        <Loading />
      </DashboardLayout>
    );
  }
  
  // Check if profiles are assigned
  if (!myProfiles || myProfiles.length === 0) {
    return (
      <DashboardLayout title="My Profiles">
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">No Profiles Assigned</h3>
                <p className="text-neutral-medium">
                  You don't have any profiles assigned yet. Please contact your manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  
  // Process lead data
  const profileLeadData = myProfiles.map((profile: any) => {
    const profileEntries = leadEntries?.filter((entry: any) => entry.profileId === profile.id) || [];
    const totalLeads = profileEntries.reduce((sum: number, entry: any) => sum + entry.newLeads, 0);
    const clientRejections = profileEntries.reduce((sum: number, entry: any) => sum + entry.clientRejections, 0);
    const teamRejections = profileEntries.reduce((sum: number, entry: any) => sum + entry.teamRejections, 0);
    const acceptedLeads = totalLeads - clientRejections - teamRejections;
    
    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      totalLeads,
      acceptedLeads,
      clientRejections,
      teamRejections,
      acceptanceRate: totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0
    };
  });
  
  // Prepare chart data for leads distribution
  const pieChartData = profileLeadData
    .filter((profile: any) => profile.totalLeads > 0)
    .map((profile: any) => ({
      name: profile.name,
      value: profile.totalLeads,
    }));
  
  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
  
  return (
    <DashboardLayout title="My Profiles">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card className="bg-white shadow h-full">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-6">Assigned Profiles</h3>
              
              <div className="space-y-6">
                {profileLeadData.map((profile: any) => (
                  <div key={profile.id} className="border rounded-md p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="font-medium text-lg">{profile.name}</h4>
                        <p className="text-sm text-neutral-medium mt-1 line-clamp-2 md:max-w-md">
                          {profile.description}
                        </p>
                      </div>
                      <div className="mt-3 md:mt-0 flex items-center">
                        <Link href="/lead-entry">
                          <Button size="sm" className="ml-auto">
                            Enter Leads
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-neutral-medium">Total Leads</p>
                        <p className="font-bold text-lg flex items-center">
                          {profile.totalLeads}
                          <TrendingUp className="ml-1 h-4 w-4 text-primary" />
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-neutral-medium">Accepted</p>
                        <p className="font-bold text-lg text-green-500">
                          {profile.acceptedLeads}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-neutral-medium">Client Rejected</p>
                        <p className="font-bold text-lg text-red-500">
                          {profile.clientRejections}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-neutral-medium">Team Rejected</p>
                        <p className="font-bold text-lg text-yellow-500">
                          {profile.teamRejections}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-neutral-medium">Lead Acceptance Rate</span>
                        <span className="text-sm font-medium">{profile.acceptanceRate}%</span>
                      </div>
                      <div className="w-full bg-neutral-bg rounded-full h-2">
                        <div 
                          className={`rounded-full h-2 ${
                            profile.acceptanceRate >= 70 
                              ? "bg-green-500" 
                              : profile.acceptanceRate >= 40 
                                ? "bg-yellow-500" 
                                : "bg-red-500"
                          }`}
                          style={{ width: `${profile.acceptanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Lead Distribution</h3>
            
            {pieChartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} leads`, 'Total Leads']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-72">
                <p className="text-neutral-medium">No lead data available</p>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="font-medium mb-3">Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-medium">Total Profiles:</span>
                  <span className="font-medium">{myProfiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-medium">Total Leads:</span>
                  <span className="font-medium">
                    {profileLeadData.reduce((sum: number, profile: any) => sum + profile.totalLeads, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-medium">Overall Acceptance Rate:</span>
                  <span className="font-medium">
                    {(() => {
                      const totalLeads = profileLeadData.reduce(
                        (sum: number, profile: any) => sum + profile.totalLeads, 
                        0
                      );
                      const acceptedLeads = profileLeadData.reduce(
                        (sum: number, profile: any) => sum + profile.acceptedLeads, 
                        0
                      );
                      return totalLeads > 0 
                        ? `${Math.round((acceptedLeads / totalLeads) * 100)}%` 
                        : "N/A";
                    })()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/lead-entry">
                <Button className="w-full">Enter Today's Leads</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Performance Tips</h3>
          
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-2">Improving Lead Acceptance Rate</h4>
              <p className="text-neutral-medium">
                Focus on quality over quantity when submitting leads. Ensure leads match the client's requirements closely and verify information before submission.
              </p>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-2">Regular Updates</h4>
              <p className="text-neutral-medium">
                Update your lead entries daily to maintain accurate tracking and get better insights into performance patterns.
              </p>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-2">Notes Matter</h4>
              <p className="text-neutral-medium">
                Add detailed notes about lead quality and client feedback. This information helps improve future applications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
