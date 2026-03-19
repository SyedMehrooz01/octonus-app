import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProtectedRoute = ({ children, page }: { children: React.ReactNode; page?: string }) => {
  const { user, loading, hasAccess } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (page && !hasAccess(page)) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4 text-center">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button onClick={() => window.location.href = "/dashboard"} className="mt-6">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

Save the file, then run:
```
git add .
git commit -m "fix ProtectedRoute page access"
git push