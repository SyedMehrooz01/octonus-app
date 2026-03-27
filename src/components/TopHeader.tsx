import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Bell, Search, ChevronDown, User, Settings as SettingsIcon, LogOut, CalendarDays, Receipt, Package, CheckCircle, X, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { navItems } from "@/components/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as eventService from "@/services/eventService";
import * as financeService from "@/services/financeService";
import * as inventoryService from "@/services/inventoryService";
import * as hrService from "@/services/hrService";
import { format } from "date-fns";

interface TopHeaderProps {
  onMenuClick: () => void;
  user?: any;
  onLogout?: () => void;
}

const TopHeader = ({ onMenuClick, user, onLogout }: TopHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const currentPage = navItems.find(item => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));
  const pageTitle = currentPage?.label || "Dashboard";

  const fetchNotifications = useCallback(async (isMounted = true) => {
    const alerts: any[] = [];

    try {
      // 1. New Bookings
      const newBookings = await eventService.getBookings();
      (newBookings ?? []).slice(0, 3).forEach(b => alerts.push({
        id: `booking-${b.id}`,
        title: `New booking: ${b.client_name}`,
        time: b.created_at,
        icon: CalendarDays,
        color: "text-blue-500",
        path: "/events"
      }));

      // 2. Pending Expense Approvals
      const allExpenses = await financeService.getExpenses();
      (allExpenses ?? []).filter(e => e.status === 'pending').slice(0, 3).forEach(e => alerts.push({
        id: `expense-${e.id}`,
        title: `Pending approval: ${e.description}`,
        time: new Date().toISOString(),
        icon: Receipt,
        color: "text-rose-500",
        path: "/expenses"
      }));

      // 3. Low Inventory Alerts
      const inventoryItems = await inventoryService.getInventoryItems();
      (inventoryItems ?? []).filter(i => (i.current_stock ?? 0) <= (i.min_stock_level ?? 0)).slice(0, 3).forEach(i => alerts.push({
        id: `inv-${i.id}`,
        title: `Low stock: ${i.name}`,
        time: new Date().toISOString(),
        icon: Package,
        color: "text-orange-500",
        path: "/inventory"
      }));

      // 4. Pending Leave Requests
      const leaves = await hrService.getLeaves();
      (leaves ?? []).filter(l => l.status === 'pending').slice(0, 3).forEach(l => alerts.push({
        id: `leave-${l.id}`,
        title: `Leave request: ${(l as any).leave_type ?? 'Pending'}`,
        time: new Date().toISOString(),
        icon: CheckCircle,
        color: "text-violet-500",
        path: "/hr"
      }));

      if (isMounted) {
        setNotifications(alerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8));
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchNotifications(isMounted);
    const interval = setInterval(() => fetchNotifications(isMounted), 60000); // Refresh every minute
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleGlobalSearch = async (val: string) => {
    setGlobalSearch(val);
    if (val.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);
    const results: any[] = [];

    try {
      const [bookings, staff, expenses] = await Promise.all([
        eventService.searchBookings(val),
        hrService.searchStaff(val),
        financeService.searchExpenses(val)
      ]);

      bookings?.forEach(b => results.push({ type: 'Booking', title: b.client_name, sub: b.event_type, path: '/events', icon: CalendarDays }));
      staff?.forEach(s => results.push({ type: 'Staff', title: s.name, sub: s.role, path: '/hr', icon: User }));
      expenses?.forEach(e => results.push({ type: 'Expense', title: e.description, sub: `₨ ${e.amount.toLocaleString()}`, path: '/expenses', icon: Receipt }));

      setSearchResults(results);
    } catch (err) {
      console.error("Global search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <div className="hidden lg:flex relative items-center max-w-md w-full group ml-4" ref={searchRef}>
          <Search className="absolute left-4 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input 
            placeholder="Search anything..." 
            value={globalSearch}
            onChange={(e) => handleGlobalSearch(e.target.value)}
            onFocus={() => globalSearch.length >= 2 && setShowSearchDropdown(true)}
            className="pl-11 h-11 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 font-medium transition-all w-full shadow-sm"
          />
          {globalSearch && (
            <button onClick={() => { setGlobalSearch(""); setSearchResults([]); }} className="absolute right-4 p-1 hover:bg-slate-200 rounded-full transition-colors">
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}

          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Results</p>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((res, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        navigate(res.path);
                        setShowSearchDropdown(false);
                        setGlobalSearch("");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <res.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-0.5">{res.type}</p>
                        <p className="text-sm font-black text-[#0f172a] truncate leading-tight">{res.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{res.sub}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matches found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative group">
          <button className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm group">
            <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
            {notifications.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 border-2 border-white shadow-sm text-[10px] font-bold">
                {notifications.length}
              </Badge>
            )}
          </button>
          
          <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-hidden opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h4 className="font-black text-xs uppercase tracking-widest">Notifications</h4>
              <Badge variant="outline" className="text-[9px] font-black rounded-lg">{notifications.length} NEW</Badge>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? notifications.map((notif) => (
                <button 
                  key={notif.id} 
                  onClick={() => navigate(notif.path)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                >
                  <div className={`h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <notif.icon className={`h-5 w-5 ${notif.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#0f172a] leading-tight mb-1">{notif.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{format(new Date(notif.time), 'HH:mm • MMM dd')}</p>
                  </div>
                </button>
              )) : (
                <div className="text-center py-12">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">All clear!</p>
                </div>
              )}
            </div>
            <div className="p-2 bg-slate-50/50">
              <button onClick={() => navigate('/dashboard')} className="w-full py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">View Dashboard</button>
            </div>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden sm:block" />

        {/* User Profile Select (Used as dropdown) */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-sm font-black text-[#0f172a] leading-none">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{user.role}</p>
            </div>
            <Select onValueChange={(v) => {
              if (v === "logout") onLogout?.();
              if (v === "settings") navigate("/settings");
            }}>
              <SelectTrigger className="w-auto h-auto p-1 border-none bg-transparent focus:ring-0 shadow-none">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs uppercase shadow-sm border-2 border-white ring-2 ring-blue-50">
                  {(user?.name || user?.email || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
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
