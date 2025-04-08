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
import { Plus, Edit, Trash2, FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

// Validation schema for profiles
const profileSchema = z.object({
  name: z.string().min(1, "Profile name is required"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  resumeContent: z.string().min(10, "Resume content is required and must be detailed").transform(value => 
    value.trim() === "" ? null : value
  )
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ManageProfilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [isViewResumeDialogOpen, setIsViewResumeDialogOpen] = useState(false);
  const [resumeToView, setResumeToView] = useState<string | null>(null);

  // Form handling
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      description: "",
      resumeContent: ""
    },
  });

  // Query to fetch profiles
  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<any[]>({
    queryKey: ["/api/profiles"],
  });

  // Mutation to create a new profile
  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("POST", "/api/profiles", {
        ...data,
        createdBy: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setIsProfileDialogOpen(false);
      profileForm.reset();
      toast({
        title: "Profile created",
        description: "New profile has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update an existing profile
  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProfileFormData }) => {
      return apiRequest("PATCH", `/api/profiles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setIsProfileDialogOpen(false);
      profileForm.reset();
      toast({
        title: "Profile updated",
        description: "Profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a profile
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setIsDeleteDialogOpen(false);
      setSelectedProfileId(null);
      toast({
        title: "Profile deleted",
        description: "Profile has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onSubmitProfile = (data: ProfileFormData) => {
    // Ensure resume content is not empty
    if (!data.resumeContent || data.resumeContent.trim() === "") {
      toast({
        title: "Resume content required",
        description: "Please enter resume content before submitting",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedProfileId) {
      updateProfileMutation.mutate({ id: selectedProfileId, data });
    } else {
      createProfileMutation.mutate(data);
    }
  };

  // Function to open the edit dialog with profile data
  const handleEditProfile = (profile: any) => {
    setSelectedProfileId(profile.id);
    profileForm.reset({
      name: profile.name,
      description: profile.description,
      resumeContent: profile.resumeContent || ""
    });
    setIsProfileDialogOpen(true);
  };

  // Function to open the delete confirmation dialog
  const handleDeleteProfile = (profileId: number) => {
    setSelectedProfileId(profileId);
    setIsDeleteDialogOpen(true);
  };

  // Function to view resume content
  const handleViewResume = (resumeContent: string) => {
    setResumeToView(resumeContent);
    setIsViewResumeDialogOpen(true);
  };

  // Function to create a downloadable resume
  const handleDownloadResume = (profile: any) => {
    const resumeContent = profile.resumeContent;
    if (!resumeContent) {
      toast({
        title: "Resume not available",
        description: "This profile doesn't have a resume to download.",
        variant: "destructive"
      });
      return;
    }

    const blob = new Blob([resumeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/\s+/g, '_')}_resume.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Profile table columns
  const profileColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Profile Name",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return description.length > 100 
          ? description.slice(0, 100) + "..." 
          : description;
      }
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.original.createdAt ? new Date(row.original.createdAt) : null;
        return date ? format(date, "MMM d, yyyy") : "N/A";
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => row.original.resumeContent ? handleViewResume(row.original.resumeContent) : toast({
              title: "No resume content",
              description: "This profile doesn't have resume content to view",
              variant: "destructive"
            })}
          >
            <FileText className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadResume(row.original)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditProfile(row.original)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500"
            onClick={() => handleDeleteProfile(row.original.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Loading state
  if (isLoadingProfiles) {
    return (
      <DashboardLayout title="Manage Profiles">
        <Loading />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manage Profiles">
      <div className="flex justify-between items-center mb-6">
        <p className="text-neutral-medium">
          Create and manage profiles with attached resumes for your team
        </p>
        <Button
          onClick={() => {
            setSelectedProfileId(null);
            profileForm.reset({
              name: "",
              description: "",
              resumeContent: ""
            });
            setIsProfileDialogOpen(true);
          }}
          className="flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Profile
        </Button>
      </div>

      <Card className="bg-white shadow mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Profiles</h3>
          
          <DataTable 
            columns={profileColumns} 
            data={profiles || []} 
            searchable
            searchField="name"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProfileId ? "Edit Profile" : "Create New Profile"}</DialogTitle>
            <DialogDescription>
              {selectedProfileId 
                ? "Update the profile information and resume content." 
                : "Enter profile details and the resume content for this profile."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Full Stack Developer"
                  {...profileForm.register("name")}
                />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this profile's qualifications and purpose"
                  rows={3}
                  {...profileForm.register("description")}
                />
                {profileForm.formState.errors.description && (
                  <p className="text-sm text-red-500">
                    {profileForm.formState.errors.description.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resumeContent">Resume Content</Label>
                <Textarea
                  id="resumeContent"
                  placeholder="Paste the full resume content here"
                  rows={10}
                  className="font-mono text-sm"
                  {...profileForm.register("resumeContent")}
                />
                {profileForm.formState.errors.resumeContent && (
                  <p className="text-sm text-red-500">
                    {profileForm.formState.errors.resumeContent.message}
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsProfileDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
              >
                {createProfileMutation.isPending || updateProfileMutation.isPending
                  ? "Saving..."
                  : selectedProfileId
                  ? "Update Profile"
                  : "Create Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => selectedProfileId && deleteProfileMutation.mutate(selectedProfileId)}
              disabled={deleteProfileMutation.isPending}
            >
              {deleteProfileMutation.isPending ? "Deleting..." : "Delete Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Resume Dialog */}
      <Dialog open={isViewResumeDialogOpen} onOpenChange={setIsViewResumeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Resume Content</DialogTitle>
          </DialogHeader>
          
          <div className="bg-gray-50 p-4 rounded border font-mono text-sm whitespace-pre-wrap">
            {resumeToView}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => setIsViewResumeDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}