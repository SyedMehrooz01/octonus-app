import { useState, useEffect, useMemo, memo } from "react";
import { Receipt, Plus, Search, TrendingDown, Calendar, Loader2, Download, FileText, Filter, ChevronLeft, ChevronRight, BarChart3, PieChart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as financeService from "@/services/financeService";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfToday, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SkeletonLoading from "@/components/SkeletonLoading";

const EXPENSE_HEADS = ["Utilities", "Staff", "Kitchen Supplies", "Decoration", "Marketing", "Maintenance", "Transport", "Miscellaneous"];
const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "Online Transfer"];

const numberToWords = (num: number): string => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if (num === 0) return "Zero";
  
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return n.toString();
  };
  
  return convert(Math.floor(num)) + " Rupees Only";
};

interface Expense {
  id: string;
  voucher_no?: string | null;
  date: string;
  description: string;
  category: string;
  payment_mode: string;
  amount: number;
  linked_event?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_id?: string | null;
  created_by_role?: string | null;
  created_at?: string;
  rejection_reason?: string | null;
}

const Expenses = () => {
  const { user, canDo, logAction } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionModal, setRejectionModal] = useState<{show: boolean, id: string, reason: string}>({ show: false, id: "", reason: "" });
  
  // New States
  const [viewType, setPlViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("");
  
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

  const fetchExpenses = useCallback(async (isMounted = true) => {
    if (isMounted) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await financeService.getExpenses();
      if (!isMounted) return;
      if (!data) throw new Error("Failed to fetch expenses.");
      setExpenses(data); 
    } catch (error: any) {
      console.error("fetchExpenses unexpected error:", error);
      if (isMounted) {
        setError(error.message || "Failed to fetch expenses.");
        setExpenses([]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchExpenses(isMounted);
    return () => { isMounted = false; };
  }, [fetchExpenses]);

  const handleAdd = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.head) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await financeService.addExpense({
        date: newExpense.date,
        description: newExpense.description,
        category: newExpense.head,
        amount: Number(newExpense.amount),
        payment_mode: newExpense.payment_mode,
        linked_event: newExpense.event_id,
        status: 'pending',
        created_by: user?.email,
        created_by_name: user?.name || user?.email,
        created_by_id: user?.id,
        created_by_role: user?.role || 'user',
        created_at: new Date().toISOString()
      });

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
      toast.error(error.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsSubmitting(true);
    try {
      await financeService.updateExpenseStatus(id, {
        status: 'approved',
        approved_by: user?.name || user?.email,
        approved_at: new Date().toISOString()
      });

      toast.success("Expense approved");
      fetchExpenses();
    } catch (error: any) {
      toast.error("Failed to approve expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionModal.reason) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.updateExpenseStatus(rejectionModal.id, {
        status: 'rejected',
        rejection_reason: rejectionModal.reason
      });

      toast.success("Expense rejected");
      setRejectionModal({ show: false, id: "", reason: "" });
      fetchExpenses();
    } catch (error: any) {
      toast.error("Failed to reject expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadLogo = async (pdf: jsPDF, x: number, y: number, size: number) => {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.src = "/logo.png";
      img.onload = () => {
        try {
          pdf.addImage(img, 'PNG', x, y, size, size);
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      };
      img.onerror = () => {
        resolve(false);
      };
    });
  };

  const downloadVoucher = async (expense: Expense) => {
    if (expense.status !== 'approved') {
      toast.error("Only approved expenses can have vouchers");
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const companyGreen = "#2D6A4F";
    const darkNavy = "#0f172a";
    
    // --- HEADER: Green professional accent bar ---
    doc.setFillColor(companyGreen);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Header Info
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Octonus Solutions", 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("A Spectacular Turn of Events", 15, 27);
    
    // Logo Handling - Positioned in the top right
    const logoLoaded = await loadLogo(doc, 160, 5, 30);
    if (!logoLoaded) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.circle(175, 20, 12, 'S');
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("OCTONUS", 175, 19, { align: "center" });
      doc.text("SOLUTIONS", 175, 22, { align: "center" });
    }
    
    // --- VOUCHER TITLE SECTION ---
    doc.setTextColor(darkNavy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("EXPENSE VOUCHER", pageWidth / 2, 55, { align: "center" });
    
    // Decorative line under title
    doc.setDrawColor(companyGreen);
    doc.setLineWidth(0.8);
    doc.line(pageWidth/2 - 25, 58, pageWidth/2 + 25, 58);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Voucher No: EXP-2026-${expense.id.slice(0, 4).toUpperCase()}`, 195, 68, { align: "right" });
    
    // --- TWO COLUMN DETAILS SECTION ---
    const infoY = 80;
    
    // Left Box: Expense Info
    doc.setFillColor(248, 250, 252);
    doc.rect(15, infoY, 85, 35, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, infoY, 85, 35, "S");
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "bold");
    doc.text("EXPENSE DETAILS:", 20, infoY + 7);
    
    doc.setTextColor(darkNavy);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Date:", 20, infoY + 15);
    doc.setFont("helvetica", "bold");
    doc.text(expense.date ? format(new Date(expense.date), "do MMMM yyyy") : "N/A", 50, infoY + 15);
    
    doc.setFont("helvetica", "normal");
    doc.text("Category:", 20, infoY + 22);
    doc.setFont("helvetica", "bold");
    doc.text(expense.category, 50, infoY + 22);
    
    doc.setFont("helvetica", "normal");
    doc.text("Payment:", 20, infoY + 29);
    doc.setFont("helvetica", "bold");
    doc.text(expense.payment_mode, 50, infoY + 29);

    // Right Box: Transaction Info
    doc.setFillColor(248, 250, 252);
    doc.rect(110, infoY, 85, 35, "F");
    doc.rect(110, infoY, 85, 35, "S");
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION INFO:", 115, infoY + 7);
    
    doc.setTextColor(darkNavy);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Event:", 115, infoY + 15);
    doc.setFont("helvetica", "bold");
    const splitEvent = doc.splitTextToSize(expense.linked_event || "General", 40);
    doc.text(splitEvent, 140, infoY + 15);
    
    doc.setFont("helvetica", "normal");
    doc.text("Status:", 115, infoY + 25);
    doc.setTextColor(companyGreen);
    doc.setFont("helvetica", "bold");
    doc.text(expense.status.toUpperCase(), 140, infoY + 25);
    
    // --- DESCRIPTION SECTION ---
    const descY = infoY + 45;
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION / PARTICULARS:", 15, descY);
    
    doc.setTextColor(darkNavy);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitDesc = doc.splitTextToSize(expense.description, 180);
    doc.text(splitDesc, 15, descY + 7);
    
    // --- AMOUNT SECTION ---
    const amtY = descY + 25;
    doc.setFillColor(45, 106, 79);
    doc.rect(15, amtY, 180, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT:", 25, amtY + 10);
    doc.setFontSize(14);
    doc.text(`PKR ${expense.amount.toLocaleString()}/-`, 185, amtY + 10, { align: "right" });
    
    doc.setTextColor(darkNavy);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Amount in words: ${numberToWords(expense.amount)}`, 15, amtY + 22);
    
    // --- SIGNATURES ---
    const sigY = pageHeight - 55;
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    
    doc.line(20, sigY, 70, sigY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PREPARED BY", 45, sigY + 5, { align: "center" });
    
    doc.line(140, sigY, 190, sigY);
    doc.text("AUTHORIZED SIGNATORY", 165, sigY + 5, { align: "center" });
    
    // --- FOOTER ---
    doc.setFillColor(45, 106, 79);
    doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const footerText1 = `Office No. 2, Crown Centre, Gulshan-e-Iqbal, Karachi | Phone: +92-331-3195292`;
    const footerText2 = `Email: octonussolutions@gmail.com | Web: www.octonussolutions.com.pk`;
    
    doc.text(footerText1, pageWidth / 2, pageHeight - 11, { align: "center" });
    doc.text(footerText2, pageWidth / 2, pageHeight - 6, { align: "center" });
    
    doc.save(`Voucher_${expense.voucher_no || expense.id.slice(0, 8)}.pdf`);
  };

  const downloadLedgerExcel = () => {
    const data = ledgerFiltered.map(e => ({
      "Date": e.date,
      "Description": e.description,
      "Category": e.category,
      "Payment Mode": e.payment_mode,
      "Amount": e.amount,
      "Status": e.status,
      "Voucher No": e.voucher_no || `EXP-${e.id.slice(0, 4).toUpperCase()}`
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses Ledger");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Expenses_Ledger_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const downloadLedgerPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Expenses Ledger Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 30);
    doc.text(`Filter Period: ${format(parseISO(fromDate), "PP")} to ${format(parseISO(toDate), "PP")}`, 14, 36);
    
    const tableData = ledgerFiltered.map(e => [
      e.date,
      e.description,
      e.category,
      e.payment_mode,
      e.amount.toLocaleString(),
      e.status.toUpperCase()
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [["Date", "Description", "Category", "Mode", "Amount", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [45, 106, 79] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const total = ledgerFiltered.reduce((sum, e) => sum + e.amount, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`Total Amount: PKR ${total.toLocaleString()}`, 196, finalY, { align: "right" });
    
    doc.save(`Expenses_Ledger_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  // Filtered expenses for entries tab
  const filtered = useMemo(() => {
    // Start with all expenses
    let results = [...(expenses ?? [])];
    
    // Only filter if search is provided
    if (search) {
      results = results.filter(e => (e?.description ?? "").toLowerCase().includes(search.toLowerCase()));
    }
    
    // Only filter if category is not "all"
    if (filterHead !== "all") {
      results = results.filter(e => e?.category === filterHead);
    }
    
    // Only filter by month if selectedMonth is set (and maybe skip if we want to show all initially)
    // To show ALL initially, we can make selectedMonth default to something that doesn't filter,
    // or just check if it's set.
    if (selectedMonth) {
      results = results.filter(e => (e?.date ?? "").startsWith(selectedMonth));
    }
    
    return results;
  }, [expenses, search, filterHead, selectedMonth]);

  // Ledger filtering
  const ledgerFiltered = useMemo(() => {
    const results = (expenses ?? []).filter(e => {
      const matchSearch = (e?.description ?? "").toLowerCase().includes((ledgerSearch ?? "").toLowerCase());
      const matchCategory = ledgerHead === "all" || e?.category === ledgerHead;
      const matchMode = ledgerMode === "all" || e?.payment_mode === ledgerMode;
      const matchDate = isWithinInterval(parseISO(e?.date ?? format(new Date(), "yyyy-MM-dd")), {
        start: parseISO(fromDate),
        end: parseISO(toDate)
      });
      return matchSearch && matchCategory && matchMode && matchDate;
    });
    return results;
  }, [expenses, ledgerSearch, ledgerHead, ledgerMode, fromDate, toDate]);

  const totalPages = Math.ceil((ledgerFiltered ?? []).length / itemsPerPage);
  const paginatedLedger = (ledgerFiltered ?? []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = format(startOfToday(), "yyyy-MM-dd");
  const currentMonthStr = format(new Date(), "yyyy-MM");

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + (e?.amount ?? 0), 0);
  const todayExpenses = (expenses ?? []).filter(e => e?.date === todayStr).reduce((s, e) => s + (e?.amount ?? 0), 0);
  const monthExpenses = (expenses ?? []).filter(e => e?.date?.startsWith(currentMonthStr)).reduce((s, e) => s + (e?.amount ?? 0), 0);

  // Yearly Breakdown logic
  const yearlyMonths = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(parseISO(`${selectedYear}-01-01`)),
      end: endOfYear(parseISO(`${selectedYear}-01-01`))
    });
  }, [selectedYear]);

  const yearlyExpenses = (expenses ?? []).filter(e => (e?.date ?? "").startsWith(selectedYear));
  const totalYearly = (yearlyExpenses ?? []).reduce((s, e) => s + (e?.amount ?? 0), 0);

  const yearlyByMonth = yearlyMonths.map(month => {
    const mStr = format(month, "yyyy-MM");
    return {
      label: format(month, "MMMM"),
      total: (expenses ?? []).filter(e => (e?.date ?? "").startsWith(mStr)).reduce((s, e) => s + (e?.amount ?? 0), 0)
    };
  });

  const yearlyByHead = EXPENSE_HEADS.map(head => ({
    head,
    total: (yearlyExpenses ?? []).filter(e => e?.category === head).reduce((s, e) => s + (e?.amount ?? 0), 0)
  })).filter(h => (h?.total ?? 0) > 0).sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));

  // Grouping logic for reports
  const groupByCategory = useMemo(() => {
    return EXPENSE_HEADS.map(head => ({
      name: head,
      total: (expenses ?? []).filter(e => e?.category === head).reduce((s, e) => s + (e?.amount ?? 0), 0)
    })).filter(g => (g?.total ?? 0) > 0).sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));
  }, [expenses]);

  const groupByPayment = useMemo(() => {
    return PAYMENT_MODES.map(mode => ({
      name: mode,
      total: (expenses ?? []).filter(e => e?.payment_mode === mode).reduce((s, e) => s + (e?.amount ?? 0), 0)
    })).filter(g => (g?.total ?? 0) > 0).sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));
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
    const data = (ledgerFiltered ?? []).map(e => ({
      Date: e?.date ?? "N/A",
      Description: e?.description ?? "N/A",
      Category: e?.category ?? "N/A",
      Mode: e?.payment_mode ?? "N/A",
      Amount: e?.amount ?? 0
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
      const data = (yearlyByMonth ?? []).map(m => ({ Month: m?.label ?? "N/A", Total: m?.total ?? 0 }));
      exportToExcel(data, `Yearly_Expense_Report_${selectedYear}`);
    } else {
      const headers = ["Month", "Total Expense"];
      const rows = (yearlyByMonth ?? []).map(m => [m?.label ?? "N/A", `₨ ${(m?.total ?? 0).toLocaleString()}`]);
      exportToPDF(headers, rows, `Yearly Expense Report - ${selectedYear}`, `Yearly_Report_${selectedYear}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="h-20 w-full bg-white rounded-3xl animate-pulse" />
        <SkeletonLoading type="stats" />
        <div className="h-12 w-64 bg-slate-100 rounded-xl animate-pulse mb-8" />
        <div className="bg-white rounded-3xl border border-slate-100 p-6">
          <SkeletonLoading type="table" count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="font-bold">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchExpenses(true)} className="ml-auto text-rose-600 hover:bg-rose-100 font-black uppercase text-[10px] tracking-widest">Retry</Button>
        </div>
      )}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight uppercase">Expense Management</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1">
            Total: {expenses?.length || 0} expenses found
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right duration-500">
          <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60">
            {(["monthly", "yearly"] as const).map(v => (
              <button 
                key={v} 
                onClick={() => setPlViewType(v)} 
                className={`px-4 sm:px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-[0.2em] ${viewType === v ? "bg-white text-blue-600 shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
              >
                {v}
              </button>
            ))}
          </div>
          {canDo("add") && (
            <Button onClick={() => setShowAddModal(true)} className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/20 h-12 px-6 sm:px-8 gap-2 transition-all hover:-translate-y-0.5">
              <Plus className="h-5 w-5" /> ADD EXPENSE
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Today's Burn Rate", value: `₨ ${(todayExpenses ?? 0).toLocaleString()}`, icon: Calendar, color: "from-rose-500 to-rose-700", shadow: "shadow-rose-500/20", sub: format(new Date(), "PP") },
          { 
            label: viewType === "monthly" ? "Current Month Burn" : "Annual Burn Rate", 
            value: `₨ ${((viewType === "monthly" ? monthExpenses : totalYearly) ?? 0).toLocaleString()}`, 
            icon: TrendingDown, 
            color: "from-orange-500 to-orange-700",
            shadow: "shadow-orange-500/20",
            sub: viewType === "monthly" ? format(new Date(), "MMMM yyyy") : selectedYear
          },
          { label: "Aggregate Burn", value: `₨ ${(totalExpenses ?? 0).toLocaleString()}`, icon: Receipt, color: "from-blue-500 to-blue-700", shadow: "shadow-blue-500/20", sub: "All time records" },
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
              <table className="w-full min-w-[900px] table-fixed">
                <thead>
                  <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                    <th className="w-[12%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                    <th className="w-[28%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                    <th className="w-[15%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="w-[15%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Mode</th>
                    <th className="w-[12%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="w-[13%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                    <th className="w-[5%] px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-6 py-8"><div className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" /></td></tr>
                    ))
                  ) : (filtered ?? []).length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                          <Search className="h-8 w-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                      </div>
                    </td></tr>
                  ) : (filtered ?? []).map((e, idx) => (
                    <tr key={e?.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-rose-50/40 transition-all duration-200 group`}>
                      <td className="px-6 py-6 text-sm font-black text-slate-500 whitespace-nowrap tracking-tight">{e?.date ? format(new Date(e.date), 'MMM d, yyyy') : "N/A"}</td>
                      <td className="px-6 py-6 truncate">
                        <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-rose-600 transition-colors truncate" title={e?.description}>{e?.description}</p>
                        {e?.linked_event && <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter mt-2 flex items-center gap-1.5 truncate"><span className="h-1 w-1 rounded-full bg-blue-300 flex-shrink-0" /> Event: {e?.linked_event}</p>}
                      </td>
                      <td className="px-6 py-6">
                        <Badge variant="outline" className="rounded-lg font-black text-[10px] uppercase tracking-tighter bg-white border-slate-200 px-3 py-1 shadow-sm truncate">
                          {e?.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-6">
                        <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm truncate ${e?.payment_mode === "Cash" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}`}>
                          {e?.payment_mode}
                        </Badge>
                      </td>
                      <td className="px-6 py-6">
                        <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm truncate ${e?.status === 'approved' ? 'bg-emerald-500 text-white' : e?.status === 'rejected' ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'}`}>
                          {e?.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-6 text-sm font-black text-right text-rose-600 tracking-tight whitespace-nowrap">₨ {(e?.amount ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {e?.status === 'pending' && canDo('edit') && (
                            <>
                              <Button size="sm" onClick={() => handleApprove(e.id)} className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white px-2">Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => setRejectionModal({ show: true, id: e.id, reason: "" })} className="h-8 text-rose-500 border-rose-200 hover:bg-rose-50 px-2">Reject</Button>
                            </>
                          )}
                          {e?.status === 'approved' && (
                            <Button size="sm" variant="ghost" onClick={() => downloadVoucher(e)} className="h-8 w-8 p-0 text-blue-600" title="Download Voucher">
                              <Download className="h-4 w-4"/>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 border-t-2 border-slate-100">
                  <tr>
                    <td colSpan={5} className="px-6 py-10">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Aggregate Total</p>
                    </td>
                    <td className="px-6 py-10 text-right">
                      <div className="inline-flex items-center justify-center bg-rose-500 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg shadow-rose-500/10 whitespace-nowrap">
                        ₨ {(filtered ?? []).reduce((s, e) => s + (e?.amount ?? 0), 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-10"></td>
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
                  {(paginatedLedger ?? []).map(e => (
                    <tr key={e?.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e?.date}</td>
                      <td className="px-4 py-3 text-sm font-medium">{e?.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e?.category}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e?.payment_mode}</td>
                      <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {(e?.amount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40">
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold">Running Total (Filtered)</td>
                    <td className="px-4 py-3 text-sm font-bold text-destructive">₨ {(ledgerFiltered ?? []).reduce((s,e)=>s+(e?.amount ?? 0),0).toLocaleString()}</td>
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

      {/* Rejection Reason Modal */}
      <Dialog open={rejectionModal.show} onOpenChange={(val) => setRejectionModal(prev => ({ ...prev, show: val }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Reason for Rejection</Label>
              <textarea 
                className="w-full h-32 rounded-xl border border-slate-200 p-4 text-sm font-bold outline-none resize-none focus:ring-2 focus:ring-rose-500/20"
                placeholder="Why is this expense being rejected?"
                value={rejectionModal.reason}
                onChange={e => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionModal({ show: false, id: "", reason: "" })} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleReject} disabled={isSubmitting} className="bg-rose-500 hover:bg-rose-600 text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(Expenses);
