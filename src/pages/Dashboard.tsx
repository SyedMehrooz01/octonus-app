import { useState, useEffect, memo, useMemo } from "react";
import { 
  CalendarDays, 
  Users, 
  Landmark, 
  Clock, 
  Plus, 
  Receipt, 
  CheckCircle, 
  Wallet, 
  ArrowRight, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  Package 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfToday, endOfToday, addDays, subMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Dashboard = () => {
  const { canDo, hasAccess, logAction } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [attendanceMissing, setAttendanceMissing] = useState(false);
  
  // Stats state
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [paymentsDue, setPaymentsDue] = useState(0);
  const [lowInventoryCount, setLowInventoryCount] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);
  const [thisMonthExpenses, setThisMonthExpenses] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState("0%");

  // Table state
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const today = startOfToday().toISOString();
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const monthStart = startOfMonth(new Date()).toISOString();
        const monthEnd = endOfMonth(new Date()).toISOString();
        const prevMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
        const prevMonthEnd = endOfMonth(subMonths(new Date(), 1)).toISOString();

        // 1. Fetch Total Events
        const { count: totalEvents } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'cancelled');
        setTotalEventsCount(totalEvents || 0);

        // 2. Fetch Upcoming Events Count
        const { count: upcomingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('event_date', todayStr)
          .neq('status', 'cancelled');
        setUpcomingEventsCount(upcomingCount || 0);

        // 3. Fetch Payments Due (Balance Remaining)
        const { data: balanceData } = await supabase
          .from('bookings')
          .select('balance_due')
          .neq('status', 'cancelled')
          .gt('balance_due', 0);
        const totalDue = (balanceData ?? []).reduce((sum, e) => sum + (e?.balance_due ?? 0), 0);
        setPaymentsDue(totalDue);

        // 4. Fetch Low Inventory Alerts
        const { data: inventoryData } = await supabase
          .from('inventory_items')
          .select('id, stock, min_stock');
        const lowStock = (inventoryData ?? []).filter(i => (i?.stock ?? 0) <= (i?.min_stock ?? 0)).length;
        setLowInventoryCount(lowStock);

        // 5. Fetch Active Staff Count
        const { count: staffCount } = await supabase
          .from('staff')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        setActiveStaffCount(staffCount ?? 0);

        // 6. Check if attendance marked for today
        const { count: attendanceCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', todayStr);
        setAttendanceMissing(!attendanceCount || attendanceCount === 0);

        // 7. Fetch Month Revenue (from ledger_entries type='debit')
        const { data: monthlyPayments } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('type', 'debit')
          .gte('date', monthStart)
          .lte('date', monthEnd);
        const totalRevenue = (monthlyPayments ?? []).reduce((sum, p) => sum + (p?.amount ?? 0), 0);
        setThisMonthRevenue(totalRevenue);

        // 7.1 Fetch Month Expenses (from expenses table)
        const { data: monthlyExpensesData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('status', 'approved')
          .gte('date', monthStart)
          .lte('date', monthEnd);
        const totalExpenses = (monthlyExpensesData ?? []).reduce((sum, e) => sum + (e?.amount ?? 0), 0);
        setThisMonthExpenses(totalExpenses);

        // 7.2 Calculate Revenue Growth
        const { data: prevMonthPayments } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('type', 'debit')
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd);
        const prevRevenue = (prevMonthPayments ?? []).reduce((sum, p) => sum + (p?.amount ?? 0), 0);
        if (prevRevenue > 0) {
          const growth = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
          setRevenueGrowth(`${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`);
        } else {
          setRevenueGrowth(totalRevenue > 0 ? "+100%" : "0%");
        }

        // 8. Fetch Upcoming Events Table
        const { data: upcoming } = await supabase
          .from('bookings')
          .select(`id, client_name, event_date, total_amount, event_type, venue, status, pax, balance_due`)
          .gte('event_date', todayStr)
          .order('event_date', { ascending: true });
        setUpcomingEvents(upcoming || []);

        // 9. Fetch last 6 months revenue for chart
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const start = startOfMonth(date).toISOString();
          const end = endOfMonth(date).toISOString();
          const { data: payments } = await supabase
            .from('ledger_entries')
            .select('amount')
            .eq('type', 'debit')
            .gte('date', start)
            .lte('date', end);
          const total = (payments ?? []).reduce((sum, p) => sum + (p?.amount ?? 0), 0);
          last6Months.push({
            month: format(date, 'MMM'),
            revenue: total
          });
        }
        setRevenueData(last6Months);

        // 10. Recent Activity
        const activity = [];
        const { data: recentBookings } = await supabase
          .from('bookings')
          .select('client_name, created_at, event_type')
          .order('created_at', { ascending: false })
          .limit(3);
        recentBookings?.forEach(b => activity.push({
          type: 'booking',
          title: `New booking: ${b.client_name}`,
          time: b.created_at,
          icon: CalendarDays,
          color: 'text-blue-500'
        }));

        const { data: recentPayments } = await supabase
          .from('ledger_entries')
          .select('amount, date, description')
          .eq('type', 'debit')
          .order('date', { ascending: false })
          .limit(3);
        recentPayments?.forEach(p => activity.push({
          type: 'payment',
          title: `Payment: ${p.description} (₨ ${p.amount.toLocaleString()})`,
          time: p?.date,
          icon: Wallet,
          color: 'text-emerald-500'
        }));

        const { data: recentAttendance } = await supabase
          .from('attendance')
          .select('id, date, status, staff(name)')
          .order('date', { ascending: false })
          .limit(3);
        recentAttendance?.forEach(a => activity.push({
          type: 'attendance',
          title: `Attendance marked for ${(a as any).staff?.name}: ${a?.status}`,
          time: a?.date,
          icon: CheckCircle,
          color: 'text-violet-500'
        }));

        setRecentActivity(activity.sort((a, b) => new Date(b?.time ?? 0).getTime() - new Date(a?.time ?? 0).getTime()).slice(0, 6));

        setLoading(false);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        toast.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "New Event Booking":
        navigate("/events");
        break;
      case "Add Expense":
        navigate("/expenses");
        break;
      case "Mark Attendance":
        navigate("/hr?tab=attendance");
        break;
      case "Generate Payroll":
        navigate("/hr?tab=payroll");
        break;
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
      setUpcomingEvents(prev => prev.filter(e => e.id !== id));
      toast.success("Event deleted successfully");
      logAction("Deleted an event from dashboard", "Dashboard");
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const filteredEvents = useMemo(() => {
    return (upcomingEvents ?? []).filter(e => 
      e?.client_name?.toLowerCase().includes((search ?? "").toLowerCase()) ||
      e?.event_type?.toLowerCase().includes((search ?? "").toLowerCase()) ||
      e?.venue?.toLowerCase().includes((search ?? "").toLowerCase())
    );
  }, [upcomingEvents, search]);

  const totalPages = Math.ceil((filteredEvents ?? []).length / itemsPerPage);
  const paginatedEvents = (filteredEvents ?? []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmed') return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold">Confirmed</Badge>;
    if (s === 'pending') return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold">Pending</Badge>;
    if (s === 'tentative') return <Badge className="bg-gray-400 hover:bg-gray-500 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold">Tentative</Badge>;
    if (s === 'cancelled') return <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold">Cancelled</Badge>;
    return <Badge variant="outline" className="px-3 py-1 rounded-lg font-bold">{status}</Badge>;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Welcome to Octonus Solutions!</h1>
          <p className="text-slate-500 font-bold mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-500">
          {attendanceMissing && (
            <Badge className="bg-rose-500 hover:bg-rose-600 text-white animate-pulse flex items-center gap-1.5 py-2.5 px-5 rounded-xl shadow-lg shadow-rose-500/20 border-none font-bold">
              <Clock className="h-4 w-4" /> Attendance Missing
            </Badge>
          )}
          {lowInventoryCount > 0 && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white animate-pulse flex items-center gap-1.5 py-2.5 px-5 rounded-xl shadow-lg shadow-orange-500/20 border-none font-bold">
              <AlertTriangle className="h-4 w-4" /> {lowInventoryCount} Low Stock Items
            </Badge>
          )}
          <div className="hidden lg:flex items-center gap-2 text-xs font-black text-slate-500 bg-white border border-slate-200/60 px-5 py-3 rounded-xl shadow-sm">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            {format(new Date(), 'EEEE, MMMM do, yyyy').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Upcoming Events */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 shadow-xl shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/30">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
              <CalendarDays className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-100/80 uppercase tracking-widest">Upcoming Events</p>
              <h3 className="text-4xl font-black text-white mt-1 tracking-tight">{(upcomingEventsCount ?? 0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
            <CalendarDays size={160} className="text-white" />
          </div>
        </div>

        {/* Payments Due */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-6 shadow-xl shadow-emerald-400/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-400/30">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
              <span className="text-3xl font-black text-white italic">₨</span>
            </div>
            <div>
              <p className="text-xs font-black text-emerald-50/80 uppercase tracking-widest">Payments Due</p>
              <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₨ {(paymentsDue ?? 0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
            <Landmark size={160} className="text-white" />
          </div>
        </div>

        {/* Month Expenses */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 p-6 shadow-xl shadow-rose-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-rose-500/30">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
              <TrendingDown className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-50/80 uppercase tracking-widest">Month Expenses</p>
              <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₨ {(thisMonthExpenses ?? 0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
            <Receipt size={160} className="text-white" />
          </div>
        </div>

        {/* Active Staff */}
        <div className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-200/60">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 shadow-inner">
              <Users className="h-7 w-7 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Staff</p>
              <h3 className="text-4xl font-black text-[#0f172a] mt-1 tracking-tight">{(activeStaffCount ?? 0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
            <Users size={160} className="text-slate-900" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Table Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-500">
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input 
                placeholder="Search events..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 font-bold transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-12 rounded-xl border-slate-200 font-black px-6 gap-2 hover:bg-slate-50 transition-all shadow-sm">
                <Filter className="h-4 w-4 text-slate-500" /> FILTER
              </Button>
              {canDo('add') && (
                <Button onClick={() => navigate("/events")} className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6 gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5">
                  <Plus className="h-5 w-5" /> ADD BOOKING
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Event & Client</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Guests</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Syncing Intelligence...</p>
                        </div>
                      </td>
                    </tr>
                  ) : (paginatedEvents ?? []).length > 0 ? (
                    (paginatedEvents ?? []).map((event, idx) => (
                      <tr key={event?.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/40 transition-all duration-200 group`}>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-black text-sm shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform duration-300">
                              {event?.event_type?.[0]?.toUpperCase() || 'E'}
                            </div>
                            <div>
                              <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-blue-600 transition-colors">{event?.client_name}</p>
                              <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-tighter flex items-center gap-2">
                                <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                                {event?.event_type} • {event?.venue}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-600 tracking-tight">{event?.event_date ? format(new Date(event.event_date), 'MMM dd, yyyy') : "N/A"}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{event?.event_date ? format(new Date(event.event_date), 'EEEE') : ""}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <Badge variant="outline" className="rounded-lg border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm">
                            {event?.pax ?? 0} GUESTS
                          </Badge>
                        </td>
                        <td className="px-6 py-6">
                          {getStatusBadge(event?.status)}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50 hover:text-blue-700 shadow-sm" onClick={() => navigate(`/events?id=${event?.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canDo('edit') && (
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-100/50 hover:text-emerald-700 shadow-sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDo('delete') && (
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-100/50 hover:text-rose-600 shadow-sm" onClick={() => handleDeleteEvent(event?.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                            <Search className="h-8 w-8 text-slate-200" />
                          </div>
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Showing {Math.min((filteredEvents ?? []).length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min((filteredEvents ?? []).length, currentPage * itemsPerPage)} of {(filteredEvents ?? []).length} results
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="rounded-xl border-slate-200 bg-white font-black h-10 px-6 disabled:opacity-40 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                  >
                    PREVIOUS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="rounded-xl border-slate-200 bg-white font-black h-10 px-6 disabled:opacity-40 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                  >
                    NEXT
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          {/* Revenue Chart Widget */}
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Revenue Analytics</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Performance Matrix</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                    dy={12}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', radius: 8 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 900, fontSize: '11px', padding: '12px' }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={32}>
                    {(revenueData ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === (revenueData ?? []).length - 1 ? '#2563eb' : '#e2e8f0'} className="transition-all duration-500" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MTD REVENUE</p>
                <p className="text-xl font-black text-[#0f172a] mt-0.5">₨ {(thisMonthRevenue ?? 0).toLocaleString()}</p>
              </div>
              <Badge className={`px-3 py-1 font-black text-[10px] border-none ${revenueGrowth.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {revenueGrowth}
              </Badge>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Operational Pulse</h3>
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="space-y-7">
              {(recentActivity ?? []).map((activity, i) => (
                <div key={i} className="flex gap-4 group cursor-default">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 transition-all duration-300 group-hover:bg-white group-hover:shadow-lg group-hover:scale-110 border border-transparent group-hover:border-slate-100`}>
                    <activity.icon className={`h-5 w-5 ${activity.color ?? ""}`} />
                  </div>
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <p className="text-[13px] font-black text-slate-700 leading-snug group-hover:text-blue-600 transition-colors">{activity.title}</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-slate-300" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{activity.time ? format(new Date(activity.time), 'MMM dd, HH:mm') : "N/A"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-8 rounded-xl font-black text-[11px] text-blue-600 uppercase tracking-widest hover:bg-blue-50 gap-2 h-11">
              VIEW ALL AUDITS <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Dashboard);
