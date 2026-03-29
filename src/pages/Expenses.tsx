import { useState, useEffect, useMemo } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { toast } from "sonner"; 
import { Plus, TrendingDown, Calendar, Clock, BarChart3, Receipt, Search, Filter, PieChart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const EXPENSE_HEADS = ["Utilities", "Staff", "Kitchen Supplies", "Decoration", "Marketing", "Maintenance", "Transport", "Miscellaneous"];

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  
  // Search and Filter states
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("monthly");
 
  const today = new Date().toISOString().split('T')[0]; 
  const currentMonth = new Date().toISOString().slice(0, 7); 
 
  const todayTotal = (expenses ?? []) 
    .filter(e => e.date === today) 
    .reduce((sum, e) => sum + (e.amount ?? 0), 0); 
 
  const monthTotal = (expenses ?? []) 
    .filter(e => e.date?.startsWith(currentMonth)) 
    .reduce((sum, e) => sum + (e.amount ?? 0), 0); 
 
  const allTimeTotal = (expenses ?? []) 
    .reduce((sum, e) => sum + (e.amount ?? 0), 0); 

  // Filtering logic
  const filteredExpenses = useMemo(() => {
    return (expenses ?? []).filter(e => {
      const matchSearch = (e.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchMonth = activeTab === "monthly" ? (e.date?.startsWith(filterMonth)) : true;
      const matchCategory = filterCategory === "all" || e.category === filterCategory;
      return matchSearch && matchMonth && matchCategory;
    });
  }, [expenses, search, filterMonth, filterCategory, activeTab]);
 
  useEffect(() => { 
    if (!user) return; 
    const load = async () => { 
      setLoading(true); 
      try { 
        const { data, error } = await supabase 
          .from('expenses') 
          .select('*') 
          .order('created_at', { ascending: false }); 
        if (error) throw error; 
        setExpenses(data ?? []); 
      } catch(e) { 
        setExpenses([]); 
        toast.error('Failed to load expenses'); 
      } finally { 
        setLoading(false); 
      } 
    }; 
    load(); 
  }, [user]); 
 
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <Receipt className="h-8 w-8 text-red-600" />
            Expense Tracking
          </h1>
          <p className="text-slate-500 font-medium mt-1">Monitor all business spending</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            <Button 
              variant={viewType === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("monthly")}
              className={viewType === "monthly" ? "bg-white text-slate-900 shadow-sm hover:bg-white rounded-lg px-6" : "text-slate-500 rounded-lg px-6"}
            >
              MONTHLY
            </Button>
            <Button 
              variant={viewType === "yearly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("yearly")}
              className={viewType === "yearly" ? "bg-white text-slate-900 shadow-sm hover:bg-white rounded-lg px-6" : "text-slate-500 rounded-lg px-6"}
            >
              YEARLY
            </Button>
          </div>
          
          <Button className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-red-600/20 gap-2">
            <Plus className="h-5 w-5" /> ADD EXPENSE
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Today's Burn */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-500/20 relative overflow-hidden group transition-transform hover:scale-[1.02]">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-rose-100 font-black text-xs uppercase tracking-[0.2em] mb-4">
              <Clock className="h-4 w-4" /> TODAY'S BURN RATE
            </div>
            <div className="text-4xl font-black mb-2 tracking-tighter">
              Rs {todayTotal.toLocaleString()}
            </div>
            <div className="text-rose-100/80 text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {format(new Date(), "MMMM do, yyyy")}
            </div>
          </div>
          <TrendingDown className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
        </div>

        {/* Card 2: Monthly Burn */}
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-[2rem] p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group transition-transform hover:scale-[1.02]">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-orange-100 font-black text-xs uppercase tracking-[0.2em] mb-4">
              <BarChart3 className="h-4 w-4" /> CURRENT MONTH BURN
            </div>
            <div className="text-4xl font-black mb-2 tracking-tighter">
              Rs {monthTotal.toLocaleString()}
            </div>
            <div className="text-orange-100/80 text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {format(new Date(), "MMMM yyyy")}
            </div>
          </div>
          <TrendingDown className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
        </div>

        {/* Card 3: Aggregate Burn */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group transition-transform hover:scale-[1.02]">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-100 font-black text-xs uppercase tracking-[0.2em] mb-4">
              <TrendingDown className="h-4 w-4" /> AGGREGATE BURN
            </div>
            <div className="text-4xl font-black mb-2 tracking-tighter">
              Rs {allTimeTotal.toLocaleString()}
            </div>
            <div className="text-blue-100/80 text-sm font-bold uppercase tracking-widest">
              ALL TIME RECORDS
            </div>
          </div>
          <TrendingDown className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* Main Content Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl w-full sm:w-auto h-auto flex-wrap">
          <TabsTrigger value="monthly" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-xs tracking-widest uppercase flex items-center gap-2">
            <Calendar className="h-4 w-4" /> MONTHLY LOG
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-xs tracking-widest uppercase flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> DETAILED LEDGER
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-xs tracking-widest uppercase flex items-center gap-2">
            <PieChart className="h-4 w-4" /> CATEGORY INSIGHTS
          </TabsTrigger>
          <TabsTrigger value="annual" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-xs tracking-widest uppercase flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> ANNUAL ANALYTICS
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search expenses..." 
                className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {activeTab === "monthly" && (
                <Input 
                  type="month" 
                  className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 w-full sm:w-44"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                />
              )}
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 w-full sm:w-48">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="All Categories" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_HEADS.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-none">
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 pl-8">DATE</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6">DESCRIPTION</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6">CATEGORY</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6">PAYMENT MODE</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6">STATUS</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 text-right">AMOUNT</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 pr-8 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-32 text-center text-slate-400 font-bold uppercase tracking-widest">
                        No expenses found
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 pl-8 font-bold text-slate-600">
                          {e.date ? format(new Date(e.date), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="py-5">
                          <div className="font-black text-slate-900">{e.description}</div>
                        </td>
                        <td className="py-5">
                          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none rounded-lg px-3 py-1 font-bold">
                            {e.category}
                          </Badge>
                        </td>
                        <td className="py-5 font-bold text-slate-600">
                          {e.payment_mode}
                        </td>
                        <td className="py-5">
                          {e.status === 'pending' && (
                            <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 font-black text-[10px] tracking-widest uppercase">
                              PENDING
                            </Badge>
                          )}
                          {e.status === 'approved' && (
                            <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1 font-black text-[10px] tracking-widest uppercase">
                              APPROVED
                            </Badge>
                          )}
                          {e.status === 'rejected' && (
                            <Badge className="bg-rose-50 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg px-3 py-1 font-black text-[10px] tracking-widest uppercase">
                              REJECTED
                            </Badge>
                          )}
                        </td>
                        <td className="py-5 text-right">
                          <div className="font-black text-slate-900">
                            Rs {(e.amount ?? 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-5 pr-8 text-right">
                          <div className="flex justify-end gap-2">
                            {/* Action buttons will be added here */}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Expenses;
