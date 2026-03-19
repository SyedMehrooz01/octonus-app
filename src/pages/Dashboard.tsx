import { useState, useEffect } from "react";
import { CalendarDays, Users, Landmark, Clock, Plus, Receipt, CheckCircle, Wallet, ArrowRight, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfToday, endOfToday, addDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "Today's Events", value: "0", icon: CalendarDays, color: "bg-blue-500", textColor: "text-blue-500" },
    { label: "This Month Revenue", value: "₨ 0", icon: Landmark, color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Active Staff", value: "0", icon: Users, color: "bg-violet-500", textColor: "text-violet-500" },
    { label: "Pending Balances", value: "₨ 0", icon: Clock, color: "bg-amber-500", textColor: "text-amber-500" },
  ]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const today = startOfToday().toISOString();
        const endOfTodayStr = endOfToday().toISOString();
        const monthStart = startOfMonth(new Date()).toISOString();
        const monthEnd = endOfMonth(new Date()).toISOString();
        const nextWeek = addDays(new Date(), 7).toISOString();

        // 1. Fetch Today's Events Count
        const { count: todayEventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .gte('event_date', today)
          .lte('event_date', endOfTodayStr);

        // 2. Fetch Active Staff Count
        const { count: activeStaffCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // 3. Fetch Month Revenue
        const { data: monthlyPayments } = await supabase
          .from('event_payments')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd);
        
        const totalRevenue = monthlyPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // 4. Fetch Pending Balances
        const { data: pendingBalances } = await supabase
          .from('events')
          .select('balance_remaining')
          .neq('status', 'cancelled');
        
        const totalPending = pendingBalances?.reduce((sum, e) => sum + (e.balance_remaining || 0), 0) || 0;

        // 5. Fetch Upcoming Events
        const { data: upcoming } = await supabase
          .from('events')
          .select(`id, client_name, event_date, total_amount, event_type, venue, status`)
          .gte('event_date', today)
          .lte('event_date', nextWeek)
          .order('event_date', { ascending: true })
          .limit(5);

        // 6. Fetch last 6 months revenue for chart
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const start = startOfMonth(date).toISOString();
          const end = endOfMonth(date).toISOString();
          
          const { data: payments } = await supabase
            .from('event_payments')
            .select('amount')
            .gte('date', start)
            .lte('date', end);
          
          const total = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          last6Months.push({
            month: format(date, 'MMM'),
            revenue: total
          });
        }
        setRevenueData(last6Months);

        // 7. Recent Activity (Bookings, Payments, Attendance)
        const activity = [];
        
        const { data: recentBookings } = await supabase
          .from('events')
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
          .from('event_payments')
          .select('amount, date, events(client_name)')
          .order('date', { ascending: false })
          .limit(3);
        
        recentPayments?.forEach(p => activity.push({
          type: 'payment',
          title: `Payment of ₨ ${p.amount.toLocaleString()} received from ${(p as any).events?.client_name}`,
          time: p.date,
          icon: Wallet,
          color: 'text-emerald-500'
        }));

        const { data: recentAttendance } = await supabase
          .from('attendance')
          .select('id, date, status, employees(name)')
          .order('date', { ascending: false })
          .limit(3);
        
        recentAttendance?.forEach(a => activity.push({
          type: 'attendance',
          title: `Attendance marked for ${(a as any).employees?.name}: ${a.status}`,
          time: a.date,
          icon: CheckCircle,
          color: 'text-violet-500'
        }));

        setRecentActivity(activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6));

        setStats([
          { label: "Today's Events", value: (todayEventsCount || 0).toString(), icon: CalendarDays, color: "bg-blue-500", textColor: "text-blue-500" },
          { label: "This Month Revenue", value: `₨ ${totalRevenue.toLocaleString()}`, icon: Landmark, color: "bg-emerald-500", textColor: "text-emerald-500" },
          { label: "Active Staff", value: (activeStaffCount || 0).toString(), icon: Users, color: "bg-violet-500", textColor: "text-violet-500" },
          { label: "Pending Balances", value: `₨ ${totalPending.toLocaleString()}`, icon: Clock, color: "bg-amber-500", textColor: "text-amber-500" },
        ]);

        setUpcomingEvents(upcoming || []);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
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

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back, Admin</h2>
          <p className="text-sm text-muted-foreground">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
          <CalendarDays className="h-3.5 w-3.5" />
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-card-foreground">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color} bg-opacity-10 ${stat.textColor} transition-all group-hover:scale-110 group-hover:rotate-3`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full ${stat.color} opacity-20`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-card-foreground">Revenue Overview</h3>
              <p className="text-xs text-muted-foreground">Monthly earnings for the last 6 months</p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₨${value >= 1000 ? value/1000 + 'k' : value}`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₨ ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40}>
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { name: "New Event Booking", icon: Plus, color: "bg-blue-500" },
                { name: "Add Expense", icon: Receipt, color: "bg-rose-500" },
                { name: "Mark Attendance", icon: CheckCircle, color: "bg-emerald-500" },
                { name: "Generate Payroll", icon: Wallet, color: "bg-violet-500" }
              ].map((action) => (
                <Button
                  key={action.name}
                  onClick={() => handleQuickAction(action.name)}
                  variant="outline"
                  className="group justify-between h-12 border-border/50 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm">{action.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-card-foreground">Recent Activity</h3>
            <div className="space-y-4">
              {loading ? (
                Array(4).fill(0).map((_, i) => <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-muted" />)
              ) : recentActivity.length > 0 ? (
                recentActivity.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary/40`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-card-foreground leading-tight">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(item.time), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-muted-foreground py-4 italic">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">Upcoming Events (Next 7 Days)</h3>
            <p className="text-xs text-muted-foreground">Detailed schedule of confirmed bookings</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="text-primary font-bold">View Calendar</Button>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Client</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Event & Venue</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingEvents.map((event) => (
                  <tr key={event.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-black text-card-foreground">{event.client_name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-foreground/80">{event.event_type}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{event.venue}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-bold text-muted-foreground">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter border ${
                        event.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        event.status === 'tentative' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-black text-primary">₨ {event.total_amount?.toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/5">
            <Activity className="mb-3 h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm font-bold text-muted-foreground">No events scheduled for the next 7 days.</p>
            <Button onClick={() => navigate("/events")} variant="link" className="mt-2 h-auto p-0">Schedule an event</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`animate-spin ${className}`}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default Dashboard;
