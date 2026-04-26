import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Bell, Search, ChevronDown, User, Settings as SettingsIcon, LogOut, CalendarDays, Receipt, Package, CheckCircle, X, Loader2, FileText } from "lucide-react";
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
import * as documentService from "@/services/documentService";
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
        id: `booking-${b?.id}`,
        title: `New booking: ${b?.client_name ?? 'Unnamed'}`,
        time: b?.created_at ?? new Date().toISOString(),
        icon: CalendarDays,
        color: "text-blue-500",
        path: "/events"
      }));

      // 2. Pending Expense Approvals
      const allExpenses = await financeService.getExpenses();
      (allExpenses ?? []).filter(e => e?.status === 'pending').slice(0, 3).forEach(e => alerts.push({
        id: `expense-${e?.id}`,
        title: `Pending approval: ${e?.description ?? 'Unnamed Expense'}`,
        time: e?.created_at ?? new Date().toISOString(),
        icon: Receipt,
        color: "text-rose-500",
        path: "/expenses"
      }));

      // 3. Low Inventory Alerts
      const inventoryItems = await inventoryService.getInventoryItems();
      (inventoryItems ?? []).filter(i => (Number(i?.current_stock ?? 0)) <= (Number(i?.min_stock_level ?? 0))).slice(0, 3).forEach(i => alerts.push({
        id: `inv-${i?.id}`,
        title: `Low stock: ${i?.name ?? 'Unnamed Item'}`,
        time: i?.created_at ?? new Date().toISOString(),
        icon: Package,
        color: "text-orange-500",
        path: "/inventory"
      }));

      // 4. Pending Leave Requests
      const leaves = await hrService.getLeaves();
      (leaves ?? []).filter(l => l?.status === 'pending').slice(0, 3).forEach(l => alerts.push({
        id: `leave-${l?.id}`,
        title: `Leave request: ${l?.leave_type ?? 'Pending'}`,
        time: l?.created_at ?? new Date().toISOString(),
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
      const [bookings, staff, expenses, docs] = await Promise.all([
        eventService.searchBookings(val),
        hrService.searchStaff(val),
        financeService.searchExpenses(val),
        documentService.searchDocuments(val)
      ]);

      bookings?.forEach(b => results.push({ type: 'Booking', title: b?.client_name ?? 'Unnamed', sub: `${b?.event_type ?? 'Event'} @ ${b?.venue ?? '-'}`, path: '/events', icon: CalendarDays }));
      staff?.forEach(s => results.push({ type: 'Staff', title: s?.name ?? 'Unnamed', sub: `${s?.role ?? 'Staff'} | ${s?.department ?? '-'}`, path: '/hr-staff', icon: User }));
      expenses?.forEach(e => results.push({ type: 'Expense', title: e?.description ?? 'Unnamed', sub: `${e?.category ?? '-'} | ₨ ${(Number(e?.amount ?? 0)).toLocaleString()}`, path: '/expenses', icon: Receipt }));
      docs?.forEach(d => results.push({ type: 'Document', title: d?.doc_number ?? 'Unnamed', sub: `${d?.client_company ?? '-'} | ${d?.event_name ?? '-'}`, path: '/documents', icon: FileText }));


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
    <header className="sticky top-0 z-30 flex h-12 sm:h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 sm:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="hidden sm:block">
          <h2 className="text-lg font-black tracking-tight text-slate-900">{pageTitle}</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {format(new Date(), "EEEE, MMMM do")}
          </p>
        </div>

        <div className="relative group hidden sm:flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            ref={searchRef}
            placeholder="Search everything..."
            className="w-[200px] lg:w-[300px] pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
            value={globalSearch}
            onChange={(e) => handleGlobalSearch(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
          />
        </div>

        <button 
          className="flex sm:hidden h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 lg:hidden"
          onClick={() => navigate("/search")}
        >
          <Search className="h-5 w-5" />
        </button>
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
