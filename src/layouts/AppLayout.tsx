import { useState, useMemo, memo, useCallback } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Landmark, 
  Package, 
  Receipt, 
  FileText, 
  FolderOpen,
  Settings, 
  LogOut, 
  Menu, 
  ShieldCheck,
  Search,
  X
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BRAND_NAME } from "@/constants";
import { navItems } from "@/components/navigation";
import TopHeader from "@/components/TopHeader";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";

import ErrorBoundary from "@/components/ErrorBoundary";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAccess } = useAuth();

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const accessibleNav = useMemo(() => navItems.filter(item => hasAccess(item.page)), [hasAccess]);
  
  const filteredNav = useMemo(() => {
    if (!sidebarSearch.trim()) return accessibleNav;
    return accessibleNav.filter(item => 
      item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [accessibleNav, sidebarSearch]);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar - Mobile and Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-white shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:flex lg:flex-col
      `}>
        <AppSidebar onLogout={handleLogout} onItemClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Dark overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <TopHeader onMenuClick={() => setSidebarOpen(true)} user={user} onLogout={handleLogout} />
        <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-20">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};


export default memo(AppLayout);
