import { useState } from "react";
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
  ShieldCheck 
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BRAND_NAME } from "@/constants";
import TopHeader from "@/components/TopHeader";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAccess } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const accessibleNav = navItems.filter(item => hasAccess(item.page));

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center pt-8 pb-4 px-6 mb-4">
        <Logo size="sm" className="mb-2" />
        <div className="text-center">
          <h1 className="text-lg font-black text-white tracking-tight leading-tight">{BRAND_NAME}</h1>
          <p className="text-[10px] font-bold text-blue-200/50 uppercase tracking-widest mt-1">Management Suite</p>
        </div>
      </div>

      {/* User info section */}
      {user && (
        <div className="mx-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-inner">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 text-white font-black shadow-lg border border-white/20">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#0f172a] shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{user.name}</p>
              <p className="text-[10px] font-bold text-blue-200/60 uppercase tracking-tighter truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto custom-scrollbar">
        {accessibleNav.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 group ${
                isActive
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 translate-x-1"
                  : "text-blue-100/70 hover:bg-white/5 hover:text-white hover:translate-x-1"
              }`}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${isActive ? "scale-110 rotate-3" : "group-hover:scale-110 group-hover:rotate-3"}`} />
              <span className="tracking-wide">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-300/70 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-400 group"
        >
          <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
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

      <div className="flex flex-1 flex-col md:ml-64">
        <TopHeader onMenuClick={() => setMobileNavOpen(true)} user={user} onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
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
