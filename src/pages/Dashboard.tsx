import { useState, useEffect, memo } from "react";
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Package,
  ArrowRight,
  Wallet
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SkeletonLoading from "@/components/SkeletonLoading";

const Dashboard = () => {
  const { user, canDo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    activeStaff: 0,
    attendanceToday: 0,
    lowStockItems: 0,
    pendingPayments: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [revenueGrowth, setRevenueGrowth] = useState("0%");

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const prevMonthStart = startOfMonth(subMonths(today, 1)).toISOString();
      const prevMonthEnd = endOfMonth(subMonths(today, 1)).toISOString();

      // 1. Fetch Stats in Parallel
      const results = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).neq('status', 'cancelled'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('event_date', todayStr).neq('status', 'cancelled'),
        supabase.from('bookings').select('balance_due').neq('status', 'cancelled').gt('balance_due', 0).limit(50),
        supabase.from('inventory_items').select('id, stock, min_stock').limit(50),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', todayStr),
        supabase.from('ledger_entries').select('amount').eq('type', 'debit').gte('date', monthStart).lte('date', monthEnd).limit(50),
        supabase.from('expenses').select('amount').eq('status', 'approved').gte('date', monthStart).lte('date', monthEnd).limit(50)
      ]);

      const [
        { count: totalEvents, error: err1 },
        { count: upcomingCount, error: err2 },
        { data: balanceData, error: err3 },
        { data: inventoryData, error: err4 },
        { count: staffCount, error: err5 },
        { count: attendanceCount, error: err6 },
        { data: monthlyPayments, error: err7 },
        { data: monthlyExpensesData, error: err8 }
      ] = results;

      if (err1) console.error("Error fetching total events:", err1);
      if (err2) console.error("Error fetching upcoming events count:", err2);
      if (err3) console.error("Error fetching balance data:", err3);
      if (err4) console.error("Error fetching inventory data:", err4);
      if (err5) console.error("Error fetching staff count:", err5);
      if (err6) console.error("Error fetching attendance count:", err6);
      if (err7) console.error("Error fetching monthly payments:", err7);
      if (err8) console.error("Error fetching monthly expenses:", err8);

      const thisMonthRevenue = (monthlyPayments ?? []).reduce((sum, p) => sum + (p?.amount ?? 0), 0);
      const thisMonthExpenses = (monthlyExpensesData ?? []).reduce((sum, e) => sum + (e?.amount ?? 0), 0);
      const lowStock = (inventoryData ?? []).filter(item => (item?.stock ?? 0) <= (item?.min_stock ?? 0)).length;
      const pendingPay = (balanceData ?? []).reduce((sum, b) => sum + (b?.balance_due ?? 0), 0);

      setStats({
        totalEvents: totalEvents ?? 0,
        upcomingEvents: upcomingCount ?? 0,
        totalRevenue: thisMonthRevenue,
        totalExpenses: thisMonthExpenses,
        activeStaff: staffCount ?? 0,
        attendanceToday: attendanceCount ?? 0,
        lowStockItems: lowStock,
        pendingPayments: pendingPay
      });

      // 7. Calculate Revenue Growth
      const { data: prevMonthPayments, error: prevRevErr } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('type', 'debit')
        .gte('date', prevMonthStart)
        .lte('date', prevMonthEnd)
        .limit(50);
      
      if (prevRevErr) {
        console.error("Error fetching prev month payments:", prevRevErr);
      }
      const prevRevenue = (prevMonthPayments ?? []).reduce((sum, p) => sum + (p?.amount ?? 0), 0);
      if (prevRevenue > 0) {
        const growth = ((thisMonthRevenue - prevRevenue) / prevRevenue) * 100;
        setRevenueGrowth(`${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`);
      } else {
        setRevenueGrowth(thisMonthRevenue > 0 ? "+100%" : "0%");
      }

      // 8. Fetch Upcoming Events Table
      const { data: upcoming, error: upcomingErr } = await supabase
        .from('bookings')
        .select(`id, client_name, event_date, total_amount, event_type, venue, status, pax, balance_due`)
        .order('event_date', { ascending: true })
        .limit(50);
      
      if (upcomingErr) {
        console.error("Error fetching upcoming events:", upcomingErr);
        setUpcomingEvents([]);
      } else {
        setUpcomingEvents(upcoming ?? []);
      }

      // 9. Fetch last 6 months revenue for chart
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();
        const { data: payments, error: loopErr } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('type', 'debit')
          .gte('date', start)
          .lte('date', end)
          .limit(50);
        
        if (loopErr) console.error(`Error fetching payments for month offset ${i}:`, loopErr);
        const total = (payments ?? []).reduce((sum, p) => sum + (p?.amount ?? 0), 0);
        last6Months.push({
          month: format(date, 'MMM'),
          revenue: total
        });
      }
      setRevenueData(last6Months);

    } catch (err: any) {
      console.error("Dashboard fetchDashboardData unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="h-20 w-full bg-white rounded-3xl animate-pulse mb-8" />
        <SkeletonLoading type="stats" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-64 bg-white rounded-3xl animate-pulse" />
            <div className="h-96 bg-white rounded-3xl animate-pulse" />
          </div>
          <div className="space-y-8">
            <div className="h-64 bg-white rounded-3xl animate-pulse" />
            <div className="h-96 bg-white rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top duration-500">
        <div>
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight uppercase">Executive Dashboard</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1">
            Welcome back, <span className="text-primary">{user?.name || "Administrator"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Date</p>
            <p className="text-sm font-black text-slate-700">{format(new Date(), "MMMM do, yyyy")}</p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" size="icon" className="h-12 w-12 rounded-xl border-slate-200 hover:bg-slate-50">
            <Clock className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            label: "Monthly Revenue", 
            value: `₨ ${stats.totalRevenue.toLocaleString()}`, 
            growth: revenueGrowth, 
            icon: DollarSign, 
            color: "from-emerald-500 to-emerald-700",
            shadow: "shadow-emerald-500/20"
          },
          { 
            label: "Monthly Expenses", 
            value: `₨ ${stats.totalExpenses.toLocaleString()}`, 
            icon: Wallet,
            color: "from-rose-500 to-rose-700",
            shadow: "shadow-rose-500/20"
          },
          { 
            label: "Active Staff", 
            value: stats.activeStaff.toString(), 
            subValue: `${stats.attendanceToday} present today`,
            icon: Users, 
            color: "from-blue-500 to-blue-700",
            shadow: "shadow-blue-500/20"
          },
          { 
            label: "Upcoming Events", 
            value: stats.upcomingEvents.toString(), 
            subValue: "Confirmed bookings",
            icon: Calendar, 
            color: "from-amber-500 to-amber-700",
            shadow: "shadow-amber-500/20"
          }
        ].map((stat, idx) => (
          <div key={idx} className={`relative overflow-hidden rounded-3xl border-none shadow-xl ${stat.shadow} group hover:scale-[1.02] transition-all duration-300`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-90`} />
            <div className="relative p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{stat.label}</p>
                  <h3 className="text-2xl font-black mt-1">{stat.value}</h3>
                  {stat.growth && (
                    <div className="flex items-center gap-1 mt-2 bg-white/20 w-fit px-2 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-[10px] font-bold">{stat.growth} this month</span>
                    </div>
                  )}
                  {stat.subValue && (
                    <p className="text-[10px] font-bold mt-2 opacity-80">{stat.subValue}</p>
                  )}
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Bookings Table */}
          <div className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
            <div className="border-b border-slate-50 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Upcoming Schedule</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">LATEST BOOKINGS AND EVENTS</p>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-primary hover:bg-primary/5 group">
                  View Full Calendar <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client / Event</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <tr key={event.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-700">{event.client_name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{event.event_type} • {event.venue}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="inline-flex flex-col items-center bg-slate-100 px-3 py-1 rounded-xl">
                              <span className="text-[10px] font-black text-slate-700">{format(new Date(event.event_date), "MMM d")}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <Badge variant="outline" className={`rounded-lg px-2 py-0 text-[10px] font-black uppercase tracking-tighter ${
                              event.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              event.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                              {event.status}
                            </Badge>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className={`text-sm font-black ${event.balance_due > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              ₨ {event.balance_due?.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-10 text-center">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No upcoming events scheduled</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Revenue Trends Chart */}
          <div className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 p-8 bg-white overflow-hidden">
             <div className="px-0 pt-0 pb-6">
               <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <TrendingUp className="h-4 w-4 text-primary" /> Revenue Analysis (Last 6 Months)
               </h2>
             </div>
             <div className="h-64 flex items-end justify-between gap-4 px-2">
               {revenueData.map((data, i) => {
                 const max = Math.max(...revenueData.map(d => d.revenue), 1);
                 const height = (data.revenue / max) * 100;
                 return (
                   <div key={data.month} className="flex-1 flex flex-col items-center gap-4 group">
                     <div className="w-full relative">
                       <div 
                         className="w-full bg-slate-50 group-hover:bg-slate-100 rounded-2xl transition-all duration-500 flex items-end justify-center overflow-hidden" 
                         style={{ height: '200px' }}
                       >
                         <div 
                           className="w-full bg-gradient-to-t from-primary to-indigo-400 rounded-2xl transition-all duration-700 ease-out shadow-lg shadow-primary/20"
                           style={{ height: `${height}%` }}
                         />
                       </div>
                       <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1">
                         <Badge className="bg-[#0f172a] text-white border-none text-[10px] font-black px-2 py-1 shadow-xl">₨ {data.revenue.toLocaleString()}</Badge>
                       </div>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{data.month}</p>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-slate-900 text-white">
            <div className="p-8">
              <h2 className="text-lg font-black uppercase tracking-tight">Quick Actions</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 opacity-70">COMMON TASKS AND TOOLS</p>
            </div>
            <div className="px-8 pb-8 space-y-3">
              <Button className="w-full justify-between bg-white/10 hover:bg-white/20 border-none rounded-2xl h-14 font-bold group">
                New Booking <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
              <Button className="w-full justify-between bg-white/10 hover:bg-white/20 border-none rounded-2xl h-14 font-bold group">
                Add Expense <ArrowDownRight className="h-5 w-5 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
              </Button>
              <Button className="w-full justify-between bg-white/10 hover:bg-white/20 border-none rounded-2xl h-14 font-bold group">
                Inventory Check <Package className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Operational Alerts */}
          <div className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
            <div className="p-8">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Operational Alerts</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">ISSUES REQUIRING ATTENTION</p>
            </div>
            <div className="px-8 pb-8 space-y-4">
              {stats.lowStockItems > 0 && (
                <div className="flex items-start gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <div className="p-2 bg-rose-500 rounded-xl text-white">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-rose-700">Low Stock Warning</p>
                    <p className="text-[10px] font-bold text-rose-500 uppercase">{stats.lowStockItems} items are below minimum level</p>
                  </div>
                </div>
              )}
              {stats.attendanceToday < stats.activeStaff && (
                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="p-2 bg-amber-500 rounded-xl text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-700">Staff Attendance</p>
                    <p className="text-[10px] font-bold text-amber-500 uppercase">{stats.activeStaff - stats.attendanceToday} staff members not present</p>
                  </div>
                </div>
              )}
              {stats.pendingPayments > 0 && (
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="p-2 bg-blue-500 rounded-xl text-white">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-700">Receivables</p>
                    <p className="text-[10px] font-bold text-blue-500 uppercase">₨ {stats.pendingPayments.toLocaleString()} pending from clients</p>
                  </div>
                </div>
              )}
              {stats.lowStockItems === 0 && stats.attendanceToday === stats.activeStaff && stats.pendingPayments === 0 && (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="p-4 bg-emerald-50 rounded-full text-emerald-500 mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-black text-slate-700 uppercase">All Systems Normal</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">No urgent issues detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Dashboard);
