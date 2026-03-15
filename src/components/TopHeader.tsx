import { Menu, Bell, LogOut } from "lucide-react";
import { BRAND_NAME, BRAND_INITIALS } from "@/constants";
import { useLocation } from "react-router-dom";
import { navItems } from "@/components/AppSidebar";

interface TopHeaderProps {
  onMenuClick: () => void;
  user?: any;
  onLogout?: () => void;
}

const TopHeader = ({ onMenuClick, user, onLogout }: TopHeaderProps) => {
  const location = useLocation();
  const currentPage = navItems.find(item => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));
  const pageTitle = currentPage?.label || "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3 md:hidden">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-[10px] sm:text-xs font-bold text-primary-foreground">{BRAND_INITIALS}</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-primary truncate max-w-[100px]">{BRAND_NAME}</span>
        </div>
        <h2 className="hidden text-sm font-semibold text-foreground md:block">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <Bell className="h-4 w-4" />
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-foreground truncate max-w-[80px] sm:max-w-none">{user.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary text-[10px] sm:text-xs font-bold text-primary-foreground">
              {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
