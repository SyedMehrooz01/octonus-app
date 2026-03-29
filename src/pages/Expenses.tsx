import { useState, useEffect } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { toast } from "sonner"; 
import { Plus, TrendingDown, Calendar, Clock, BarChart3, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
 
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
    </div>
  );
};

export default Expenses;
