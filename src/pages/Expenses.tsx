import { useState, useEffect, useMemo, memo } from "react";
import { Receipt, Plus, Search, TrendingDown, Calendar, Loader2, Download, FileText, Filter, ChevronLeft, ChevronRight, BarChart3, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfToday, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const EXPENSE_HEADS = ["Utilities", "Staff", "Kitchen Supplies", "Decoration", "Marketing", "Maintenance", "Transport", "Miscellaneous"];
const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "Online Transfer"];

interface Expense {
  id: string;
  date: string;
  description: string;
  head: string;
  amount: number;
  payment_mode: string;
  event_id?: string | null;
  created_at?: string;
}

const Expenses = () => {
  const { canDo, logAction } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New States
  const [viewType, setPlViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  
  // Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerHead, setLedgerHead] = useState("all");
  const [ledgerMode, setLedgerMode] = useState("all");
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newExpense, setNewExpense] = useState({ 
    date: format(new Date(), "yyyy-MM-dd"), 
    description: "", 
    head: "", 
    amount: "", 
    payment_mode: "Cash", 
    event_id: "" as string | null
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
      
      logAction(`Added new expense: ${newExpense.description} (₨ ${newExpense.amount})`, "Expenses");
      toast.success("Expense added successfully");
      setShowAddModal(false);
      setNewExpense({ 
        date: format(new Date(), "yyyy-MM-dd"), 
        description: "", 
        head: "", 
        amount: "", 
        payment_mode: "Cash", 
        event_id: "" as string | null
      });
      fetchExpenses();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error(error.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered expenses for entries tab
  const filtered = expenses.filter(e => {
    const matchSearch = e.description?.toLowerCase().includes(search.toLowerCase());
    const matchHead = filterHead === "all" || e.head === filterHead;
    const matchMonth = e.date.startsWith(selectedMonth);
    return matchSearch && matchHead && matchMonth;
  });

  // Ledger filtering
  const ledgerFiltered = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = e.description?.toLowerCase().includes(ledgerSearch.toLowerCase());
      const matchHead = ledgerHead === "all" || e.head === ledgerHead;
      const matchMode = ledgerMode === "all" || e.payment_mode === ledgerMode;
      const matchDate = isWithinInterval(parseISO(e.date), {
        start: parseISO(fromDate),
        end: parseISO(toDate)
      });
      return matchSearch && matchHead && matchMode && matchDate;
    });
  }, [expenses, ledgerSearch, ledgerHead, ledgerMode, fromDate, toDate]);

  const totalPages = Math.ceil(ledgerFiltered.length / itemsPerPage);
  const paginatedLedger = ledgerFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = format(startOfToday(), "yyyy-MM-dd");
  const currentMonthStr = format(new Date(), "yyyy-MM");

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + (e.amount || 0), 0);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(currentMonthStr)).reduce((s, e) => s + (e.amount || 0), 0);

  // Yearly Breakdown logic
  const yearlyMonths = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(parseISO(`${selectedYear}-01-01`)),
      end: endOfYear(parseISO(`${selectedYear}-01-01`))
    });
  }, [selectedYear]);

  const yearlyExpenses = expenses.filter(e => e.date.startsWith(selectedYear));
  const totalYearly = yearlyExpenses.reduce((s, e) => s + e.amount, 0);

  const yearlyByMonth = yearlyMonths.map(month => {
    const mStr = format(month, "yyyy-MM");
    return {
      label: format(month, "MMMM"),
      total: expenses.filter(e => e.date.startsWith(mStr)).reduce((s, e) => s + e.amount, 0)
    };
  });

  const yearlyByHead = EXPENSE_HEADS.map(head => ({
    head,
    total: yearlyExpenses.filter(e => e.head === head).reduce((s, e) => s + e.amount, 0)
  })).filter(h => h.total > 0).sort((a, b) => b.total - a.total);

  // Grouping logic for reports
  const groupByCategory = useMemo(() => {
    return EXPENSE_HEADS.map(head => ({
      name: head,
      total: expenses.filter(e => e.head === head).reduce((s, e) => s + e.amount, 0)
    })).filter(g => g.total > 0).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const groupByPayment = useMemo(() => {
    return PAYMENT_MODES.map(mode => ({
      name: mode,
      total: expenses.filter(e => e.payment_mode === mode).reduce((s, e) => s + e.amount, 0)
    })).filter(g => g.total > 0).sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Export functions
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${fileName}.xlsx`);
  };

  const exportToPDF = (headers: string[], rows: any[][], title: string, fileName: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 30);
    
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      theme: 'striped',
      headStyles: { fillStyle: 'dark', fillColor: [66, 66, 66] }
    });
    
    doc.save(`${fileName}.pdf`);
  };

  const exportLedger = (type: 'pdf' | 'excel') => {
    const data = ledgerFiltered.map(e => ({
      Date: e.date,
      Description: e.description,
      Category: e.head,
      Mode: e.payment_mode,
      Amount: e.amount
    }));

    if (type === 'excel') {
      exportToExcel(data, `Expense_Ledger_${fromDate}_to_${toDate}`);
    } else {
      const headers = ["Date", "Description", "Category", "Mode", "Amount"];
      const rows = data.map(d => Object.values(d));
      exportToPDF(headers, rows, `Expense Ledger (${fromDate} to ${toDate})`, `Expense_Ledger`);
    }
  };

  const exportYearly = (type: 'pdf' | 'excel') => {
    if (type === 'excel') {
      const data = yearlyByMonth.map(m => ({ Month: m.label, Total: m.total }));
      exportToExcel(data, `Yearly_Expense_Report_${selectedYear}`);
    } else {
      const headers = ["Month", "Total Expense"];
      const rows = yearlyByMonth.map(m => [m.label, `₨ ${m.total.toLocaleString()}`]);
      exportToPDF(headers, rows, `Yearly Expense Report - ${selectedYear}`, `Yearly_Report_${selectedYear}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Expenses Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage all business expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-muted p-1 rounded-lg">
            {(["monthly", "yearly"] as const).map(v => (
              <button 
                key={v} 
                onClick={() => setPlViewType(v)} 
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewType === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {canDo("add") && (
            <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto justify-center">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Today's Expenses", value: `₨ ${todayExpenses.toLocaleString()}`, icon: Calendar, color: "bg-primary", sub: format(new Date(), "PP") },
          { 
            label: viewType === "monthly" ? "This Month" : "Yearly Total", 
            value: `₨ ${(viewType === "monthly" ? monthExpenses : totalYearly).toLocaleString()}`, 
            icon: TrendingDown, 
            color: "bg-destructive",
            sub: viewType === "monthly" ? format(new Date(), "MMMM yyyy") : selectedYear
          },
          { label: "Total Recorded", value: `₨ ${totalExpenses.toLocaleString()}`, icon: Receipt, color: "bg-secondary", sub: "All time" },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">{card.label}</p>
                <p className="mt-1 text-lg sm:text-2xl font-bold text-card-foreground truncate">{card.value}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{card.sub}</p>
              </div>
              <div className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="group-reports">Group Reports</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Reports</TabsTrigger>
        </TabsList>

        {/* Expense Entries */}
        <TabsContent value="entries">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search expenses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40 h-9" />
                <Select value={filterHead} onValueChange={setFilterHead}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Filter by head" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_HEADS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No expenses found for this month.</td>
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
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-card-foreground">Monthly Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {filtered.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Expense Ledger */}
        <TabsContent value="ledger">
          <div className="rounded-lg border border-border bg-card">
            <div className="p-4 border-b border-border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search ledger..." className="pl-9 h-9" value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
                  </div>
                  <Select value={ledgerHead} onValueChange={setLedgerHead}>
                    <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Heads</SelectItem>
                      {EXPENSE_HEADS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={ledgerMode} onValueChange={setLedgerMode}>
                    <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Payment Mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportLedger('pdf')} className="h-9"><FileText className="h-4 w-4 mr-2"/>PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => exportLedger('excel')} className="h-9"><Download className="h-4 w-4 mr-2"/>Excel</Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">From:</Label>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">To:</Label>
                  <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Description", "Category", "Payment Mode", "Amount"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLedger.map(e => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.date}</td>
                      <td className="px-4 py-3 text-sm font-medium">{e.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.head}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.payment_mode}</td>
                      <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40">
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold">Running Total (Filtered)</td>
                    <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {ledgerFiltered.reduce((s,e)=>s+e.amount,0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-xs text-muted-foreground">Showing {paginatedLedger.length} of {ledgerFiltered.length} entries</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xs font-medium">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Group Reports */}
        <TabsContent value="group-reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2"><PieChart className="h-4 w-4"/> Expenses by Category</h3>
                {canDo("export") && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => exportToExcel(groupByCategory, 'Expenses_By_Category')} className="h-8 w-8"><Download className="h-4 w-4"/></Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {groupByCategory.map(g => {
                  const pct = Math.round((g.total / totalExpenses) * 100);
                  return (
                    <div key={g.name}>
                      <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-muted-foreground font-bold">₨ {g.total.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Expenses by Payment Mode</h3>
                {canDo("export") && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => exportToExcel(groupByPayment, 'Expenses_By_Payment_Mode')} className="h-8 w-8"><Download className="h-4 w-4"/></Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {groupByPayment.map(g => {
                  const pct = Math.round((g.total / totalExpenses) * 100);
                  return (
                    <div key={g.name}>
                      <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-muted-foreground font-bold">₨ {g.total.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Yearly Reports */}
        <TabsContent value="yearly">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["2024", "2025", "2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Yearly:</span>
                  <span className="ml-2 font-bold text-destructive">₨ {totalYearly.toLocaleString()}</span>
                </div>
              </div>
              {canDo("export") && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportYearly('pdf')}><FileText className="h-4 w-4 mr-2"/>Export PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => exportYearly('excel')}><Download className="h-4 w-4 mr-2"/>Export Excel</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-sm font-bold mb-6">Monthly Breakdown - {selectedYear}</h3>
                <div className="space-y-4">
                  {yearlyByMonth.map(m => {
                    const pct = totalYearly > 0 ? Math.round((m.total / totalYearly) * 100) : 0;
                    return (
                      <div key={m.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">{m.label}</span>
                          <span className="text-muted-foreground">₨ {m.total.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-sm font-bold mb-6">Category Breakdown - {selectedYear}</h3>
                <div className="space-y-4">
                  {yearlyByHead.map(h => {
                    const pct = totalYearly > 0 ? Math.round((h.total / totalYearly) * 100) : 0;
                    return (
                      <div key={h.head}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">{h.head}</span>
                          <span className="text-muted-foreground font-bold">₨ {h.total.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-destructive rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="What was this expense for?" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category / Head</Label>
                <Select value={newExpense.head} onValueChange={v => setNewExpense({ ...newExpense, head: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EXPENSE_HEADS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={newExpense.payment_mode} onValueChange={v => setNewExpense({ ...newExpense, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₨)</Label>
                <Input type="number" placeholder="0" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event_id">Linked Event (Optional)</Label>
                <Input 
                  id="event_id" 
                  placeholder="Event ID or Name" 
                  value={newExpense.event_id || ""} 
                  onChange={e => setNewExpense({ ...newExpense, event_id: e.target.value })} 
                />
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

export default memo(Expenses);
