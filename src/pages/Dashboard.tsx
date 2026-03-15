import { useState, useEffect } from "react";
import { CalendarDays, Users, Landmark, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfToday, endOfToday, addDays } from "date-fns";

const Dashboard = () => {
  const [stats, setStats] = useState([
    { label: "Today's Events", value: "0", icon: CalendarDays, color: "bg-primary" },
    { label: "This Month Revenue", value: "₨ 0", icon: Landmark, color: "bg-secondary" },
    { label: "Active Staff", value: "0", icon: Users, color: "bg-accent" },
    { label: "Pending Balances", value: "₨ 0", icon: Clock, color: "bg-warning" },
  ]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
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

        // 3. Fetch Month Revenue (from event_payments)
        const { data: monthlyPayments } = await supabase
          .from('event_payments')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd);
        
        const totalRevenue = monthlyPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // 4. Fetch Pending Balances (from events)
        const { data: pendingBalances } = await supabase
          .from('events')
          .select('balance_remaining')
          .neq('status', 'cancelled');
        
        const totalPending = pendingBalances?.reduce((sum, e) => sum + (e.balance_remaining || 0), 0) || 0;

        // 5. Fetch Upcoming Events
        const { data: upcoming } = await supabase
          .from('events')
          .select(`
            id,
            client_name,
            event_date,
            total_amount,
            event_type
          `)
          .gte('event_date', today)
          .lte('event_date', nextWeek)
          .order('event_date', { ascending: true })
          .limit(5);

        setStats([
          { label: "Today's Events", value: (todayEventsCount || 0).toString(), icon: CalendarDays, color: "bg-primary" },
          { label: "This Month Revenue", value: `₨ ${totalRevenue.toLocaleString()}`, icon: Landmark, color: "bg-secondary" },
          { label: "Active Staff", value: (activeStaffCount || 0).toString(), icon: Users, color: "bg-accent" },
          { label: "Pending Balances", value: `₨ ${totalPending.toLocaleString()}`, icon: Clock, color: "bg-warning" },
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

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4 sm:p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-card-foreground pkr-format truncate">{stat.value}</p>
              </div>
              <div className={`flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h3 className="mb-4 text-sm sm:text-base font-semibold text-card-foreground">Upcoming Events (Next 7 Days)</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0 gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">{event.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.event_date), 'PPP')} • {event.event_type}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-bold text-primary">₨ {event.total_amount?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="mb-2 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No upcoming events in the next 7 days.</p>
            </div>
          )}
        </div>
        
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h3 className="mb-4 text-sm sm:text-base font-semibold text-card-foreground">Monthly Revenue</h3>
          <div className="flex h-40 sm:h-48 flex-col items-center justify-center text-center">
             <Landmark className="mb-2 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/20" />
             <p className="text-sm text-muted-foreground">Revenue charts are being integrated...</p>
             <p className="mt-1 text-xs text-muted-foreground/60">Current Month: {format(new Date(), 'MMMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h3 className="mb-4 text-sm sm:text-base font-semibold text-card-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {["New Event Booking", "Add Expense", "Mark Attendance", "Generate Payroll"].map(
            (action) => (
              <button
                key={action}
                className="flex-1 sm:flex-none rounded-lg bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {action}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
