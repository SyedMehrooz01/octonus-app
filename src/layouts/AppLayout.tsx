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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const SidebarContent = useCallback(({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col items-center justify-center pt-6 pb-2 px-6 mb-2">
        <Logo size="sm" className="mb-1 scale-75" />
        <div className="text-center">
          <h1 className="text-base font-black text-white tracking-tight leading-tight">{BRAND_NAME}</h1>
          <p className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest mt-0.5">Management Suite</p>
        </div>
      </div>

      {/* User info section */}
      {user && (        <div className="mx-4 mb-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 text-white font-black text-sm shadow-lg border border-white/20">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0f172a] shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-white">{user.name}</p>
              <p className="text-[9px] font-bold text-blue-200/60 uppercase tracking-tighter truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Search */}
      <div className="px-4 mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-100/40 group-focus-within:text-blue-400 transition-colors" />
          <Input 
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Search menu..." 
            className="h-9 pl-9 pr-8 bg-white/5 border-white/10 text-xs text-white placeholder:text-blue-100/30 focus-visible:ring-blue-500/50 focus-visible:bg-white/10 rounded-lg transition-all"
          />
          {sidebarSearch && (
            <button 
              onClick={() => setSidebarSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 text-blue-100/40 hover:text-white transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 pb-4 overflow-y-auto custom-scrollbar">
        <p className="px-2 mb-2 text-[10px] font-black text-blue-100/20 uppercase tracking-[0.2em]">Main Navigation</p>
        <div className="space-y-1.5">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive: linkActive }) => `
                  group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all duration-300
                  ${isActive || linkActive 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30" 
                    : "text-blue-100/60 hover:bg-white/5 hover:text-white"}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className="tracking-tight uppercase">{item.label}</span>
                </div>
                {isActive && <div className="h-1 w-1 rounded-full bg-white shadow-[0_0_8px_white]" />}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-black text-blue-100/30 transition-all hover:bg-rose-500/10 hover:text-rose-400 group"
        >
          <div className="p-2 rounded-lg bg-white/5 group-hover:bg-rose-500/20 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="uppercase tracking-widest text-[10px]">Logout Session</span>
        </button>
      </div>
    </div>
  ), [user, sidebarSearch, filteredNav, location.pathname, handleLogout]);

  return (    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:bg-[#0f172a] lg:text-white lg:shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Nav Sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 bg-[#0f172a] border-none text-white w-72">
          <SidebarContent onClose={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader onOpenNav={() => setMobileNavOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-slate-50/50 relative scroll-smooth p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};


export default memo(AppLayout);
