import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/ui/loading";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function MyProfilePage() {
  // Get assigned profile data
  const { data: myProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/my-profile"],
  });
  
  // Get progress updates
  const { data: progressUpdates, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["/api/progress-updates"],
  });
  
  // Loading state
  if (isLoadingProfile || isLoadingProgress) {
    return (
      <DashboardLayout title="My Profile">
        <Loading />
      </DashboardLayout>
    );
  }
  
  // Check if profile is assigned
  if (!myProfile) {
    return (
      <DashboardLayout title="My Profile">
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">No Profile Assigned</h3>
                <p className="text-neutral-medium">
                  You don't have a profile assigned yet. Please contact your manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  
  // Format chart data
  const chartData = progressUpdates ? progressUpdates.slice(0, 7).map((update: any) => {
    const date = parseISO(update.date);
    return {
      date: format(date, "MMM d"),
      jobsFetched: update.jobsFetched,
      jobsApplied: update.jobsApplied,
    };
  }).reverse() : [];
  
  // Calculate overall statistics
  const totalJobsFetched = progressUpdates ? 
    progressUpdates.reduce((sum: number, update: any) => sum + update.jobsFetched, 0) : 0;
  
  const totalJobsApplied = progressUpdates ? 
    progressUpdates.reduce((sum: number, update: any) => sum + update.jobsApplied, 0) : 0;
  
  const target = myProfile.target || { jobsToFetch: 0, jobsToApply: 0 };
  
  // Calculate completion percentages
  const fetchedPercentage = target.jobsToFetch > 0 
    ? Math.min(100, Math.round((totalJobsFetched / target.jobsToFetch) * 100))
    : 0;
  
  const appliedPercentage = target.jobsToApply > 0
    ? Math.min(100, Math.round((totalJobsApplied / target.jobsToApply) * 100))
    : 0;
  
  return (
    <DashboardLayout title="My Profile">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Profile Details</h3>
            
            <div className="border rounded-md p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-lg">{myProfile.profile.name}</h4>
                  <p className="text-sm text-neutral-medium mt-1">
                    Profile ID: {myProfile.profile.id}
                  </p>
                </div>
                <div className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full">
                  Assigned
                </div>
              </div>
              <p className="mt-4 text-neutral-medium">
                {myProfile.profile.description}
              </p>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-3">Current Target</h4>
              {myProfile.target ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-medium">Jobs to Fetch</span>
                      <span className="font-bold">{totalJobsFetched} / {target.jobsToFetch}</span>
                    </div>
                    <div className="w-full bg-neutral-bg rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2" 
                        style={{ width: `${fetchedPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-neutral-medium">{fetchedPercentage}% completed</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-medium">Jobs to Apply</span>
                      <span className="font-bold">{totalJobsApplied} / {target.jobsToApply}</span>
                    </div>
                    <div className="w-full bg-neutral-bg rounded-full h-2">
                      <div 
                        className="bg-success rounded-full h-2" 
                        style={{ width: `${appliedPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-neutral-medium">{appliedPercentage}% completed</span>
                  </div>
                  
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-neutral-medium">Target Period:</span>
                    <span>
                      {format(parseISO(myProfile.target.startDate), "MMM d, yyyy")} - {format(parseISO(myProfile.target.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-medium">Type:</span>
                    <span>{myProfile.target.isWeekly ? "Weekly" : "Daily"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-medium">
                  No target has been set yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Weekly Performance</h3>
            
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="jobsFetched" name="Jobs Fetched" fill="#3B82F6" />
                    <Bar dataKey="jobsApplied" name="Jobs Applied" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-neutral-medium">No progress data available</p>
              </div>
            )}
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="border rounded-md p-3">
                <h4 className="text-sm text-neutral-medium mb-1">Total Jobs Fetched</h4>
                <p className="text-2xl font-bold">{totalJobsFetched}</p>
              </div>
              
              <div className="border rounded-md p-3">
                <h4 className="text-sm text-neutral-medium mb-1">Total Jobs Applied</h4>
                <p className="text-2xl font-bold">{totalJobsApplied}</p>
              </div>
              
              <div className="border rounded-md p-3">
                <h4 className="text-sm text-neutral-medium mb-1">Application Rate</h4>
                <p className="text-2xl font-bold">
                  {totalJobsFetched > 0 
                    ? Math.round((totalJobsApplied / totalJobsFetched) * 100) 
                    : 0}%
                </p>
              </div>
              
              <div className="border rounded-md p-3">
                <h4 className="text-sm text-neutral-medium mb-1">Target Completion</h4>
                <p className="text-2xl font-bold">
                  {appliedPercentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Recent Notes</h3>
          
          {progressUpdates && progressUpdates.filter((update: any) => update.notes).length > 0 ? (
            <div className="space-y-4">
              {progressUpdates
                .filter((update: any) => update.notes)
                .slice(0, 5)
                .map((update: any) => (
                  <div key={update.id} className="border rounded-md p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {format(parseISO(update.date), "MMMM d, yyyy")}
                      </span>
                      <span className="text-sm text-neutral-medium">
                        Jobs Applied: {update.jobsApplied} / Fetched: {update.jobsFetched}
                      </span>
                    </div>
                    <p className="text-neutral-medium">{update.notes}</p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-neutral-medium">No notes available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
