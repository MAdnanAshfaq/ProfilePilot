import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProfilesPage from "@/pages/profiles-page";
import ManageProfilesPage from "@/pages/manage-profiles-page";
import TargetsPage from "@/pages/targets-page";
import ReportsPage from "@/pages/reports-page";
import MyProfilePage from "@/pages/my-profile-page";
import ProgressPage from "@/pages/progress-page";
import MyProfilesPage from "@/pages/my-profiles-page";
import LeadEntryPage from "@/pages/lead-entry-page";

function Router() {
  return (
    <Switch>
      {/* Auth route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={DashboardPage} />
      
      {/* Manager routes */}
      <ProtectedRoute path="/profiles" component={ProfilesPage} />
      <ProtectedRoute path="/manage-profiles" component={ManageProfilesPage} />
      <ProtectedRoute path="/targets" component={TargetsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      
      {/* Lead Generation Team routes */}
      <ProtectedRoute path="/my-profile" component={MyProfilePage} />
      <ProtectedRoute path="/progress" component={ProgressPage} />
      
      {/* Sales Coordinator routes */}
      <ProtectedRoute path="/my-profiles" component={MyProfilesPage} />
      <ProtectedRoute path="/lead-entry" component={LeadEntryPage} />
      
      {/* Fallback to 404 */}
      <Route path="*">{() => <NotFound />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
