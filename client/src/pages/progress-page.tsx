import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Save } from "lucide-react";

// Progress update validation schema
const progressSchema = z.object({
  jobsFetched: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  jobsApplied: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  notes: z.string().optional(),
});

type ProgressFormData = z.infer<typeof progressSchema>;

export default function ProgressPage() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form handling
  const form = useForm<ProgressFormData>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      jobsFetched: "0",
      jobsApplied: "0",
      notes: "",
    },
  });
  
  // Get assigned profile data
  const { data: myProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/my-profile"],
  });
  
  // Get progress updates
  const { data: progressUpdates, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["/api/progress-updates"],
  });
  
  // Create a new progress update
  const createProgressMutation = useMutation({
    mutationFn: async (data: ProgressFormData) => {
      // Current date in YYYY-MM-DD format
      const today = format(new Date(), "yyyy-MM-dd");
      
      return apiRequest("POST", "/api/progress-updates", {
        date: today,
        jobsFetched: parseInt(data.jobsFetched),
        jobsApplied: parseInt(data.jobsApplied),
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress-updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-profile"] });
      setIsEditing(false);
      toast({
        title: "Progress updated",
        description: "Your daily progress has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Progress history table columns
  const progressColumns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"));
        return format(date, "MMMM d, yyyy");
      },
    },
    {
      accessorKey: "jobsFetched",
      header: "Jobs Fetched",
    },
    {
      accessorKey: "jobsApplied",
      header: "Jobs Applied",
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => {
        const notes = row.getValue("notes") as string;
        return notes ? notes : <span className="text-neutral-medium">No notes</span>;
      },
    },
  ];
  
  // Form submission handler
  const onSubmit = (data: ProgressFormData) => {
    // Ensure jobs applied is not greater than jobs fetched
    if (parseInt(data.jobsApplied) > parseInt(data.jobsFetched)) {
      toast({
        title: "Invalid input",
        description: "Jobs applied cannot be greater than jobs fetched.",
        variant: "destructive",
      });
      return;
    }
    
    createProgressMutation.mutate(data);
  };
  
  // Today's progress logic
  const today = format(new Date(), "yyyy-MM-dd");
  const todayProgress = progressUpdates?.find((update: any) => update.date === today);
  
  // Initialize form with today's progress values if they exist
  useState(() => {
    if (todayProgress) {
      form.setValue("jobsFetched", todayProgress.jobsFetched.toString());
      form.setValue("jobsApplied", todayProgress.jobsApplied.toString());
      form.setValue("notes", todayProgress.notes || "");
    }
  });
  
  // Loading state
  if (isLoadingProfile || isLoadingProgress) {
    return (
      <DashboardLayout title="Update Progress">
        <Loading />
      </DashboardLayout>
    );
  }
  
  // Check if profile is assigned
  if (!myProfile) {
    return (
      <DashboardLayout title="Update Progress">
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
  
  // Calculate target completion percentages
  const target = myProfile.target || { jobsToFetch: 0, jobsToApply: 0 };
  const fetchedPercentage = target.jobsToFetch > 0 
    ? Math.min(100, Math.round((parseInt(form.watch("jobsFetched")) / target.jobsToFetch) * 100))
    : 0;
  const appliedPercentage = target.jobsToApply > 0
    ? Math.min(100, Math.round((parseInt(form.watch("jobsApplied")) / target.jobsToApply) * 100))
    : 0;
  
  return (
    <DashboardLayout title="Update Progress">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Today's Progress</h3>
              <div className="text-sm text-neutral-medium">
                {format(new Date(), "MMMM d, yyyy")}
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-neutral-medium">Jobs to Fetch</span>
                  <span className="font-bold">
                    {form.watch("jobsFetched")} / {target.jobsToFetch}
                  </span>
                </div>
                <div className="w-full bg-neutral-bg rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${fetchedPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-neutral-medium">Jobs to Apply</span>
                  <span className="font-bold">
                    {form.watch("jobsApplied")} / {target.jobsToApply}
                  </span>
                </div>
                <div className="w-full bg-neutral-bg rounded-full h-2">
                  <div 
                    className="bg-success rounded-full h-2" 
                    style={{ width: `${appliedPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">Update Today's Progress</span>
                  {!isEditing && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="jobsFetched">Jobs Fetched</Label>
                        <Input 
                          id="jobsFetched"
                          type="number"
                          min="0"
                          disabled={!isEditing}
                          {...form.register("jobsFetched")}
                        />
                        {form.formState.errors.jobsFetched && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.jobsFetched.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="jobsApplied">Jobs Applied</Label>
                        <Input 
                          id="jobsApplied"
                          type="number"
                          min="0"
                          disabled={!isEditing}
                          {...form.register("jobsApplied")}
                        />
                        {form.formState.errors.jobsApplied && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.jobsApplied.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea 
                        id="notes"
                        placeholder="Any additional information..."
                        className="h-20"
                        disabled={!isEditing}
                        {...form.register("notes")}
                      />
                    </div>
                    
                    {isEditing && (
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            // Reset form to original values
                            if (todayProgress) {
                              form.reset({
                                jobsFetched: todayProgress.jobsFetched.toString(),
                                jobsApplied: todayProgress.jobsApplied.toString(),
                                notes: todayProgress.notes || "",
                              });
                            } else {
                              form.reset({
                                jobsFetched: "0",
                                jobsApplied: "0",
                                notes: "",
                              });
                            }
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createProgressMutation.isPending}
                        >
                          {createProgressMutation.isPending ? (
                            "Saving..."
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save Progress
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Assigned Profile</h3>
              <div className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm">
                {myProfile.profile.name}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <h4 className="font-medium">Profile Description</h4>
                <p className="text-sm text-neutral-medium mt-2">
                  {myProfile.profile.description}
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="font-medium">Current Target</h4>
                {myProfile.target ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-medium">Jobs to Fetch:</span>
                      <span className="font-semibold">{myProfile.target.jobsToFetch}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-medium">Jobs to Apply:</span>
                      <span className="font-semibold">{myProfile.target.jobsToApply}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-medium">Period:</span>
                      <span className="font-semibold">
                        {myProfile.target.isWeekly ? "Weekly" : "Daily"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-medium mt-2">
                    No target has been set yet.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Progress History</h3>
          
          {progressUpdates && progressUpdates.length > 0 ? (
            <DataTable 
              columns={progressColumns} 
              data={progressUpdates} 
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-neutral-medium">No progress records found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
