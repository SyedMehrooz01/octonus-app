import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";

const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const HRStaff = lazy(() => import("@/pages/HRStaff"));
const EventBooking = lazy(() => import("@/pages/EventBooking"));
const Finance = lazy(() => import("@/pages/Finance"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Documents = lazy(() => import("@/pages/Documents"));
const FileManager = lazy(() => import("@/pages/FileManager"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, page }: { children: React.ReactNode; page: string }) => {
  const { user, loading, hasAccess } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAccess(page)) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    </div>
  );
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Application...</p>
      </div>
    </div>
  );
  
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading secure resources...</p>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute page="hr"><HRStaff /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute page="events"><EventBooking /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute page="finance"><Finance /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute page="inventory"><Inventory /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute page="expenses"><Expenses /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute page="documents"><Documents /></ProtectedRoute>} />
          <Route path="/files" element={<ProtectedRoute page="files"><FileManager /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute page="settings"><SettingsPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
