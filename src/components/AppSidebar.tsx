import { memo, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Landmark, Package, Receipt, FileText, FolderOpen, Settings, LogOut, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const navItems = [
  { id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "hr", to: "/hr", label: "HR & Staff", icon: Users },
  { id: "events", to: "/events", label: "Event Booking", icon: CalendarDays },
  { id: "finance", to: "/finance", label: "Finance", icon: Landmark },
  { id: "inventory", to: "/inventory", label: "Inventory", icon: Package },
  { id: "expenses", to: "/expenses", label: "Expenses", icon: Receipt },
  { id: "documents", to: "/documents", label: "Documents", icon: FileText },
  { id: "files", to: "/files", label: "File Manager", icon: FolderOpen },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  onLogout?: () => void;
  onItemClick?: () => void;
}

const AppSidebar = ({ onLogout, onItemClick }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAccess } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    if (onLogout) onLogout();
    if (onItemClick) onItemClick();
  };

  const filteredNavItems = useMemo(() => navItems.filter(item => hasAccess(item.id)), [hasAccess]);

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white">
      {/* Brand Logo */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-white/5 bg-[#1e293b]/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tighter text-white leading-tight">Octonus Solutions</h1>
            <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest">Enterprise HRMS</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-white/40 hover:text-white hover:bg-white/10 rounded-xl"
          onClick={() => onItemClick?.()}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* User Profile Section */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-3 px-3 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
          <Avatar className="h-10 w-10 border-2 border-blue-500/30">
            <AvatarFallback className="bg-blue-600 text-white font-black text-xs uppercase">
              {user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white truncate leading-none">{user?.name || "Admin User"}</p>
            <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-tighter mt-1.5">{user?.role || "Administrator"}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-4 py-2 overflow-y-auto custom-scrollbar">
        <p className="px-4 mb-3 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Main Menu</p>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onItemClick?.()}
              className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/5 bg-[#1e293b]/10">
        <button
          onClick={() => handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-black text-white/40 transition-all hover:bg-rose-500/10 hover:text-rose-400 group"
        >
          <div className="p-2 rounded-lg bg-white/5 group-hover:bg-rose-500/20 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="uppercase tracking-widest text-[11px]">Logout Session</span>
        </button>
      </div>
    </div>
  );
};

export default memo(AppSidebar);
