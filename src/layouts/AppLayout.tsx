import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Landmark, Package, Receipt, Settings, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { BRAND_INITIALS, BRAND_NAME } from "@/constants";
import TopHeader from "@/components/TopHeader";
import { useAuth } from "@/contexts/AuthContext";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { to: "/hr", label: "HR & Staff", icon: Users, page: "hr" },
  { to: "/events", label: "Event Booking", icon: CalendarDays, page: "events" },
  { to: "/finance", label: "Finance", icon: Landmark, page: "finance" },
  { to: "/inventory", label: "Inventory", icon: Package, page: "inventory" },
  { to: "/expenses", label: "Expenses", icon: Receipt, page: "expenses" },
  { to: "/settings", label: "Settings", icon: Settings, page: "settings" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  manager: "bg-secondary text-secondary-foreground",
  staff: "bg-accent text-accent-foreground",
  accountant: "bg-warning text-warning-foreground",
};

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
    <>
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary flex-shrink-0">
          <span className="text-sm font-bold text-primary-foreground">{BRAND_INITIALS}</span>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-primary">{BRAND_NAME}</h1>
          <p className="text-[10px] text-sidebar-foreground/60">HRMS & Events</p>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary flex-shrink-0">
              {user.avatar}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[user.role]}`}>
                <ShieldCheck className="h-2.5 w-2.5" />
                {user.role}
              </span>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {accessibleNav.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          const NavItem = (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
          return NavItem;
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-52 flex-col bg-secondary text-sidebar-foreground fixed top-0 left-0 h-full z-40">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col md:ml-52">
        <TopHeader onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-secondary p-0 text-sidebar-foreground sm:max-w-sm flex flex-col">
          <SidebarContent onClose={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AppLayout;
