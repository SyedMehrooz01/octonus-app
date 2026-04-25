import { useState, useEffect, useMemo } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { toast } from "sonner"; 
import { Plus, TrendingDown, Calendar, Clock, BarChart3, Receipt, Search, Filter, PieChart, LayoutDashboard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { generatePDFWithLetterhead } from "@/lib/pdfLetterhead";

const EXPENSE_HEADS = ["Decoration", "Food", "Transport", "Utilities", "Maintenance", "Staff", "Kitchen Supplies", "Office", "Catering", "Marketing", "Miscellaneous", "Other"];

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

  // Add Expense modal states
  const [showAddModal, setShowAddModal] = useState(false); 
  const [newExpense, setNewExpense] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    description: "", 
    category: "Other", 
    payment_mode: "Cash", 
    amount: "", 
    linked_event: "" 
  }); 

  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState(false); 
  const [selectedExpense, setSelectedExpense] = useState<any>(null); 
  const [rejectionReason, setRejectionReason] = useState(""); 

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

  // Voucher generator
  const generateVoucherNo = async () => { 
    const { count } = await supabase 
      .from('expenses') 
      .select('*', { count: 'exact', head: true }); 
    const num = String((count ?? 0) + 1).padStart(3, '0'); 
    return `EXP-${new Date().getFullYear()}-${num}`; 
  }; 

  // Add expense handler
  const handleAddExpense = async () => { 
    if (!newExpense.description || !newExpense.amount) { 
      toast.error('Please fill all required fields'); 
      return; 
    } 
    try { 
      const voucher_no = await generateVoucherNo(); 
      const { error } = await supabase 
        .from('expenses') 
        .insert({ 
          voucher_no, 
          date: newExpense.date, 
          description: newExpense.description, 
          category: newExpense.category, 
          payment_mode: newExpense.payment_mode, 
          amount: Number(newExpense.amount), 
          linked_event: newExpense.linked_event, 
          status: 'pending', 
          created_by_name: user?.name, 
          created_by_id: user?.id, 
          created_by_role: user?.role, 
          created_at: new Date().toISOString() 
        }); 
      if (error) throw error; 
      toast.success('Expense added successfully'); 
      setShowAddModal(false); 
      setNewExpense({ 
        date: new Date().toISOString().split('T')[0], 
        description: "", 
        category: "Other", 
        payment_mode: "Cash", 
        amount: "", 
        linked_event: "" 
      }); 
      
      // reload expenses 
      const { data } = await supabase 
        .from('expenses') 
        .select('*') 
        .order('created_at', { ascending: false }); 
      setExpenses(data ?? []); 
    } catch(e) { 
      console.error(e);
      toast.error('Failed to add expense'); 
    } 
  }; 

  // Approval and rejection handlers
  const handleApprove = async (expense: any) => { 
    try { 
      const { error } = await supabase 
        .from('expenses') 
        .update({ 
          status: 'approved', 
          approved_by: user?.name, 
          approved_at: new Date().toISOString() 
        }) 
        .eq('id', expense.id); 
      if (error) throw error; 
      toast.success('Expense approved!'); 
      const { data } = await supabase 
        .from('expenses') 
        .select('*') 
        .order('created_at', { ascending: false }); 
      setExpenses(data ?? []); 
    } catch(e) { 
      toast.error('Failed to approve expense'); 
    } 
  }; 

  const handleReject = async () => { 
    if (!rejectionReason) { 
      toast.error('Please enter rejection reason'); 
      return; 
    } 
    try { 
      const { error } = await supabase 
        .from('expenses') 
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason 
        }) 
        .eq('id', selectedExpense.id); 
      if (error) throw error; 
      toast.success('Expense rejected'); 
      setShowRejectModal(false); 
      setRejectionReason(""); 
      setSelectedExpense(null); 
      const { data } = await supabase 
        .from('expenses') 
        .select('*') 
        .order('created_at', { ascending: false }); 
      setExpenses(data ?? []); 
    } catch(e) { 
      toast.error('Failed to reject expense'); 
    } 
  };

  // Download voucher function
  const handleDownloadVoucher = async (expense: any) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 14;

    await generatePDFWithLetterhead(pdf, (startY: number, endY: number) => {
      let y = startY;
      const contentMaxY = endY;

      // Voucher title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(101, 114, 57);
      pdf.text("EXPENSE VOUCHER", 105, y + 6, { align: "center" });

      // Voucher number
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Voucher No: ${expense.voucher_no}`, 150, y + 6);
      y += 12;

      // Line
      pdf.setDrawColor(101, 114, 57);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Details section
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text("EXPENSE DETAILS", margin, y);
      y += 10;

      pdf.setFont("helvetica", "normal");
      pdf.text(`Date: ${expense.date ? format(new Date(expense.date), 'dd MMM yyyy') : '-'}`, margin, y);
      pdf.text(`Category: ${expense.category ?? '-'}`, margin, y + 7);
      pdf.text(`Payment Mode: ${expense.payment_mode ?? '-'}`, margin, y + 14);
      pdf.text(`Linked Event: ${expense.linked_event ?? 'N/A'}`, margin, y + 21);

      pdf.text(`Created By: ${expense.created_by_name ?? '-'}`, 110, y);
      pdf.text(`Role: ${expense.created_by_role ?? '-'}`, 110, y + 7);
      pdf.text(`Created At: ${expense.created_at ? format(new Date(expense.created_at), 'dd MMM yyyy HH:mm') : '-'}`, 110, y + 14);
      y += 28;

      // Description box
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, y, pageWidth - margin * 2, 25);
      pdf.setFont("helvetica", "bold");
      pdf.text("DESCRIPTION:", margin + 3, y + 8);
      pdf.setFont("helvetica", "normal");
      pdf.text(expense.description ?? '-', margin + 3, y + 15, { maxWidth: pageWidth - margin * 2 - 6 });
      y += 33;

      // Amount section
      pdf.setFillColor(240, 240, 240);
      pdf.rect(120, y, 75, 20, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(180, 0, 0);
      pdf.text(`Rs. ${(expense.amount ?? 0).toLocaleString()}/-`, 157, y + 13, { align: "center" });
      pdf.setTextColor(0, 0, 0);
      y += 28;

      // Approval box
      pdf.setDrawColor(101, 114, 57);
      pdf.setLineWidth(1);
      pdf.rect(margin, y, pageWidth - margin * 2, 30);
      pdf.setFillColor(240, 255, 240);
      pdf.rect(margin, y, pageWidth - margin * 2, 30, "F");
      pdf.setTextColor(101, 114, 57);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("✓ APPROVED", pageWidth / 2, y + 10, { align: "center" });
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Approved By: ${expense.approved_by ?? '-'}`, margin + 5, y + 18);
      pdf.text(`Approval Date: ${expense.approved_at ? format(new Date(expense.approved_at), 'dd MMM yyyy HH:mm') : '-'}`, pageWidth / 2, y + 18);
      pdf.setTextColor(0, 0, 0);
      y += 40;

      // Signature boxes
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(100, 100, 100);

      // Left signature box
      pdf.rect(margin, y, 85, 40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("PREPARED BY", margin + 42, y + 10, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Name: ____________________", margin + 5, y + 20);
      pdf.text("Sign:  ____________________", margin + 5, y + 28);
      pdf.text("Date:  ____________________", margin + 5, y + 36);

      // Right signature box
      pdf.rect(pageWidth - margin - 85, y, 85, 40);
      pdf.setFont("helvetica", "bold");
      pdf.text("AUTHORIZED BY", pageWidth - margin - 42, y + 10, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Name: ____________________", pageWidth - margin - 80, y + 20);
      pdf.text("Sign:  ____________________", pageWidth - margin - 80, y + 28);
      pdf.text("Date:  ____________________", pageWidth - margin - 80, y + 36);

    }, `Voucher_${expense.voucher_no}.pdf`);
  }; 

  // Export to Excel function
  const handleExportExcel = () => { 
    try { 
      const exportData = (expenses ?? []).map((e, i) => ({ 
        'S.No': i + 1, 
        'Voucher No': e.voucher_no ?? '-', 
        'Date': e.date ? format(new Date(e.date), 'dd MMM yyyy') : '-', 
        'Description': e.description ?? '-', 
        'Category': e.category ?? '-', 
        'Payment Mode': e.payment_mode ?? '-', 
        'Amount (Rs)': e.amount ?? 0, 
        'Status': e.status ?? '-', 
        'Created By': e.created_by_name ?? '-', 
        'Approved By': e.approved_by ?? '-', 
        'Rejection Reason': e.rejection_reason ?? '-' 
      })); 
  
      const ws = XLSX.utils.json_to_sheet(exportData); 
      const wb = XLSX.utils.book_new(); 
      
      ws['!cols'] = [ 
        { wch: 5 }, 
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 30 }, 
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 12 }, 
        { wch: 12 }, 
        { wch: 20 }, 
        { wch: 20 }, 
        { wch: 25 } 
      ]; 
  
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses'); 
      const buf = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array' 
      }); 
      saveAs( 
        new Blob([buf], { 
          type: 'application/octet-stream' 
        }), 
        `Expenses_${format(new Date(), 'MMM_yyyy')}.xlsx` 
      ); 
      toast.success('Excel exported successfully'); 
    } catch(e) { 
      console.error(e);
      toast.error('Failed to export Excel'); 
    } 
  }; 

  // Filtering logic
  const filteredExpenses = useMemo(() => {
    return (expenses ?? []).filter(e => {
      const matchSearch = (e.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === "all" || e.category === filterCategory;
      let matchDate = true;
      if (activeTab === "monthly") {
        matchDate = viewType === "yearly"
          ? (e.date?.startsWith(String(new Date().getFullYear())))
          : (e.date?.startsWith(filterMonth));
      }
      return matchSearch && matchDate && matchCategory;
    });
  }, [expenses, search, filterMonth, filterCategory, activeTab, viewType]);

  const allExpenses = useMemo(() => {
    return (expenses ?? []).filter(e => {
      const matchSearch = (e.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === "all" || e.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [expenses, search, filterCategory]);

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
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
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

          <Button 
            variant="outline"
            onClick={handleExportExcel}
            className="border-slate-200 hover:bg-slate-50 text-slate-600 font-black rounded-xl px-6 h-12 gap-2"
          >
            <Download className="h-5 w-5" /> EXPORT EXCEL
          </Button>
          
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-red-600/20 gap-2"
          >
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

        {/* MONTHLY LOG TAB */}
        <TabsContent value="monthly" className="space-y-6">
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
              <Input 
                type="month" 
                className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 w-full sm:w-44"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
              
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
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/50 border-none">
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 pl-8 w-[100px]">DATE</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-auto">DESCRIPTION</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[120px]">CATEGORY</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[120px]">PAYMENT MODE</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[100px]">STATUS</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[110px] text-right">AMOUNT</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 pr-8 text-right w-[160px]">ACTIONS</th>
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
                        <td className="py-5 break-words whitespace-normal max-w-[200px]">
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
                            {e.status === 'pending' && (user?.role === 'admin' || user?.role === 'manager') && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApprove(e)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg h-8 px-3 text-[10px] uppercase tracking-widest"
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedExpense(e);
                                    setShowRejectModal(true);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg h-8 px-3 text-[10px] uppercase tracking-widest"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {e.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadVoucher(e)}
                                className="border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {e.status === 'rejected' && e.rejection_reason && (
                              <span className="text-[10px] font-bold text-rose-500 italic whitespace-normal break-words max-w-[160px] block">
                                Reason: {e.rejection_reason}
                              </span>
                            )}
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

        {/* DETAILED LEDGER TAB */}
        <TabsContent value="ledger" className="space-y-6">
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
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/50 border-none">
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 pl-8 w-[100px]">DATE</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-auto">DESCRIPTION</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[120px]">CATEGORY</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[120px]">PAYMENT MODE</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[100px]">STATUS</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 w-[110px] text-right">AMOUNT</th>
                    <th className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 py-6 pr-8 text-right w-[160px]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-32 text-center text-slate-400 font-bold uppercase tracking-widest">
                        No expenses found
                      </td>
                    </tr>
                  ) : (
                    allExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 pl-8 font-bold text-slate-600">
                          {e.date ? format(new Date(e.date), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="py-5 break-words whitespace-normal max-w-[200px]">
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
                            {e.status === 'pending' && (user?.role === 'admin' || user?.role === 'manager') && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApprove(e)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg h-8 px-3 text-[10px] uppercase tracking-widest"
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedExpense(e);
                                    setShowRejectModal(true);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg h-8 px-3 text-[10px] uppercase tracking-widest"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {e.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadVoucher(e)}
                                className="border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {e.status === 'rejected' && e.rejection_reason && (
                              <span className="text-[10px] font-bold text-rose-500 italic whitespace-normal break-words max-w-[160px] block">
                                Reason: {e.rejection_reason}
                              </span>
                            )}
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

        {/* CATEGORY INSIGHTS TAB */}
        <TabsContent value="insights" className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Spending by Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EXPENSE_HEADS.map(cat => {
                const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + (e.amount ?? 0), 0);
                const count = expenses.filter(e => e.category === cat).length;
                return (
                  <div key={cat} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{cat}</p>
                    <p className="text-2xl font-black text-slate-900">Rs {total.toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{count} expense{count !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ANNUAL ANALYTICS TAB */}
        <TabsContent value="annual" className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Annual Expense Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, '0');
                const year = new Date().getFullYear();
                const key = `${year}-${month}`;
                const total = expenses.filter(e => e.date?.startsWith(key)).reduce((sum, e) => sum + (e.amount ?? 0), 0);
                return (
                  <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {new Date(year, i).toLocaleString('default', { month: 'long' })} {year}
                    </p>
                    <p className="text-xl font-black text-slate-900">Rs {total.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-slate-100 p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-xl">
                <Plus className="h-6 w-6 text-red-600" />
              </div>
              Add New Expense
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Voucher No</Label>
                <Input value="AUTO-GENERATED" disabled className="h-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</Label>
                <Input 
                  type="date" 
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 font-bold" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description *</Label>
              <Input 
                placeholder="What was this expense for?"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 font-bold" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</Label>
                <Select 
                  value={newExpense.category} 
                  onValueChange={(val) => setNewExpense({...newExpense, category: val})}
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    {EXPENSE_HEADS.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Mode</Label>
                <Select 
                  value={newExpense.payment_mode} 
                  onValueChange={(val) => setNewExpense({...newExpense, payment_mode: val})}
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    {["Cash", "Bank Transfer", "Cheque", "EasyPaisa", "JazzCash"].map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount (Rs) *</Label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 font-bold" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Created By</Label>
                <Input value={user?.name || "System"} disabled className="h-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Linked Event (Optional)</Label>
              <Input 
                placeholder="Event ID or Name"
                value={newExpense.linked_event}
                onChange={(e) => setNewExpense({...newExpense, linked_event: e.target.value})}
                className="h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-red-500 font-bold" 
              />
            </div>
          </div>

          <DialogFooter className="gap-3 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setShowAddModal(false)}
              className="rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddExpense}
              className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl h-12 px-8 shadow-lg shadow-red-600/20 text-xs uppercase tracking-widest"
            >
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Expense Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-slate-100 p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Rejection</Label>
              <Textarea 
                placeholder="Please explain why this expense is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px] bg-slate-50 border-none rounded-2xl focus-visible:ring-rose-500 font-bold p-4"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setShowRejectModal(false)}
              className="rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl h-12 px-8 shadow-lg shadow-rose-600/20 text-xs uppercase tracking-widest"
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
