import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, MoreHorizontal, Trash, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Validation schema
const assignLeadGenSchema = z.object({
  userId: z.string().min(1, "Please select a team member"),
  profileId: z.string().min(1, "Please select a profile"),
});

const assignSalesSchema = z.object({
  userId: z.string().min(1, "Please select a sales coordinator"),
  profileIds: z.array(z.string()).min(1, "Please select at least one profile"),
});

type AssignLeadGenFormData = z.infer<typeof assignLeadGenSchema>;
type AssignSalesFormData = z.infer<typeof assignSalesSchema>;

export default function ProfilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLeadGenDialogOpen, setIsLeadGenDialogOpen] = useState(false);
  const [isSalesDialogOpen, setIsSalesDialogOpen] = useState(false);

  // Form handling
  const leadGenForm = useForm<AssignLeadGenFormData>({
    resolver: zodResolver(assignLeadGenSchema),
    defaultValues: {
      userId: "",
      profileId: "",
    },
  });

  const salesForm = useForm<AssignSalesFormData>({
    resolver: zodResolver(assignSalesSchema),
    defaultValues: {
      userId: "",
      profileIds: [],
    },
  });

  // Queries
  const { data: leadGenAssignments, isLoading: isLoadingLeadGen } = useQuery({
    queryKey: ["/api/lead-gen-assignments"],
  });

  const { data: salesAssignments, isLoading: isLoadingSales } = useQuery({
    queryKey: ["/api/sales-assignments"],
  });

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["/api/profiles"],
  });

  const { data: leadGenUsers, isLoading: isLoadingLeadGenUsers } = useQuery({
    queryKey: ["/api/users", "lead_gen"],
    queryFn: async () => {
      const res = await fetch(`/api/users?role=lead_gen`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lead generation team members");
      return res.json();
    },
  });

  const { data: salesUsers, isLoading: isLoadingSalesUsers } = useQuery({
    queryKey: ["/api/users", "sales"],
    queryFn: async () => {
      const res = await fetch(`/api/users?role=sales`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales coordinators");
      return res.json();
    },
  });

  // Mutations
  const assignLeadGenMutation = useMutation({
    mutationFn: async (data: AssignLeadGenFormData) => {
      return apiRequest("POST", "/api/lead-gen-assignments", {
        userId: parseInt(data.userId),
        profileId: parseInt(data.profileId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-gen-assignments"] });
      setIsLeadGenDialogOpen(false);
      leadGenForm.reset();
      toast({
        title: "Profile assigned",
        description: "Profile has been successfully assigned to the team member.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to assign profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignSalesMutation = useMutation({
    mutationFn: async (data: AssignSalesFormData) => {
      // Create a batch of assignments for the selected profiles
      const promises = data.profileIds.map(profileId => 
        apiRequest("POST", "/api/sales-assignments", {
          userId: parseInt(data.userId),
          profileId: parseInt(profileId),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-assignments"] });
      setIsSalesDialogOpen(false);
      salesForm.reset();
      toast({
        title: "Profiles assigned",
        description: "Selected profiles have been successfully assigned to the sales coordinator.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to assign profiles",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLeadGenAssignmentMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/lead-gen-assignments/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-gen-assignments"] });
      toast({
        title: "Assignment removed",
        description: "Profile assignment has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSalesAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sales-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-assignments"] });
      toast({
        title: "Assignment removed",
        description: "Profile assignment has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Lead Gen table columns
  const leadGenColumns: ColumnDef<any>[] = [
    {
      accessorKey: "user.name",
      header: "Team Member",
    },
    {
      accessorKey: "user.email",
      header: "Email",
    },
    {
      accessorKey: "profile.name",
      header: "Assigned Profile",
      cell: ({ row }) => (
        <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm">
          {row.getValue("profile.name")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Pre-fill form for editing
              leadGenForm.setValue("userId", row.original.userId.toString());
              leadGenForm.setValue("profileId", row.original.profileId.toString());
              setIsLeadGenDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              deleteLeadGenAssignmentMutation.mutate(row.original.userId);
            }}
          >
            <Trash className="h-4 w-4 mr-2 text-red-500" />
            <span className="text-red-500">Remove</span>
          </Button>
        </div>
      ),
    },
  ];

  // Sales table columns
  const salesColumns: ColumnDef<any>[] = [
    {
      accessorKey: "user.name",
      header: "Sales Coordinator",
    },
    {
      accessorKey: "user.email",
      header: "Email",
    },
    {
      accessorKey: "profile.name",
      header: "Assigned Profile",
      cell: ({ row }) => (
        <span className="px-3 py-1 bg-secondary bg-opacity-10 text-secondary rounded-full text-sm">
          {row.getValue("profile.name")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            deleteSalesAssignmentMutation.mutate(row.original.id);
          }}
        >
          <Trash className="h-4 w-4 mr-2 text-red-500" />
          <span className="text-red-500">Remove</span>
        </Button>
      ),
    },
  ];

  // Profile card component
  const ProfileCard = ({ profile }: { profile: any }) => {
    const leadGenCount = leadGenAssignments?.filter(
      (assignment: any) => assignment.profileId === profile.id
    ).length || 0;

    const salesCount = salesAssignments?.filter(
      (assignment: any) => assignment.profileId === profile.id
    ).length || 0;

    return (
      <div className="border rounded-md p-4 hover:border-primary transition-colors">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{profile.name}</h4>
          <MoreHorizontal className="h-5 w-5 text-neutral-medium" />
        </div>
        <p className="text-sm text-neutral-medium mt-2">{profile.description}</p>
        <div className="mt-3 flex items-center text-sm text-neutral-medium">
          <span className="material-icons text-sm mr-1">person</span>
          <span>
            {leadGenCount > 0
              ? `Assigned to ${leadGenCount} lead gen team member${
                  leadGenCount > 1 ? "s" : ""
                }`
              : "Not assigned to lead gen team"}
          </span>
        </div>
        <div className="mt-1 flex items-center text-sm text-neutral-medium">
          <span className="material-icons text-sm mr-1">people</span>
          <span>
            {salesCount > 0
              ? `Assigned to ${salesCount} sales coordinator${
                  salesCount > 1 ? "s" : ""
                }`
              : "Not assigned to sales coordinators"}
          </span>
        </div>
      </div>
    );
  };

  // Handle form submissions
  const onLeadGenSubmit = (data: AssignLeadGenFormData) => {
    assignLeadGenMutation.mutate(data);
  };

  const onSalesSubmit = (data: AssignSalesFormData) => {
    assignSalesMutation.mutate(data);
  };

  // Loading state
  if (
    isLoadingLeadGen ||
    isLoadingSales ||
    isLoadingProfiles ||
    isLoadingLeadGenUsers ||
    isLoadingSalesUsers
  ) {
    return (
      <DashboardLayout title="Profile Assignment">
        <Loading />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile Assignment">
      <div className="flex justify-between items-center mb-6">
        <div></div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsLeadGenDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign to Lead Gen Team
          </Button>
          <Button
            onClick={() => setIsSalesDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign to Sales Coordinator
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Lead Generation Team Assignments</h3>
            
            <DataTable 
              columns={leadGenColumns} 
              data={leadGenAssignments || []} 
              searchable
              searchField="user.name"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Sales Coordinator Assignments</h3>
            
            <DataTable 
              columns={salesColumns} 
              data={salesAssignments || []} 
              searchable
              searchField="user.name"
            />
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white shadow mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Available Profiles</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles?.map((profile: any) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Gen Assignment Dialog */}
      <Dialog open={isLeadGenDialogOpen} onOpenChange={setIsLeadGenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Profile to Lead Generation Team Member</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={leadGenForm.handleSubmit(onLeadGenSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="leadGenUser">Select Team Member</Label>
                <Select 
                  onValueChange={(value) => leadGenForm.setValue("userId", value)}
                  value={leadGenForm.watch("userId")}
                >
                  <SelectTrigger id="leadGenUser">
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
                {leadGenForm.formState.errors.userId && (
                  <p className="text-sm text-red-500">
                    {leadGenForm.formState.errors.userId.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="leadGenProfile">Select Profile</Label>
                <Select 
                  onValueChange={(value) => leadGenForm.setValue("profileId", value)}
                  value={leadGenForm.watch("profileId")}
                >
                  <SelectTrigger id="leadGenProfile">
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
                {leadGenForm.formState.errors.profileId && (
                  <p className="text-sm text-red-500">
                    {leadGenForm.formState.errors.profileId.message}
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsLeadGenDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={assignLeadGenMutation.isPending}
              >
                {assignLeadGenMutation.isPending ? "Saving..." : "Save Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sales Assignment Dialog */}
      <Dialog open={isSalesDialogOpen} onOpenChange={setIsSalesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Profiles to Sales Coordinator</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={salesForm.handleSubmit(onSalesSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="salesUser">Select Sales Coordinator</Label>
                <Select 
                  onValueChange={(value) => salesForm.setValue("userId", value)}
                  value={salesForm.watch("userId")}
                >
                  <SelectTrigger id="salesUser">
                    <SelectValue placeholder="Select a sales coordinator" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesUsers?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {salesForm.formState.errors.userId && (
                  <p className="text-sm text-red-500">
                    {salesForm.formState.errors.userId.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Select Profiles</Label>
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                  <div className="space-y-3">
                    {profiles?.map((profile: any) => (
                      <div className="flex items-center space-x-2" key={profile.id}>
                        <Checkbox 
                          id={`profile-${profile.id}`}
                          onCheckedChange={(checked) => {
                            const profileIds = salesForm.watch("profileIds") || [];
                            const profileIdStr = profile.id.toString();
                            
                            // If checked, add to array; if unchecked, remove from array
                            if (checked) {
                              if (!profileIds.includes(profileIdStr)) {
                                salesForm.setValue("profileIds", [...profileIds, profileIdStr]);
                              }
                            } else {
                              salesForm.setValue(
                                "profileIds", 
                                profileIds.filter((id: string) => id !== profileIdStr)
                              );
                            }
                          }}
                          checked={salesForm.watch("profileIds")?.includes(profile.id.toString())}
                        />
                        <label
                          htmlFor={`profile-${profile.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {profile.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {salesForm.formState.errors.profileIds && (
                  <p className="text-sm text-red-500">
                    {salesForm.formState.errors.profileIds.message}
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSalesDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={assignSalesMutation.isPending}
              >
                {assignSalesMutation.isPending ? "Saving..." : "Save Assignments"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
