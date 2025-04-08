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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Lead entry validation schema
const leadEntrySchema = z.object({
  profileId: z.string().min(1, "Please select a profile"),
  newLeads: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  clientRejections: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  teamRejections: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  notes: z.string().optional(),
});

type LeadEntryFormData = z.infer<typeof leadEntrySchema>;

export default function LeadEntryPage() {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  
  // Form handling
  const form = useForm<LeadEntryFormData>({
    resolver: zodResolver(leadEntrySchema),
    defaultValues: {
      profileId: "",
      newLeads: "0",
      clientRejections: "0",
      teamRejections: "0",
      notes: "",
    },
  });
  
  // Edit form handling
  const editForm = useForm<LeadEntryFormData>({
    resolver: zodResolver(leadEntrySchema),
    defaultValues: {
      profileId: "",
      newLeads: "0",
      clientRejections: "0",
      teamRejections: "0",
      notes: "",
    },
  });
  
  // Get assigned profiles
  const { data: myProfiles = [], isLoading: isLoadingProfiles } = useQuery<any[]>({
    queryKey: ["/api/my-profiles"],
  });
  
  // Get lead entries
  const { data: leadEntries = [], isLoading: isLoadingEntries } = useQuery<any[]>({
    queryKey: ["/api/lead-entries"],
  });
  
  // Create a new lead entry
  const createLeadEntryMutation = useMutation({
    mutationFn: async (data: LeadEntryFormData) => {
      // Current date in YYYY-MM-DD format
      const today = format(new Date(), "yyyy-MM-dd");
      
      return apiRequest("POST", "/api/lead-entries", {
        profileId: parseInt(data.profileId),
        date: today,
        newLeads: parseInt(data.newLeads),
        clientRejections: parseInt(data.clientRejections),
        teamRejections: parseInt(data.teamRejections),
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-entries"] });
      form.reset({
        profileId: "",
        newLeads: "0",
        clientRejections: "0",
        teamRejections: "0",
        notes: "",
      });
      toast({
        title: "Lead entry submitted",
        description: "Your lead entry has been submitted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to submit lead entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update an existing lead entry
  const updateLeadEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<LeadEntryFormData> }) => {
      const payload = {
        newLeads: parseInt(data.newLeads || "0"),
        clientRejections: parseInt(data.clientRejections || "0"),
        teamRejections: parseInt(data.teamRejections || "0"),
        notes: data.notes || "",
      };
      
      return apiRequest("PATCH", `/api/lead-entries/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-entries"] });
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      toast({
        title: "Lead entry updated",
        description: "Your lead entry has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update lead entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Lead entries table columns
  const leadEntryColumns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"));
        return format(date, "MMMM d, yyyy");
      },
    },
    {
      accessorKey: "profile.name",
      header: "Profile",
    },
    {
      accessorKey: "newLeads",
      header: "New Leads",
    },
    {
      accessorKey: "clientRejections",
      header: "Client Rejections",
    },
    {
      accessorKey: "teamRejections",
      header: "Team Rejections",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingEntry(row.original);
            // Set edit form values
            editForm.setValue("profileId", row.original.profileId.toString());
            editForm.setValue("newLeads", row.original.newLeads.toString());
            editForm.setValue("clientRejections", row.original.clientRejections.toString());
            editForm.setValue("teamRejections", row.original.teamRejections.toString());
            editForm.setValue("notes", row.original.notes || "");
            setIsEditDialogOpen(true);
          }}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      ),
    },
  ];
  
  // Form submission handler
  const onSubmit = (data: LeadEntryFormData) => {
    // Ensure rejections are not greater than new leads
    const newLeads = parseInt(data.newLeads);
    const clientRejections = parseInt(data.clientRejections);
    const teamRejections = parseInt(data.teamRejections);
    
    if (clientRejections + teamRejections > newLeads) {
      toast({
        title: "Invalid input",
        description: "Total rejections cannot be greater than new leads.",
        variant: "destructive",
      });
      return;
    }
    
    createLeadEntryMutation.mutate(data);
  };
  
  // Edit form submission handler
  const onEditSubmit = (data: LeadEntryFormData) => {
    // Ensure rejections are not greater than new leads
    const newLeads = parseInt(data.newLeads);
    const clientRejections = parseInt(data.clientRejections);
    const teamRejections = parseInt(data.teamRejections);
    
    if (clientRejections + teamRejections > newLeads) {
      toast({
        title: "Invalid input",
        description: "Total rejections cannot be greater than new leads.",
        variant: "destructive",
      });
      return;
    }
    
    updateLeadEntryMutation.mutate({
      id: editingEntry.id,
      data
    });
  };
  
  // Group entries by week for filtering
  const getWeekFilters = () => {
    if (!leadEntries || leadEntries.length === 0) return [];
    
    const weekMap = new Map();
    
    leadEntries.forEach((entry: any) => {
      const date = new Date(entry.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Go to the start of the week (Sunday)
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Go to the end of the week (Saturday)
      
      const weekKey = `${format(weekStart, 'yyyy-MM-dd')}`;
      const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, weekLabel);
      }
    });
    
    return Array.from(weekMap.entries()).map(([key, value]) => ({
      value: key,
      label: value,
    }));
  };
  
  // Loading state
  if (isLoadingProfiles || isLoadingEntries) {
    return (
      <DashboardLayout title="Lead Entry">
        <Loading />
      </DashboardLayout>
    );
  }
  
  // Check if profiles are assigned
  if (!myProfiles || myProfiles.length === 0) {
    return (
      <DashboardLayout title="Lead Entry">
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
  
  // Get targets for the selected profile
  const { data: targets = [] } = useQuery<any[]>({
    queryKey: ["/api/targets"],
    enabled: !!myProfiles && myProfiles.length > 0,
  });

  // Get target info for a selected profile
  const getTargetInfoForProfile = (profileId: string) => {
    if (!targets || !profileId) return null;
    return targets.find((t: any) => t.profileId.toString() === profileId);
  };

  const selectedTarget = form.watch("profileId") ? getTargetInfoForProfile(form.watch("profileId")) : null;

  return (
    <DashboardLayout title="Lead Entry">
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-neutral-medium">
          Today: {format(new Date(), "MMMM d, yyyy")}
        </div>
        
        {selectedTarget && (
          <div className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm">
            {selectedTarget.isWeekly ? "Weekly Target" : "Daily Target"}
          </div>
        )}
      </div>
      
      <Card className="bg-white shadow mb-8">
        <CardContent className="p-6">
          <h3 className="font-medium mb-6">Enter Today's Leads</h3>
          
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profileId">Select Profile</Label>
                <Select 
                  onValueChange={(value) => form.setValue("profileId", value)}
                  value={form.watch("profileId")}
                >
                  <SelectTrigger id="profileId">
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {myProfiles.map((profile: any) => (
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newLeads">New Leads</Label>
                  <Input 
                    id="newLeads"
                    type="number"
                    min="0"
                    {...form.register("newLeads")}
                  />
                  {form.formState.errors.newLeads && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.newLeads.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientRejections">Client Rejections</Label>
                  <Input 
                    id="clientRejections"
                    type="number"
                    min="0"
                    {...form.register("clientRejections")}
                  />
                  {form.formState.errors.clientRejections && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.clientRejections.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teamRejections">Team Rejections</Label>
                  <Input 
                    id="teamRejections"
                    type="number"
                    min="0"
                    {...form.register("teamRejections")}
                  />
                  {form.formState.errors.teamRejections && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.teamRejections.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes"
                  placeholder="Any additional information..."
                  className="h-24"
                  {...form.register("notes")}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit"
                  disabled={createLeadEntryMutation.isPending}
                >
                  {createLeadEntryMutation.isPending ? "Submitting..." : "Submit Lead Data"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Recent Entries</h3>
            <div className="relative">
              <Select defaultValue="this-week">
                <SelectTrigger className="bg-white border border-neutral-light rounded-md px-3 py-1 text-sm">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  {getWeekFilters().map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DataTable 
            columns={leadEntryColumns} 
            data={leadEntries || []} 
          />
        </CardContent>
      </Card>
      
      {/* Edit Lead Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead Entry</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Profile</Label>
                <div className="py-2 px-3 border rounded-md bg-gray-50">
                  {editingEntry?.profile?.name}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="py-2 px-3 border rounded-md bg-gray-50">
                  {editingEntry && format(new Date(editingEntry.date), "MMMM d, yyyy")}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-newLeads">New Leads</Label>
                  <Input 
                    id="edit-newLeads"
                    type="number"
                    min="0"
                    {...editForm.register("newLeads")}
                  />
                  {editForm.formState.errors.newLeads && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.newLeads.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-clientRejections">Client Rejections</Label>
                  <Input 
                    id="edit-clientRejections"
                    type="number"
                    min="0"
                    {...editForm.register("clientRejections")}
                  />
                  {editForm.formState.errors.clientRejections && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.clientRejections.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-teamRejections">Team Rejections</Label>
                  <Input 
                    id="edit-teamRejections"
                    type="number"
                    min="0"
                    {...editForm.register("teamRejections")}
                  />
                  {editForm.formState.errors.teamRejections && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.teamRejections.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea 
                  id="edit-notes"
                  placeholder="Any additional information..."
                  className="h-24"
                  {...editForm.register("notes")}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateLeadEntryMutation.isPending}
              >
                {updateLeadEntryMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
