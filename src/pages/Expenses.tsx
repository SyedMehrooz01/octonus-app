import { useState, useEffect } from "react";
import { Receipt, Plus, Search, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfToday, startOfMonth } from "date-fns";
import { toast } from "sonner";

const EXPENSE_HEADS = ["Utilities", "Staff", "Kitchen Supplies", "Decoration", "Marketing", "Maintenance", "Transport", "Miscellaneous"];

const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({ 
    date: format(new Date(), "yyyy-MM-dd"), 
    description: "", 
    head: "", 
    amount: "", 
    payment_mode: "Cash", 
    event_id: null 
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAdd = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.head) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          ...newExpense,
          amount: Number(newExpense.amount)
        }]);

      if (error) throw error;
      
      toast.success("Expense added successfully");
      setShowAddModal(false);
      setNewExpense({ 
        date: format(new Date(), "yyyy-MM-dd"), 
        description: "", 
        head: "", 
        amount: "", 
        payment_mode: "Cash", 
        event_id: null 
      });
      fetchExpenses();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error(error.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = expenses.filter(e => {
    const matchSearch = e.description?.toLowerCase().includes(search.toLowerCase());
    const matchHead = filterHead === "all" || e.head === filterHead;
    return matchSearch && matchHead;
  });

  const todayStr = format(startOfToday(), "yyyy-MM-dd");
  const monthStr = format(startOfMonth(new Date()), "yyyy-MM");

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + (e.amount || 0), 0);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0);

  // Group by head for summary
  const byHead = EXPENSE_HEADS.map(head => ({
    head,
    total: expenses.filter(e => e.head === head).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(h => h.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Expenses Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage all business expenses</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto justify-center">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Today's Expenses", value: `₨ ${todayExpenses.toLocaleString()}`, icon: Calendar },
          { label: "This Month", value: `₨ ${monthExpenses.toLocaleString()}`, icon: TrendingDown },
          { label: "Total Recorded", value: `₨ ${totalExpenses.toLocaleString()}`, icon: Receipt },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">{card.label}</p>
                <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive truncate">{card.value}</p>
              </div>
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <card.icon className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        {/* Expense Entries */}
        <TabsContent value="entries">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search expenses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterHead} onValueChange={setFilterHead}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Filter by head" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_HEADS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Description", "Category", "Event", "Mode", "Amount"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" /> Loading expenses...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No expenses found.</td>
                    </tr>
                  ) : filtered.map(e => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{e.description}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{e.head}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.event_id || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${e.payment_mode === "Cash" ? "bg-warning/10 text-warning border-warning/20" : "bg-secondary/10 text-secondary border-secondary/20"}`}>
                          {e.payment_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40">
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-card-foreground">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {filtered.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Group Report */}
        <TabsContent value="report">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Expenses by Category</h3>
            <div className="space-y-4">
              {byHead.map(h => {
                const pct = Math.round((h.total / totalExpenses) * 100);
                return (
                  <div key={h.head}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-card-foreground">{h.head}</span>
                      <span className="text-muted-foreground">₨ {h.total.toLocaleString()} <span className="text-xs">({pct}%)</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm font-bold">
                <span>Total Expenses</span>
                <span className="text-destructive">₨ {totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newExpense.head} onValueChange={v => setNewExpense({ ...newExpense, head: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EXPENSE_HEADS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="e.g. Electricity bill payment" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₨)</Label>
                <Input type="number" placeholder="e.g. 15000" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={newExpense.payment_mode} onValueChange={v => setNewExpense({ ...newExpense, payment_mode: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
