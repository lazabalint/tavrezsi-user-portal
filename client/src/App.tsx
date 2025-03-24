import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import DashboardPage from "@/pages/dashboard-page";
import PropertiesPage from "@/pages/properties-page";
import MetersPage from "@/pages/meters-page";
import ReadingsPage from "@/pages/readings-page";
import TenantsPage from "@/pages/tenants-page";
import CorrectionRequestsPage from "@/pages/correction-requests-page";
import ReportsPage from "@/pages/reports-page";
import UsersPage from "@/pages/users-page";
import AddUserPage from "@/pages/add-user-page";
import AddPropertyPage from "@/pages/add-property-page";
import AddMeterPage from "@/pages/add-meter-page";
import PermissionsPage from "@/pages/permissions-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/properties" component={PropertiesPage} />
      <ProtectedRoute path="/meters" component={MetersPage} />
      <ProtectedRoute path="/readings" component={ReadingsPage} />
      <ProtectedRoute path="/tenants" component={TenantsPage} />
      <ProtectedRoute path="/correction-requests" component={CorrectionRequestsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/users" component={UsersPage} roles={["admin"]} />
      <ProtectedRoute path="/add-user" component={AddUserPage} roles={["admin"]} />
      <ProtectedRoute path="/add-property" component={AddPropertyPage} roles={["admin", "owner"]} />
      <ProtectedRoute path="/add-meter" component={AddMeterPage} roles={["admin", "owner"]} />
      <ProtectedRoute path="/permissions" component={PermissionsPage} roles={["admin"]} />
      <Route component={NotFound} />
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
