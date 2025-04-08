import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, Trash2, FileText, Download, Upload, Loader2 } from "lucide-react";
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form handling
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      description: "",
      resumeContent: ""
    },
  });
  
  // PDF Upload handling
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('resumeFile', file);
      
      const response = await fetch('/api/profiles/upload-resume', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      setUploadProgress(90);
      
      if (!response.ok) {
        throw new Error('Failed to upload resume');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      
      profileForm.setValue('resumeContent', data.resumeContent);
      
      toast({
        title: "Resume uploaded",
        description: "Resume has been successfully processed.",
      });
      
      // Reset after a short delay to show 100% progress
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadProgress(0);
      
      toast({
        title: "Failed to upload resume",
        description: error.message,
        variant: "destructive",
      });
    }
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

  // Function to handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a PDF file smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      // Upload the file
      uploadResumeMutation.mutate(file);
    }
  };
  
  // Function to trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Function to download resume
  const handleDownloadResume = (profile: any) => {
    try {
      // Download original PDF from server
      window.open(`/api/profiles/${profile.id}/resume`, '_blank');
    } catch (error) {
      toast({
        title: "Resume not available",
        description: "This profile doesn't have a resume to download.",
        variant: "destructive"
      });
    }
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
                <Label>Resume Content</Label>
                
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="mb-2">
                    <TabsTrigger value="text">Text Input</TabsTrigger>
                    <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-3">
                    <Textarea
                      id="resumeContent"
                      placeholder="Paste the full resume content here"
                      rows={10}
                      className="font-mono text-sm w-full"
                      {...profileForm.register("resumeContent")}
                    />
                    {profileForm.formState.errors.resumeContent && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.resumeContent.message}
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="upload" className="space-y-3">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      
                      {isUploading ? (
                        <div className="flex flex-col items-center space-y-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-gray-500">Uploading and parsing PDF...</p>
                          <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-sm font-medium mb-1">Upload a PDF resume</p>
                          <p className="text-xs text-gray-500 mb-3">Maximum file size: 5MB</p>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleUploadClick}
                          >
                            Select PDF File
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      The PDF will be parsed and its content will be extracted automatically.
                    </p>
                  </TabsContent>
                </Tabs>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Resume Preview</DialogTitle>
            <DialogDescription>
              View the formatted resume content for this profile
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 bg-white border-b">
              <div className="prose prose-sm max-w-none">
                {resumeToView && resumeToView.split('\n').map((line, index) => {
                  // Detect technical skills to highlight
                  const techSkills = [
                    'JavaScript', 'JS', 'TypeScript', 'React', 'Vue', 'Angular', 'Node', 
                    'Express', 'MongoDB', 'SQL', 'PostgreSQL', 'MySQL', 'Python', 'Java', 
                    'C#', 'PHP', 'Ruby', 'HTML', 'CSS', 'SASS', 'SCSS', 'jQuery', 'Redux', 
                    'GraphQL', 'REST', 'API', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git',
                    'GitHub', 'GitLab', 'CI/CD', 'DevOps'
                  ];
                  
                  // Function to highlight tech skills in a line
                  const highlightTechSkills = (text: string) => {
                    let result = text;
                    techSkills.forEach(skill => {
                      // Use word boundary to match whole words only
                      const regex = new RegExp(`\\b${skill}\\b`, 'gi');
                      result = result.replace(regex, match => 
                        `<span class="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">${match}</span>`
                      );
                    });
                    return result;
                  };
                  
                  // Check if line is a header (name)
                  if (index === 0) {
                    return <h2 key={index} className="font-bold text-2xl text-gray-800 mb-1">{line}</h2>
                  }
                  
                  // Check if line is a job title
                  if (index === 1) {
                    return <h3 key={index} className="font-semibold text-lg text-gray-700 mb-3">{line}</h3>
                  }
                  
                  // Check if line contains contact info
                  if (line.includes('@') || line.includes('LinkedIn') || line.includes('Phone')) {
                    return <p key={index} className="text-sm text-gray-600 mb-4">{line}</p>
                  }
                  
                  // Check if line is a section header (like EXPERIENCE, EDUCATION, etc.)
                  if (line.trim().toUpperCase() === line.trim() && line.trim().length > 0) {
                    return <h4 key={index} className="font-bold text-lg text-gray-800 mt-6 mb-3 border-b pb-1">{line}</h4>
                  }
                  
                  // Check if line is a company/position header
                  if (line.includes('/')) {
                    const parts = line.split('/');
                    return (
                      <div key={index} className="mt-4 mb-2">
                        <p className="font-semibold text-base">{parts[0].trim()}</p>
                        <p className="text-sm text-gray-600">{parts[1].trim()}</p>
                      </div>
                    );
                  }
                  
                  // Check if line contains dates
                  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) {
                    return <p key={index} className="text-sm italic text-gray-600 mb-2">{line}</p>
                  }
                  
                  // Check if line is a bullet point
                  if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                    return (
                      <div key={index} className="flex ml-2 my-1.5">
                        <span className="mr-2 text-gray-500">•</span>
                        <span dangerouslySetInnerHTML={{ __html: highlightTechSkills(line.trim().substring(1).trim()) }} />
                      </div>
                    )
                  }
                  
                  // Regular line with tech skills highlighted
                  return (
                    <p 
                      key={index} 
                      className={line.trim() === '' ? 'my-3' : 'my-1.5'}
                      dangerouslySetInnerHTML={{ __html: highlightTechSkills(line) }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4 space-x-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => handleDownloadResume({id: selectedProfileId})}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Original PDF
            </Button>
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