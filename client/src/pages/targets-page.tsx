import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Plus, RefreshCw, Save } from "lucide-react";

// Target form validation schema
const targetSchema = z.object({
  userId: z.string().min(1, "Please select a team member"),
  profileId: z.string().min(1, "Please select a profile"),
  jobsToFetch: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Must be a positive number",
  }),
  jobsToApply: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Must be a positive number",
  }),
  startDate: z.date(),
  endDate: z.date(),
  isWeekly: z.boolean(),
});

type TargetFormData = z.infer<typeof targetSchema>;

export default function TargetsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetType, setTargetType] = useState<"weekly" | "daily">("weekly");
  const [pendingTargetUpdates, setPendingTargetUpdates] = useState<{[key: number]: {jobsToFetch: number, jobsToApply: number}}>({}); 

  // Form handling
  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      userId: "",
      profileId: "",
      jobsToFetch: "",
      jobsToApply: "",
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 6)), // Default to a week
      isWeekly: true,
    },
  });

  // Queries
  const { data: targets, isLoading: isLoadingTargets } = useQuery({
    queryKey: ["/api/targets"],
  });

  const { data: leadGenUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users", "lead_gen"],
    queryFn: async () => {
      const res = await fetch(`/api/users?role=lead_gen`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lead generation team members");
      return res.json();
    },
  });

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["/api/profiles"],
  });

  // Create a new target
  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      return apiRequest("POST", "/api/targets", {
        userId: parseInt(data.userId),
        profileId: parseInt(data.profileId),
        jobsToFetch: parseInt(data.jobsToFetch),
        jobsToApply: parseInt(data.jobsToApply),
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        isWeekly: data.isWeekly,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Target created",
        description: "New target has been successfully set for the team member.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update an existing target
  const updateTargetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { jobsToFetch: number, jobsToApply: number } }) => {
      return apiRequest("PATCH", `/api/targets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setPendingTargetUpdates({});
      toast({
        title: "Target updated",
        description: "Target has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save all pending target updates
  const saveAllUpdates = () => {
    const updates = Object.entries(pendingTargetUpdates).map(([id, data]) => {
      return updateTargetMutation.mutate({ id: parseInt(id), data });
    });
    
    if (updates.length === 0) {
      toast({
        title: "No changes to save",
        description: "No target changes have been made.",
      });
    }
  };

  // Handle update of target values
  const handleTargetChange = (id: number, field: 'jobsToFetch' | 'jobsToApply', value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue <= 0) return;
    
    setPendingTargetUpdates(prev => {
      // Create a new pending update if it doesn't exist
      if (!prev[id]) {
        const target = targets.find((t: any) => t.id === id);
        if (!target) return prev;
        
        return {
          ...prev,
          [id]: { 
            jobsToFetch: target.jobsToFetch, 
            jobsToApply: target.jobsToApply,
            [field]: numValue
          }
        };
      }
      
      // Update existing pending update
      return {
        ...prev,
        [id]: { ...prev[id], [field]: numValue }
      };
    });
  };

  // Reset a single target's pending changes
  const resetTargetChanges = (id: number) => {
    setPendingTargetUpdates(prev => {
      const newUpdates = { ...prev };
      delete newUpdates[id];
      return newUpdates;
    });
  };

  // Save a single target's changes
  const saveTargetChanges = (id: number) => {
    if (!pendingTargetUpdates[id]) return;
    
    updateTargetMutation.mutate({
      id,
      data: pendingTargetUpdates[id]
    });
  };

  // Table columns for targets
  const targetColumns: ColumnDef<any>[] = [
    {
      accessorKey: "user.name",
      header: "Team Member",
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
            {row.original.user.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <span>{row.original.user.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "profile.name",
      header: "Profile",
    },
    {
      accessorKey: "jobsToFetch",
      header: "Jobs to Fetch",
      cell: ({ row }) => {
        const id = row.original.id;
        const pendingValue = pendingTargetUpdates[id]?.jobsToFetch;
        
        return (
          <Input
            type="number"
            value={pendingValue !== undefined ? pendingValue : row.original.jobsToFetch}
            onChange={(e) => handleTargetChange(id, 'jobsToFetch', e.target.value)}
            className="w-20 py-1 px-2 text-center"
            min={1}
          />
        );
      },
    },
    {
      accessorKey: "jobsToApply",
      header: "Jobs to Apply",
      cell: ({ row }) => {
        const id = row.original.id;
        const pendingValue = pendingTargetUpdates[id]?.jobsToApply;
        
        return (
          <Input
            type="number"
            value={pendingValue !== undefined ? pendingValue : row.original.jobsToApply}
            onChange={(e) => handleTargetChange(id, 'jobsToApply', e.target.value)}
            className="w-20 py-1 px-2 text-center"
            min={1}
          />
        );
      },
    },
    {
      id: "period",
      header: "Target Period",
      cell: ({ row }) => {
        const startDate = new Date(row.original.startDate);
        const endDate = new Date(row.original.endDate);
        return (
          <span>{format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}</span>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="px-2 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-xs">
          {row.original.isWeekly ? "Weekly" : "Daily"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original.id;
        const isPending = !!pendingTargetUpdates[id];
        
        return (
          <div className="flex space-x-2">
            {isPending && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => saveTargetChanges(id)}
                  className="text-primary"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => resetTargetChanges(id)}
                  className="text-neutral-medium"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // Handle form submission
  const onSubmit = (data: TargetFormData) => {
    // Ensure end date is not before start date
    if (data.endDate < data.startDate) {
      toast({
        title: "Invalid date range",
        description: "End date cannot be before start date.",
        variant: "destructive",
      });
      return;
    }
    
    createTargetMutation.mutate(data);
  };

  // Handle changing between daily and weekly targets
  const handleTargetTypeChange = (type: "weekly" | "daily") => {
    setTargetType(type);
    
    // Update form values
    form.setValue("isWeekly", type === "weekly");
    
    // If switching to weekly, set end date to a week from start date
    // If switching to daily, set end date to same as start date
    if (type === "weekly") {
      const startDate = form.getValues("startDate");
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      form.setValue("endDate", endDate);
    } else {
      form.setValue("endDate", form.getValues("startDate"));
    }
  };

  // Loading state
  if (isLoadingTargets || isLoadingUsers || isLoadingProfiles) {
    return (
      <DashboardLayout title="Set Targets">
        <Loading />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Set Targets">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Select 
            value={targetType} 
            onValueChange={(value) => handleTargetTypeChange(value as "weekly" | "daily")}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Set New Target
          </Button>
          <Button 
            onClick={saveAllUpdates}
            disabled={Object.keys(pendingTargetUpdates).length === 0}
            className="flex items-center"
          >
            <Check className="h-4 w-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>
      
      <Card className="bg-white shadow mb-8">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Lead Generation Team Targets</h3>
          
          <DataTable 
            columns={targetColumns} 
            data={targets || []} 
            searchable
            searchField="user.name"
          />
        </CardContent>
      </Card>
      
      {/* Create Target Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Target</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Team Member</Label>
                <Select 
                  onValueChange={(value) => form.setValue("userId", value)}
                  value={form.watch("userId")}
                >
                  <SelectTrigger id="userId">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadGenUsers?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.userId && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.userId.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profileId">Profile</Label>
                <Select 
                  onValueChange={(value) => form.setValue("profileId", value)}
                  value={form.watch("profileId")}
                >
                  <SelectTrigger id="profileId">
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((profile: any) => (
                      <SelectItem key={profile.id} value={profile.id.toString()}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.profileId && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.profileId.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobsToFetch">Jobs to Fetch</Label>
                  <Input
                    id="jobsToFetch"
                    type="number"
                    min="1"
                    {...form.register("jobsToFetch")}
                  />
                  {form.formState.errors.jobsToFetch && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.jobsToFetch.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jobsToApply">Jobs to Apply</Label>
                  <Input
                    id="jobsToApply"
                    type="number"
                    min="1"
                    {...form.register("jobsToApply")}
                  />
                  {form.formState.errors.jobsToApply && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.jobsToApply.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {form.watch("startDate") ? (
                          format(form.watch("startDate"), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.watch("startDate")}
                        onSelect={(date) => {
                          if (date) {
                            form.setValue("startDate", date);
                            // If daily target, set end date to same as start date
                            if (!form.watch("isWeekly")) {
                              form.setValue("endDate", date);
                            } else {
                              // If weekly, set end date to a week later
                              const endDate = new Date(date);
                              endDate.setDate(date.getDate() + 6);
                              form.setValue("endDate", endDate);
                            }
                          }
                        }}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={!form.watch("isWeekly")}
                      >
                        {form.watch("endDate") ? (
                          format(form.watch("endDate"), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.watch("endDate")}
                        onSelect={(date) => date && form.setValue("endDate", date)}
                        disabled={(date) => date < form.watch("startDate")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTargetMutation.isPending}
              >
                {createTargetMutation.isPending ? "Saving..." : "Set Target"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
