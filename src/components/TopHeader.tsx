import { Menu, Bell, Search, ChevronDown, User, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { navItems } from "@/layouts/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md px-6 shadow-sm">
      <div className="flex items-center gap-6 flex-1">
        <button
          onClick={onMenuClick}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 border border-slate-100 md:hidden transition-colors shadow-sm"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="hidden md:flex items-center gap-3">
          <h2 className="text-xl font-black text-[#0f172a] tracking-tight">{pageTitle}</h2>
          <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
        </div>

        {/* Search Bar */}
        <div className="hidden lg:flex relative items-center max-w-md w-full group ml-4">
          <Search className="absolute left-4 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input 
            placeholder="Search anything..." 
            className="pl-11 h-11 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 font-medium transition-all w-full shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm group">
          <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 border-2 border-white shadow-sm text-[10px] font-bold">
            3
          </Badge>
        </button>

        <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden sm:block" />

        {/* User Profile Select (Used as dropdown) */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-sm font-black text-[#0f172a] leading-none">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{user.role}</p>
            </div>
            <Select onValueChange={(v) => v === "logout" && onLogout?.()}>
              <SelectTrigger className="w-auto h-auto p-1 border-none bg-transparent focus:ring-0 shadow-none">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs uppercase shadow-sm border-2 border-white ring-2 ring-blue-50">
                  {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 min-w-[200px]">
                <div className="px-3 py-2 border-b border-slate-50 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Control</p>
                </div>
                <SelectItem value="profile" className="rounded-xl font-bold py-3">Profile Settings</SelectItem>
                <SelectItem value="settings" className="rounded-xl font-bold py-3">System Preferences</SelectItem>
                <SelectItem value="logout" className="rounded-xl font-bold py-3 text-rose-500 focus:text-rose-600 focus:bg-rose-50">Logout Session</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
