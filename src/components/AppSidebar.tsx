import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Landmark, Package, Receipt, Settings, LogOut } from "lucide-react";
import { BRAND_NAME, BRAND_INITIALS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hr", label: "HR & Staff", icon: Users },
  { to: "/events", label: "Event Booking", icon: CalendarDays },
  { to: "/finance", label: "Finance", icon: Landmark },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  onLogout?: () => void;
}

const AppSidebar = ({ onLogout }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    if (onLogout) onLogout();
  };

  return (
    <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 bg-secondary text-sidebar-foreground z-10">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary flex-shrink-0">
          <span className="text-sm font-bold text-primary-foreground">{BRAND_INITIALS}</span>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-primary">{BRAND_NAME}</h1>
          <p className="text-[10px] text-sidebar-foreground/60">HRMS & Events</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        {user && (
          <div className="mb-2 px-3 py-1">
            <p className="text-xs font-medium text-sidebar-foreground/80 truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
