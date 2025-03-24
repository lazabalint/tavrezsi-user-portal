import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  roles?: string[];
}

export function ProtectedRoute({
  path,
  component: Component,
  roles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // When checking authentication
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If roles are specified and user's role is not included
  if (roles && !roles.includes(user.role)) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <h1 className="text-2xl font-bold mb-4">Hozzáférés megtagadva</h1>
          <p className="text-gray-600 mb-6">Nincs megfelelő jogosultsága az oldal megtekintéséhez.</p>
          <a href="/" className="text-primary hover:underline">Vissza a kezdőlapra</a>
        </div>
      </Route>
    );
  }

  // User is authenticated and has the required role
  return <Route path={path} component={Component} />;
}
