import { useState } from "react";
import { Receipt, Plus, Search, TrendingDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EXPENSE_HEADS = ["Utilities", "Staff", "Kitchen Supplies", "Decoration", "Marketing", "Maintenance", "Transport", "Miscellaneous"];

const DUMMY_EXPENSES = [
  { id: 1, date: "2024-03-01", description: "Electricity Bill", head: "Utilities", amount: 18500, paymentMode: "Bank", event: "-" },
  { id: 2, date: "2024-03-02", description: "Decoration items for wedding", head: "Decoration", amount: 25000, paymentMode: "Cash", event: "Tariq & Sana Wedding" },
  { id: 3, date: "2024-03-05", description: "Fuel for delivery van", head: "Transport", amount: 4500, paymentMode: "Cash", event: "-" },
  { id: 4, date: "2024-03-07", description: "February Staff Salaries", head: "Staff", amount: 205500, paymentMode: "Bank", event: "-" },
  { id: 5, date: "2024-03-09", description: "Facebook & Instagram Ads", head: "Marketing", amount: 12000, paymentMode: "Bank", event: "-" },
  { id: 6, date: "2024-03-11", description: "AC Repair", head: "Maintenance", amount: 8500, paymentMode: "Cash", event: "-" },
  { id: 7, date: "2024-03-12", description: "Catering supplies for dinner", head: "Kitchen Supplies", amount: 18000, paymentMode: "Cash", event: "Ali Corp Dinner" },
  { id: 8, date: "2024-03-13", description: "Gas bill", head: "Utilities", amount: 6200, paymentMode: "Bank", event: "-" },
];

const Expenses = () => {
  const [expenses, setExpenses] = useState(DUMMY_EXPENSES);
  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ date: "", description: "", head: "", amount: "", paymentMode: "Cash", event: "-" });

  const filtered = expenses.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchHead = filterHead === "all" || e.head === filterHead;
    return matchSearch && matchHead;
  });

  const handleAdd = () => {
    if (!newExpense.description || !newExpense.amount) return;
    setExpenses([...expenses, { id: expenses.length + 1, ...newExpense, amount: Number(newExpense.amount) }]);
    setNewExpense({ date: "", description: "", head: "", amount: "", paymentMode: "Cash", event: "-" });
    setShowAddModal(false);
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const todayExpenses = expenses.filter(e => e.date === "2024-03-14").reduce((s, e) => s + e.amount, 0);
  const monthExpenses = expenses.filter(e => e.date.startsWith("2024-03")).reduce((s, e) => s + e.amount, 0);

  // Group by head for summary
  const byHead = EXPENSE_HEADS.map(head => ({
    head,
    total: expenses.filter(e => e.head === head).reduce((s, e) => s + e.amount, 0),
  })).filter(h => h.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Expenses Management</h2>
          <p className="text-sm text-muted-foreground">Track and manage all business expenses</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Today's Expenses", value: `₨ ${todayExpenses.toLocaleString()}`, icon: Calendar },
          { label: "This Month", value: `₨ ${monthExpenses.toLocaleString()}`, icon: TrendingDown },
          { label: "Total Recorded", value: `₨ ${totalExpenses.toLocaleString()}`, icon: Receipt },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-destructive">{card.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <card.icon className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="entries">
        <TabsList className="mb-4">
          <TabsTrigger value="entries">Expense Entries</TabsTrigger>
          <TabsTrigger value="report">Group Report</TabsTrigger>
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Description", "Category", "Event", "Mode", "Amount"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{e.description}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{e.head}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.event}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${e.paymentMode === "Cash" ? "bg-warning/10 text-warning border-warning/20" : "bg-secondary/10 text-secondary border-secondary/20"}`}>
                          {e.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40">
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-card-foreground">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {filtered.reduce((s, e) => s + e.amount, 0).toLocaleString()}</td>
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
                <Select value={newExpense.paymentMode} onValueChange={v => setNewExpense({ ...newExpense, paymentMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Related Event (optional)</Label>
              <Input placeholder="e.g. Ahmed Wedding or leave blank" value={newExpense.event} onChange={e => setNewExpense({ ...newExpense, event: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
