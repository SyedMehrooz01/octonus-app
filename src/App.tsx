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
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, page }: { children: React.ReactNode; page: string }) => {
  const { user, hasAccess } = useAuth();
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
  const { user } = useAuth();
  return (
    <Suspense fallback={null}>
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
