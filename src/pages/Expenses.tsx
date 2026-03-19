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
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Expense Tracking</h1>
          <p className="text-slate-500 font-bold mt-1">Monitor all business spending and category-wise overheads.</p>
        </div>
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-500">
          <div className="hidden sm:flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60">
            {(["monthly", "yearly"] as const).map(v => (
              <button 
                key={v} 
                onClick={() => setPlViewType(v)} 
                className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-[0.2em] ${viewType === v ? "bg-white text-blue-600 shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
              >
                {v}
              </button>
            ))}
          </div>
          {canDo("add") && (
            <Button onClick={() => setShowAddModal(true)} className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/20 h-12 px-8 gap-2 transition-all hover:-translate-y-0.5">
              <Plus className="h-5 w-5" /> ADD EXPENSE
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Today's Burn Rate", value: `₨ ${todayExpenses.toLocaleString()}`, icon: Calendar, color: "from-rose-500 to-rose-700", shadow: "shadow-rose-500/20", sub: format(new Date(), "PP") },
          { 
            label: viewType === "monthly" ? "Current Month Burn" : "Annual Burn Rate", 
            value: `₨ ${(viewType === "monthly" ? monthExpenses : totalYearly).toLocaleString()}`, 
            icon: TrendingDown, 
            color: "from-orange-500 to-orange-700",
            shadow: "shadow-orange-500/20",
            sub: viewType === "monthly" ? format(new Date(), "MMMM yyyy") : selectedYear
          },
          { label: "Aggregate Burn", value: `₨ ${totalExpenses.toLocaleString()}`, icon: Receipt, color: "from-blue-500 to-blue-700", shadow: "shadow-blue-500/20", sub: "All time records" },
        ].map((card, i) => (
          <div key={card.label} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.color} p-6 text-white shadow-xl ${card.shadow} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-in fade-in zoom-in duration-500 delay-${i * 100}`}>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{card.label}</p>
                <p className="text-2xl font-black truncate tracking-tight">{card.value}</p>
                <p className="text-[10px] font-black opacity-70 mt-1 uppercase tracking-tighter">{card.sub}</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <card.icon size={140} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="mb-8 h-auto gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
          <TabsTrigger value="entries" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Monthly Log</TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Detailed Ledger</TabsTrigger>
          <TabsTrigger value="group-reports" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Category Insights</TabsTrigger>
          <TabsTrigger value="yearly" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Annual Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row gap-4 items-center bg-slate-50/30">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input placeholder="Search logs..." className="pl-11 h-12 bg-white border-slate-200 rounded-xl font-bold shadow-sm focus-visible:ring-blue-500/20" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44 h-12 bg-white border-slate-200 rounded-xl font-black text-sm shadow-sm" />
                <Select value={filterHead} onValueChange={setFilterHead}>
                  <SelectTrigger className="w-48 h-12 rounded-xl border-slate-200 bg-white font-black text-sm shadow-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_HEADS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Mode</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-6 py-8"><div className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" /></td></tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                          <Search className="h-8 w-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                      </div>
                    </td></tr>
                  ) : filtered.map((e, idx) => (
                    <tr key={e.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-rose-50/40 transition-all duration-200 group`}>
                      <td className="px-6 py-6 text-sm font-black text-slate-500 whitespace-nowrap tracking-tight">{format(new Date(e.date), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-rose-600 transition-colors">{e.description}</p>
                        {e.event_id && <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter mt-2 flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-300" /> Event: {e.event_id}</p>}
                      </td>
                      <td className="px-6 py-6">
                        <Badge variant="outline" className="rounded-lg font-black text-[10px] uppercase tracking-tighter bg-white border-slate-200 px-3 py-1 shadow-sm">
                          {e.head}
                        </Badge>
                      </td>
                      <td className="px-6 py-6">
                        <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm ${e.payment_mode === "Cash" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}`}>
                          {e.payment_mode}
                        </Badge>
                      </td>
                      <td className="px-6 py-6 text-sm font-black text-right text-rose-600 tracking-tight">₨ {e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Aggregate Log</td>
                    <td className="px-6 py-8 text-right">
                      <span className="px-6 py-3 rounded-2xl bg-rose-500 text-white font-black text-xl shadow-xl shadow-rose-500/20">
                        ₨ {filtered.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}
                      </span>
                    </td>
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
