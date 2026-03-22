import { useState, useMemo } from "react";
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
import TopHeader from "@/components/TopHeader";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { to: "/hr", label: "HR & Staff", icon: Users, page: "hr" },
  { to: "/events", label: "Event Booking", icon: CalendarDays, page: "events" },
  { to: "/finance", label: "Finance", icon: Landmark, page: "finance" },
  { to: "/inventory", label: "Inventory", icon: Package, page: "inventory" },
  { to: "/expenses", label: "Expenses", icon: Receipt, page: "expenses" },
  { to: "/documents", label: "Documents", icon: FileText, page: "documents" },
  { to: "/files", label: "File Manager", icon: FolderOpen, page: "files" },
  { to: "/settings", label: "Settings", icon: Settings, page: "settings" },
];

const AppLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAccess } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const accessibleNav = navItems.filter(item => hasAccess(item.page));
  
  const filteredNav = useMemo(() => {
    if (!sidebarSearch.trim()) return accessibleNav;
    return accessibleNav.filter(item => 
      item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [accessibleNav, sidebarSearch]);

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col items-center justify-center pt-6 pb-2 px-6 mb-2">
        <Logo size="sm" className="mb-1 scale-75" />
        <div className="text-center">
          <h1 className="text-base font-black text-white tracking-tight leading-tight">{BRAND_NAME}</h1>
          <p className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest mt-0.5">Management Suite</p>
        </div>
      </div>

      {/* User info section */}
      {user && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-inner">
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

      <nav className="flex-1 space-y-1 px-4 overflow-y-auto hide-scrollbar-on-idle pb-4">
        {filteredNav.length > 0 ? (
          filteredNav.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-bold transition-all duration-300 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-x-1"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white hover:translate-x-1"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 flex-shrink-0 transition-all duration-300 ${isActive ? "scale-110 rotate-3" : "group-hover:scale-110 group-hover:rotate-3"}`} />
                <span className="tracking-wide">{item.label}</span>
              </NavLink>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-3">
              <Search className="h-5 w-5 text-blue-100/20" />
            </div>
            <p className="text-[11px] font-bold text-blue-100/40 uppercase tracking-widest">No results</p>
          </div>
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5 bg-[#0f172a]/50">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-bold text-rose-300/70 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-400 group"
        >
          <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Logout System
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-[#0f172a] text-white fixed top-0 left-0 h-full z-40 border-r border-white/5">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col md:ml-64 overflow-hidden">
        <TopHeader onMenuClick={() => setMobileNavOpen(true)} user={user} onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-[#0f172a] p-0 text-white border-none flex flex-col">
          <SidebarContent onClose={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AppLayout;
