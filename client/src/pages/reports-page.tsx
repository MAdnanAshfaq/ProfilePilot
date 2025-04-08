import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { 
  BarChart2, 
  Download, 
  FileText, 
  Share, 
  Users, 
  Plus, 
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "pdf">("csv");
  
  // Get the start and end of the previous week for default values
  const previousWeekStart = startOfWeek(subDays(new Date(), 7));
  const previousWeekEnd = endOfWeek(subDays(new Date(), 7));
  
  // Reports query
  const { data: teamPerformance, isLoading: isLoadingTeamPerformance } = useQuery({
    queryKey: ["/api/team-performance"],
  });
  
  const { data: leadEntries, isLoading: isLoadingLeadEntries } = useQuery({
    queryKey: ["/api/lead-entries"],
  });
  
  // Function to download a report
  const downloadReport = (reportType: string, fileFormat: 'csv' | 'pdf') => {
    // Format dates for query parameters
    const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
    const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
    
    // Handle different report types
    if (reportType === 'team-performance') {
      window.location.href = `/api/reports/team-performance?fromDate=${fromDateStr}&toDate=${toDateStr}`;
      
      toast({
        title: "Report Downloaded",
        description: `Team Performance report downloaded in CSV format.`,
      });
    } else if (reportType === 'lead-entries') {
      window.location.href = `/api/reports/lead-entries?fromDate=${fromDateStr}&toDate=${toDateStr}`;
      
      toast({
        title: "Report Downloaded",
        description: `Lead Entries report downloaded in CSV format.`,
      });
    } else if (reportType === 'weekly-sales') {
      window.location.href = `/api/reports/weekly-sales?fromDate=${fromDateStr}&toDate=${toDateStr}`;
      
      toast({
        title: "Report Downloaded",
        description: `Weekly Sales report downloaded in the exact format.`,
      });
    } else if (reportType === 'daily') {
      // For daily report, just use the 'from' date
      window.location.href = `/api/reports/daily?date=${fromDateStr}`;
      
      toast({
        title: "Report Downloaded",
        description: `Daily report downloaded for ${format(dateRange.from, 'MMMM do, yyyy')}.`,
      });
    } else {
      toast({
        title: "Report type not supported",
        description: "This report type is not yet implemented.",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle report generation dialog
  const handleGenerateReport = () => {
    if (!reportType) {
      toast({
        title: "Report type required",
        description: "Please select a report type.",
        variant: "destructive",
      });
      return;
    }
    
    downloadReport(reportType, selectedFormat);
    setIsDialogOpen(false);
  };
  
  // Function to share a report (this would normally email or share the report)
  const shareReport = (reportId: string) => {
    toast({
      title: "Report Shared",
      description: "Report has been shared successfully.",
    });
  };
  
  // Mock report data
  const generatedReports = [
    {
      id: '1',
      title: 'Weekly Performance Report',
      date: 'July 10 - July 16, 2023',
      format: 'PDF',
      size: '2.3 MB'
    },
    {
      id: '2',
      title: 'Lead Generation Summary',
      date: 'July 3 - July 9, 2023',
      format: 'CSV',
      size: '456 KB'
    },
    {
      id: '3',
      title: 'Profile Efficiency Analysis',
      date: 'June 26 - July 2, 2023',
      format: 'PDF',
      size: '1.8 MB'
    }
  ];
  
  // Report templates
  const reportTemplates = [
    {
      id: 'team-performance',
      title: 'Team Performance',
      description: 'Jobs fetched, applied, and success rate',
      icon: <FileText className="text-primary" />
    },
    {
      id: 'lead-entries',
      title: 'Lead Generation Summary',
      description: 'New leads, conversion rates, rejections',
      icon: <Users className="text-green-500" />
    },
    {
      id: 'weekly-sales',
      title: 'Weekly Sales Report',
      description: 'Weekly sales report in the exact required format',
      icon: <BarChart2 className="text-blue-500" />
    },
    {
      id: 'daily',
      title: 'Daily Report',
      description: 'Daily performance report across all profiles',
      icon: <Calendar className="text-purple-500" />
    }
  ];
  
  // Loading state
  if (isLoadingTeamPerformance || isLoadingLeadEntries) {
    return (
      <DashboardLayout title="Reports">
        <Loading />
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title="Reports">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Select defaultValue="last-week">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">Current Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Generate New Report
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Generated Reports</h3>
            </div>
            
            <div className="space-y-4">
              {generatedReports.map((report) => (
                <div key={report.id} className="border rounded-md p-4">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">{report.title}</h4>
                      <p className="text-sm text-neutral-medium mt-1">{report.date}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 p-1 bg-primary bg-opacity-10 text-primary hover:bg-opacity-20">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 p-1 bg-neutral-bg text-neutral-medium" onClick={() => shareReport(report.id)}>
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center mt-3 text-sm">
                    <span className={`px-2 py-1 ${report.format === 'PDF' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-green-500 bg-opacity-10 text-green-500'} rounded-full mr-2`}>
                      {report.format}
                    </span>
                    <span className="text-neutral-medium">{report.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Report Templates</h3>
            
            <div className="space-y-4">
              {reportTemplates.map((template) => (
                <div key={template.id} className="border rounded-md p-4 hover:border-primary transition-colors cursor-pointer" onClick={() => {
                  setReportType(template.id);
                  setIsDialogOpen(true);
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-opacity-10 rounded-md flex items-center justify-center mr-3">
                        {template.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{template.title}</h4>
                        <p className="text-sm text-neutral-medium">{template.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Generate Report Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Report</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        format(dateRange.from, "PPP")
                      ) : (
                        <span>Start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.to ? (
                        format(dateRange.to, "PPP")
                      ) : (
                        <span>End date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                      initialFocus
                      disabled={(date) => date < dateRange.from}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={selectedFormat === "csv" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSelectedFormat("csv")}
                >
                  CSV
                </Button>
                <Button
                  type="button"
                  variant={selectedFormat === "pdf" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSelectedFormat("pdf")}
                >
                  PDF
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleGenerateReport}>
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
