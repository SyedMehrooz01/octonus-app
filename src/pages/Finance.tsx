import { useState, useEffect, memo } from "react";
import { Landmark, TrendingUp, TrendingDown, Plus, Search, FileText, Download, Calendar, Users, History, Wallet, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LedgerEntry {
  id: string | number;
  date: string;
  description: string;
  account: string;
  type: "debit" | "credit";
  amount: number;
  balance: number;
}

interface Vendor {
  id: string;
  name: string;
  contact: string;
  category: string;
  total_bills: number;
  paid: number;
  balance: number;
}

interface VendorPayment {
  id: string;
  vendor_id: string;
  date: string;
  amount: number;
  method: string;
  notes?: string;
}

const INIT_LEDGER: LedgerEntry[] = [
  { id:1, date:"2024-03-01", description:"Wedding Advance - Tariq & Sana", account:"Cash", type:"debit", amount:150000, balance:150000 },
  { id:2, date:"2024-03-02", description:"Decoration Purchase", account:"Cash", type:"credit", amount:25000, balance:125000 },
  { id:3, date:"2024-03-05", description:"Corporate Dinner Advance - Ali Corp", account:"Bank", type:"debit", amount:100000, balance:225000 },
  { id:4, date:"2024-03-07", description:"Staff Payroll - February", account:"Bank", type:"credit", amount:205500, balance:19500 },
  { id:5, date:"2024-03-10", description:"Birthday Party Advance - Farhan", account:"Cash", type:"debit", amount:30000, balance:49500 },
  { id:6, date:"2024-03-12", description:"Catering Supplies", account:"Cash", type:"credit", amount:18000, balance:31500 },
  { id:7, date:"2024-03-14", description:"Mehndi Ceremony Advance", account:"Cash", type:"debit", amount:110000, balance:141500 },
];

const INIT_SUPPLIERS: any[] = [
  { id:1, name:"Fresh Foods Co.", contact:"0300-9999999", totalBills:185000, paid:120000, balance:65000 },
  { id:2, name:"Decoration World", contact:"0301-8888888", totalBills:95000, paid:95000, balance:0 },
  { id:3, name:"Tent & Furniture Rental", contact:"0302-7777777", totalBills:75000, paid:50000, balance:25000 },
  { id:4, name:"Sound & Lights Pro", contact:"0303-6666666", totalBills:60000, paid:30000, balance:30000 },
];

const EVENT_FINANCE: any[] = [
  { id:1, event:"Tariq & Sana Wedding", date:"2024-03-18", totalAmount:350000, advance:150000, balance:200000, menuCost:300000, thirdPartyCost:15000, profit:35000, status:"confirmed" },
  { id:2, event:"Ali Corp Annual Dinner", date:"2024-03-20", totalAmount:180000, advance:100000, balance:80000, menuCost:60000, thirdPartyCost:0, profit:120000, status:"confirmed" },
  { id:3, event:"Farhan Birthday Party", date:"2024-03-22", totalAmount:75000, advance:30000, balance:45000, menuCost:0, thirdPartyCost:0, profit:75000, status:"tentative" },
  { id:4, event:"Mehndi Ceremony", date:"2024-03-25", totalAmount:220000, advance:110000, balance:110000, menuCost:0, thirdPartyCost:30000, profit:190000, status:"confirmed" },
];

const ACCOUNTS = ["Cash","Bank","Supplier","Vendor","Other"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Online Transfer"];

const Finance = () => {
  const { user, canDo, logAction } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [suppliers, setSuppliers] = useState(INIT_SUPPLIERS);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showPaySupplier, setShowPaySupplier] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [newEntry, setNewEntry] = useState({ date: format(new Date(), "yyyy-MM-dd"), description:"", account:"Cash", type:"debit" as const, amount:"" });
  const [payAmount, setPayAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Account Statement States
  const [accountFilter, setAccountFilter] = useState("all");
  const [fromDate, setFromDate] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // P&L States
  const [plView, setPlView] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Vendor States
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorHistory, setShowVendorHistory] = useState(false);
  const [showPayVendor, setShowPayVendor] = useState(false);
  const [vendorPayForm, setVendorPayForm] = useState({ amount: "", method: "Cash", date: format(new Date(), "yyyy-MM-dd"), notes: "" });

  const fetchFinanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      
      let runningBalance = 0;
      const ledgerData = (data ?? []).map((entry: any) => {
        const amount = Number(entry?.amount || 0);
        runningBalance = entry.type === 'debit' ? runningBalance + amount : runningBalance - amount;
        return {
          id: entry?.id ?? "",
          date: entry?.date ?? format(new Date(), "yyyy-MM-dd"),
          description: entry?.description ?? "No description",
          account: entry?.account ?? "N/A",
          type: entry?.type ?? "debit",
          amount: amount,
          balance: runningBalance
        };
      });
      setLedger(ledgerData);
    } catch (err: any) {
      console.error("Finance ledger fetch error:", err);
      toast({ title: "Error", description: "Failed to fetch ledger entries", variant: "destructive" });
      setLedger([]); // Set to empty on error for safety
    }
  };

  const fetchVendors = async () => {
    try {
      const { data: vData } = await supabase.from('suppliers').select('*');
      if (vData) {
        setVendors((vData ?? []).map((v: any) => ({
          id: v?.id ?? "",
          name: v?.name ?? "Unknown",
          contact: v?.contact_number ?? "N/A",
          category: v?.service_type ?? "N/A",
          total_bills: v?.opening_balance ?? 0,
          paid: (v?.opening_balance ?? 0) - (v?.current_balance ?? 0),
          balance: v?.current_balance ?? 0
        })));
      }
      
      const { data: pData } = await supabase.from('supplier_payments').select('*').order('date', { ascending: false });
      if (pData) {
        setVendorPayments((pData ?? []).map((p: any) => ({
          id: p?.id ?? "",
          vendor_id: p?.supplier_id ?? "",
          date: p?.date ?? format(new Date(), "yyyy-MM-dd"),
          amount: p?.amount ?? 0,
          method: p?.method ?? "Cash",
          notes: p?.notes ?? ""
        })));
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch vendors", variant: "destructive" });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchFinanceData(), fetchVendors()]);
      setLoading(false);
    };
    init();
  }, []);

  const filtered = (ledger ?? []).filter(l => {
    const matchesSearch = (l?.description ?? "").toLowerCase().includes((search ?? "").toLowerCase());
    const matchesAccount = accountFilter === "all" || l?.account === accountFilter;
    const matchesDate = isWithinInterval(parseISO(l?.date ?? format(new Date(), "yyyy-MM-dd")), { 
      start: parseISO(fromDate), 
      end: parseISO(toDate) 
    });
    return matchesSearch && matchesAccount && matchesDate;
  });

  const totalDebit = (ledger ?? []).filter(l=>l?.type==="debit").reduce((s,l)=>s+(l?.amount ?? 0),0);
  const totalCredit = (ledger ?? []).filter(l=>l?.type==="credit").reduce((s,l)=>s+(l?.amount ?? 0),0);
  const netBalance = totalDebit - totalCredit;
  const totalRevenue = (EVENT_FINANCE ?? []).filter(e=>e?.status!=="cancelled").reduce((s,e)=>s+(e?.totalAmount ?? 0),0);
  const totalPending = (EVENT_FINANCE ?? []).filter(e=>e?.status!=="cancelled").reduce((s,e)=>s+(e?.balance ?? 0),0);
  const totalProfit = (EVENT_FINANCE ?? []).filter(e=>e?.status!=="cancelled").reduce((s,e)=>s+(e?.profit ?? 0),0);

  const handleAdd = async () => {
    if (!newEntry.description || !newEntry.amount) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('ledger_entries').insert([{
        date: newEntry.date,
        description: newEntry.description,
        account: newEntry.account,
        type: newEntry.type,
        amount: Number(newEntry.amount),
        created_by: user?.email
      }]);

      if (error) throw error;
      
      await fetchFinanceData();
      setNewEntry({date: format(new Date(), "yyyy-MM-dd"), description:"", account:"Cash", type:"debit", amount:""});
      setShowAdd(false); 
      toast({ title: "Success", description: "Ledger entry saved successfully" });
      logAction(`Added ledger entry: ${newEntry.description}`, "Finance");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save entry", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
      if (error) throw error;
      await fetchFinanceData();
      toast({ title: "Success", description: "Entry deleted successfully" });
      logAction(`Deleted ledger entry ID: ${id}`, "Finance");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePaySupplier = async () => {
    if (!payAmount || !selectedSupplier) return;
    setIsSaving(true);
    try {
      const amt = Number(payAmount);
      setSuppliers((suppliers ?? []).map(s => s?.id === selectedSupplier?.id 
        ? { ...s, paid: (s?.paid ?? 0) + amt, balance: Math.max(0, (s?.balance ?? 0) - amt) } 
        : s
      ));
      toast({ title: "Supplier payment recorded" });
      setShowPaySupplier(false);
      setPayAmount("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Payment failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayVendor = async () => {
    if (!vendorPayForm.amount || !selectedVendor) return;
    setIsSaving(true);
    try {
      const amt = Number(vendorPayForm.amount);
      const { error: pErr } = await supabase.from('supplier_payments').insert([{
        supplier_id: selectedVendor?.id,
        amount: amt,
        method: vendorPayForm.method,
        date: vendorPayForm.date,
        notes: vendorPayForm.notes
      }]);
      if (pErr) throw pErr;

      const { error: sErr } = await supabase.from('suppliers').update({
        current_balance: (selectedVendor?.balance ?? 0) - amt
      }).eq('id', selectedVendor?.id);
      if (sErr) throw sErr;

      toast({title:"Vendor payment recorded"});
      setShowPayVendor(false);
      fetchVendors();
    } catch (err: any) {
      toast({title:"Error", description: err?.message || "Payment failed", variant: "destructive"});
    } finally {
      setIsSaving(false);
    }
  };

  // Export Logic
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${fileName}.xlsx`);
  };

  const exportToPDF = (headers: string[], data: any[][], title: string, fileName: string) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
    });
    doc.save(`${fileName}.pdf`);
  };

  const exportPL = (format: 'pdf' | 'excel') => {
    const data = (EVENT_FINANCE ?? []).map(e => ({
      Event: e?.event ?? "N/A",
      Date: e?.date ?? "N/A",
      Revenue: e?.totalAmount ?? 0,
      "Menu Cost": e?.menuCost ?? 0,
      "3rd Party Cost": e?.thirdPartyCost ?? 0,
      Profit: e?.profit ?? 0,
      Margin: `${Math.round(((e?.profit ?? 0)/(e?.totalAmount ?? 1))*100)}%`
    }));

    if (format === 'excel') {
      exportToExcel(data, `Profit_and_Loss_${selectedYear}`);
    } else {
      const headers = ["Event", "Date", "Revenue", "Menu Cost", "3rd Party Cost", "Profit", "Margin"];
      const rows = data.map(d => Object.values(d));
      exportToPDF(headers, rows, `Profit & Loss Report - ${selectedYear}`, `Profit_and_Loss_${selectedYear}`);
    }
  };

  const exportStatement = (format: 'pdf' | 'excel') => {
    const data = (filtered ?? []).map(l => ({
      Date: l?.date ?? "N/A",
      Description: l?.description ?? "N/A",
      Account: l?.account ?? "N/A",
      Type: l?.type ?? "N/A",
      Amount: l?.amount ?? 0,
      Balance: l?.balance ?? 0
    }));

    if (format === 'excel') {
      exportToExcel(data, `Account_Statement_${accountFilter}_${fromDate}_to_${toDate}`);
    } else {
      const headers = ["Date", "Description", "Account", "Type", "Amount", "Balance"];
      const rows = data.map(d => Object.values(d));
      exportToPDF(headers, rows, `Account Statement: ${accountFilter} (${fromDate} to ${toDate})`, `Account_Statement_${accountFilter}`);
    }
  };

  const totalAdvances = (EVENT_FINANCE ?? []).reduce((s,e)=>s+(e?.advance ?? 0),0);
  
  const yearlyMonths = eachMonthOfInterval({
    start: startOfYear(parseISO(`${selectedYear}-01-01`)),
    end: endOfYear(parseISO(`${selectedYear}-01-01`))
  });

  return (
    <div className="space-y-8 pb-10 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Finance & Accounts</h1>
          <p className="text-slate-500 font-bold mt-1">Manage general ledger, event finance, and profit reports.</p>
        </div>
        {canDo("add") && (
          <Button onClick={()=>setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 h-12 px-8 gap-2 transition-all hover:-translate-y-0.5 animate-in fade-in slide-in-from-right duration-500">
            <Plus className="h-5 w-5"/> ADD LEDGER ENTRY
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {l:"Total Revenue",v:`₨ ${(totalRevenue ?? 0).toLocaleString()}`,c:"from-emerald-500 to-emerald-700",shadow:"shadow-emerald-500/20",icon:TrendingUp},
          {l:"Total Expenses",v:`₨ ${(totalCredit ?? 0).toLocaleString()}`,c:"from-rose-500 to-rose-700",shadow:"shadow-rose-500/20",icon:TrendingDown},
          {l:"Net Cash Balance",v:`₨ ${(netBalance ?? 0).toLocaleString()}`,c:"from-blue-500 to-blue-700",shadow:"shadow-blue-500/20",icon:Landmark},
          {l:"Pending Receivables",v:`₨ ${(totalPending ?? 0).toLocaleString()}`,c:"from-amber-500 to-amber-700",shadow:"shadow-amber-500/20",icon:Wallet}
        ].map((c, i)=>(
          <div key={c.l} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${c.c} p-6 text-white shadow-xl ${c.shadow} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-in fade-in zoom-in duration-500 delay-${i * 100}`}>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                <c.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{c.l}</p>
                <p className="text-2xl font-black truncate tracking-tight">{c.v}</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <c.icon size={140} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="mb-8 h-auto gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
          <TabsTrigger value="ledger" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">General Ledger</TabsTrigger>
          <TabsTrigger value="event" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Event Finance</TabsTrigger>
          <TabsTrigger value="advances" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Advances</TabsTrigger>
          <TabsTrigger value="vendors" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Vendor Ledger</TabsTrigger>
          <TabsTrigger value="pnl" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Profit & Loss</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col xl:flex-row gap-4 xl:items-center bg-slate-50/30">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input placeholder="Search transactions..." className="pl-11 h-12 bg-white border-slate-200 rounded-xl font-bold shadow-sm focus-visible:ring-blue-500/20" value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-40 h-12 rounded-xl border-slate-200 bg-white font-black text-sm shadow-sm focus:ring-blue-500/20"><SelectValue placeholder="All Accounts"/></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Accounts</SelectItem>
                    {ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 h-12 shadow-sm">
                  <Input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="w-36 border-none bg-transparent h-full text-xs font-black focus-visible:ring-0" />
                  <span className="text-slate-300 font-black text-xs">—</span>
                  <Input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="w-36 border-none bg-transparent h-full text-xs font-black focus-visible:ring-0" />
                </div>
                {canDo("export") && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportStatement('pdf')} className="h-12 rounded-xl font-black border-slate-200 bg-white gap-2 px-6 shadow-sm hover:bg-slate-50">
                      <FileText className="h-4 w-4 text-rose-500"/> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportStatement('excel')} className="h-12 rounded-xl font-black border-slate-200 bg-white gap-2 px-6 shadow-sm hover:bg-slate-50">
                      <Download className="h-4 w-4 text-emerald-500"/> EXCEL
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Account</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Type</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((l, idx)=>(
                    <tr key={l.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/40 transition-all duration-200 group`}>
                      <td className="px-6 py-6 text-sm font-black text-slate-500 whitespace-nowrap tracking-tight">{format(new Date(l.date), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-6 text-sm font-black text-[#0f172a] leading-tight tracking-tight">{l.description}</td>
                      <td className="px-6 py-6">
                        <Badge variant="outline" className="rounded-lg font-black text-[10px] uppercase tracking-tighter bg-white border-slate-200 px-3 py-1 shadow-sm">
                          {l.account}
                        </Badge>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm ${l.type==="debit"?"bg-emerald-500 text-white":"bg-rose-500 text-white"}`}>
                          {l.type}
                        </Badge>
                      </td>
                      <td className={`px-6 py-6 text-sm font-black text-right tracking-tight ${l?.type==="debit"?"text-emerald-600":"text-rose-600"}`}>
                        {l?.type==="debit"?"+":"-"} ₨ {(l?.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-6 text-sm font-black text-right text-[#0f172a] tracking-tight">₨ {(l?.balance ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Aggregate Cash Position</td>
                    <td colSpan={2} className={`px-6 py-8 text-right`}>
                      <span className={`px-8 py-3 rounded-2xl font-black text-xl shadow-xl ${netBalance>=0?"bg-emerald-500 text-white shadow-emerald-500/20":"bg-rose-500 text-white shadow-rose-500/20"}`}>
                        ₨ {(netBalance ?? 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="event" className="space-y-6">
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/5">
              <h3 className="text-xl font-black text-foreground">Event-Based Financial Tracking</h3>
              <p className="text-sm text-muted-foreground font-medium mt-1">Detailed breakdown of revenue, costs and profit per event</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-muted/30 text-left border-b border-border">
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Event Detail</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Revenue</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Advance</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Pending</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Profit</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(EVENT_FINANCE ?? []).map((e, idx)=>(
                    <tr key={e?.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/10'} hover:bg-primary/5 transition-colors`}>
                      <td className="px-6 py-5 text-sm font-black text-foreground">{e?.event}</td>
                      <td className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-tighter">{e?.date ? format(new Date(e.date), 'MMM d, yyyy') : "N/A"}</td>
                      <td className="px-6 py-5 text-sm font-black text-foreground">₨ {(e?.totalAmount ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-5 text-sm font-bold text-emerald-600">₨ {(e?.advance ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-5 text-sm font-bold text-rose-500">₨ {(e?.balance ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black text-sm">₨ {(e?.profit ?? 0).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Badge className={`${e?.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'} text-white border-none rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter`}>
                          {e?.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ADVANCE TRACKING */}
        <TabsContent value="advances">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-card-foreground">Advance Tracking — Live Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Total Advances Received</p><p className="text-xl font-bold text-primary">₨{(totalAdvances ?? 0).toLocaleString()}</p></div>
              <div className="rounded-lg bg-success/5 border border-success/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Total Revenue</p><p className="text-xl font-bold text-success">₨{(totalRevenue ?? 0).toLocaleString()}</p></div>
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Pending Balance</p><p className="text-xl font-bold text-destructive">₨{(totalPending ?? 0).toLocaleString()}</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
              <thead><tr className="border-b border-border bg-muted/40">{["Event","Total","Advance","Balance","% Paid"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {(EVENT_FINANCE ?? []).map(e=>{
                  const pct = Math.round(((e?.advance ?? 0)/(e?.totalAmount ?? 1))*100);
                  return <tr key={e?.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground">{e?.event}</td>
                    <td className="px-4 py-3 text-sm text-card-foreground">₨{(e?.totalAmount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-success">₨{(e?.advance ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-destructive">₨{(e?.balance ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${pct>=100?"bg-success":pct>=50?"bg-primary":"bg-warning"}`} style={{width:`${pct}%`}}/></div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
            </div>
          </div>
        </TabsContent>

        {/* SUPPLIER LEDGER */}
        <TabsContent value="suppliers">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><h3 className="text-sm font-semibold text-card-foreground">Supplier/Vendor Ledger — Auto profit calculation</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead><tr className="border-b border-border bg-muted/40">{["Supplier","Contact","Total Bills","Paid","Balance","Action"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {(suppliers ?? []).map(s=>(
                    <tr key={s?.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{s?.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s?.contact}</td>
                      <td className="px-4 py-3 text-sm text-card-foreground">₨{(s?.totalBills ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-success">₨{(s?.paid ?? 0).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${(s?.balance ?? 0)>0?"text-destructive":"text-success"}`}>₨{(s?.balance ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{(s?.balance ?? 0)>0&&<button onClick={()=>{ setSelectedSupplier(s); setShowPaySupplier(true); }} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20">Pay Now</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-muted/40">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold">Total Outstanding</td>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-destructive">₨{(suppliers ?? []).reduce((s,x)=>s+(x?.balance ?? 0),0).toLocaleString()}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* VENDOR LEDGER */}
        <TabsContent value="vendors">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">Vendor Ledger</h3>
                <p className="text-xs text-muted-foreground mt-1">Full transaction history and payment tracking</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchVendors}><History className="h-4 w-4 mr-1"/> Refresh</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead><tr className="border-b border-border bg-muted/40">{["Vendor","Service","Opening Bal","Paid","Outstanding","Action"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {(vendors ?? []).map(v=>(
                    <tr key={v?.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground"/>
                        {v?.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{v?.category}</td>
                      <td className="px-4 py-3 text-sm">₨{(v?.total_bills ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-success">₨{(v?.paid ?? 0).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${(v?.balance ?? 0)>0?"text-destructive":"text-success"}`}>₨{(v?.balance ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedVendor(v); setShowVendorHistory(true); }} className="h-8 px-2"><FileText className="h-4 w-4"/></Button>
                        {(v?.balance ?? 0) > 0 && <Button size="sm" onClick={() => { setSelectedVendor(v); setVendorPayForm({...vendorPayForm, amount: ""}); setShowPayVendor(true); }} className="h-8 px-2">Pay</Button>}
                      </td>
                    </tr>
                  ))}
                  {(vendors ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No vendors found. Add them in Event Booking - Supplier Ledger.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* P&L */}
        <TabsContent value="pnl">
          <div className="space-y-4">
            {/* Event-wise P&L */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-base font-semibold text-card-foreground">Profit & Loss Report</h3>
                  <div className="flex bg-muted p-1 rounded-lg">
                    {(["monthly", "yearly"] as const).map(v => (
                      <button 
                        key={v} 
                        onClick={() => setPlView(v)} 
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${plView === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  {plView === "yearly" && (
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["2024", "2025", "2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportPL('pdf')}><FileText className="h-4 w-4 mr-2"/>PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => exportPL('excel')}><Download className="h-4 w-4 mr-2"/>Excel</Button>
                </div>
              </div>

              {plView === "monthly" ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead><tr className="border-b border-border bg-muted/40">{["Event","Revenue","Menu Cost","3rd Party Cost","Net Profit","Margin"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody>
                      {(EVENT_FINANCE ?? []).map(e=>{
                        const margin = Math.round(((e?.profit ?? 0)/(e?.totalAmount ?? 1))*100);
                        return <tr key={e?.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 text-sm font-medium text-card-foreground">{e?.event}</td>
                          <td className="px-4 py-3 text-sm text-success">₨{(e?.totalAmount ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-destructive">{(e?.menuCost ?? 0)>0?`₨${(e?.menuCost ?? 0).toLocaleString()}`:"-"}</td>
                          <td className="px-4 py-3 text-sm text-destructive">{(e?.thirdPartyCost ?? 0)>0?`₨${(e?.thirdPartyCost ?? 0).toLocaleString()}`:"-"}</td>
                          <td className="px-4 py-3 text-sm font-bold text-success">₨{(e?.profit ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${margin>=50?"bg-success/10 text-success border-success/20":margin>=30?"bg-warning/10 text-warning border-warning/20":"bg-destructive/10 text-destructive border-destructive/20"}`}>{margin}%</span></td>
                        </tr>;
                      })}
                    </tbody>
                    <tfoot><tr className="bg-muted/40">
                      <td className="px-4 py-3 text-sm font-semibold">Monthly Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-success">₨{(totalRevenue ?? 0).toLocaleString()}</td>
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-destructive">₨{(EVENT_FINANCE ?? []).reduce((s,e)=>s+(e?.menuCost ?? 0)+(e?.thirdPartyCost ?? 0),0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-bold text-success">₨{(totalProfit ?? 0).toLocaleString()}</td>
                      <td/>
                    </tr></tfoot>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead><tr className="border-b border-border bg-muted/40">{["Month","Total Income","Total Expenses","Net Profit/Loss"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody>
                      {yearlyMonths.map(month => {
                        const monthStr = format(month, "MM");
                        const monthEvents = (EVENT_FINANCE ?? []).filter(e => (e?.date ?? "").startsWith(`${selectedYear}-${monthStr}`));
                        const mIncome = monthEvents.reduce((s, e) => s + (e?.totalAmount ?? 0), 0);
                        const mExpenses = monthEvents.reduce((s, e) => s + (e?.menuCost ?? 0) + (e?.thirdPartyCost ?? 0), 0);
                        const mProfit = mIncome - mExpenses;
                        return (
                          <tr key={month.toISOString()} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm font-medium text-card-foreground">{format(month, "MMMM")}</td>
                            <td className="px-4 py-3 text-sm text-success font-bold">₨{(mIncome ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-destructive font-bold">₨{(mExpenses ?? 0).toLocaleString()}</td>
                            <td className={`px-4 py-3 text-sm font-black ${mProfit >= 0 ? "text-primary" : "text-destructive"}`}>₨{(mProfit ?? 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr className="bg-muted/40">
                      <td className="px-4 py-3 text-sm font-bold uppercase tracking-widest">Yearly Totals</td>
                      <td className="px-4 py-3 text-lg font-black text-success">₨{(totalRevenue ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-lg font-black text-destructive">₨{(EVENT_FINANCE ?? []).reduce((s,e)=>s+(e?.menuCost ?? 0)+(e?.thirdPartyCost ?? 0),0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xl font-black text-primary">₨{(totalProfit ?? 0).toLocaleString()}</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Monthly P&L Summary */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h3 className="mb-4 text-base font-semibold text-card-foreground">Monthly P&L Summary — March 2024</h3>
              <div className="space-y-3">
                <div className="rounded-lg bg-success/5 border border-success/20 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-success">Income</h4>
                  {(ledger ?? []).filter(l=>l?.type==="debit").map(l=>(
                    <div key={l?.id} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{l?.description}</span><span className="font-medium text-card-foreground">₨{(l?.amount ?? 0).toLocaleString()}</span></div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-success/20 pt-2 text-sm font-bold"><span>Total Income</span><span className="text-success">₨{(totalDebit ?? 0).toLocaleString()}</span></div>
                </div>
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-destructive">Expenses</h4>
                  {(ledger ?? []).filter(l=>l?.type==="credit").map(l=>(
                    <div key={l?.id} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{l?.description}</span><span className="font-medium text-card-foreground">₨{(l?.amount ?? 0).toLocaleString()}</span></div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-destructive/20 pt-2 text-sm font-bold"><span>Total Expenses</span><span className="text-destructive">₨{(totalCredit ?? 0).toLocaleString()}</span></div>
                </div>
                <div className={`rounded-lg p-4 ${(netBalance ?? 0)>=0?"bg-primary/10 border border-primary/20":"bg-destructive/10 border border-destructive/20"}`}>
                  <div className="flex justify-between text-base font-bold"><span>Net Profit / Loss</span><span className={(netBalance ?? 0)>=0?"text-primary":"text-destructive"}>₨{(netBalance ?? 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD ENTRY MODAL */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Finance Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={newEntry.date} onChange={e=>setNewEntry({...newEntry,date:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Description</Label><Input placeholder="e.g. Wedding Advance Payment" value={newEntry.description} onChange={e=>setNewEntry({...newEntry,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Account</Label><Select value={newEntry.account} onValueChange={v=>setNewEntry({...newEntry,account:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ACCOUNTS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Type</Label><Select value={newEntry.type} onValueChange={v=>setNewEntry({...newEntry,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="debit">Debit (Income)</SelectItem><SelectItem value="credit">Credit (Expense)</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Amount (₨)</Label><Input type="number" placeholder="e.g. 50000" value={newEntry.amount} onChange={e=>setNewEntry({...newEntry,amount:e.target.value})}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button><Button onClick={handleAdd}>Save Entry</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAY SUPPLIER MODAL */}
      <Dialog open={showPaySupplier} onOpenChange={setShowPaySupplier}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay Supplier — {selectedSupplier?.name}</DialogTitle></DialogHeader>
          {selectedSupplier&&<div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-sm"><span className="text-muted-foreground">Outstanding Balance: </span><span className="font-bold text-destructive">₨{(selectedSupplier?.balance ?? 0).toLocaleString()}</span></div>
            <div className="space-y-1.5"><Label>Payment Amount (₨)</Label><Input type="number" placeholder="Enter amount" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={()=>setShowPaySupplier(false)}>Cancel</Button><Button onClick={handlePaySupplier}>Record Payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VENDOR HISTORY MODAL */}
      <Dialog open={showVendorHistory} onOpenChange={setShowVendorHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History — {selectedVendor?.name}</DialogTitle>
            <DialogDescription>Full record of bills and payments</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Opening Bal</p>
                <p className="text-sm font-bold">₨{(selectedVendor?.total_bills ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Paid</p>
                <p className="text-sm font-bold text-success">₨{(selectedVendor?.paid ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Outstanding</p>
                <p className="text-sm font-bold text-destructive">₨{(selectedVendor?.balance ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(vendorPayments ?? []).filter(p => p?.vendor_id === selectedVendor?.id).map(p => (
                  <tr key={p?.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{p?.date}</td>
                    <td className="px-3 py-2">Payment via {p?.method} {p?.notes ? `(${p.notes})` : ""}</td>
                    <td className="px-3 py-2 text-right text-success font-medium">- ₨{(p?.amount ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">Opening</td>
                  <td className="px-3 py-2">Initial Balance</td>
                  <td className="px-3 py-2 text-right font-medium">₨{(selectedVendor?.total_bills ?? 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowVendorHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAY VENDOR MODAL */}
      <Dialog open={showPayVendor} onOpenChange={setShowPayVendor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {selectedVendor?.name}</DialogTitle>
            <DialogDescription>Record a new payment to this vendor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Outstanding Balance:</span>
              <span className="text-lg font-bold text-destructive">₨{(selectedVendor?.balance ?? 0).toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Amount (₨)</Label>
              <Input type="number" placeholder="Enter amount" value={vendorPayForm.amount} onChange={e => setVendorPayForm({...vendorPayForm, amount: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={vendorPayForm.method} onValueChange={v => setVendorPayForm({...vendorPayForm, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={vendorPayForm.date} onChange={e => setVendorPayForm({...vendorPayForm, date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={vendorPayForm.notes} onChange={e => setVendorPayForm({...vendorPayForm, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayVendor(false)}>Cancel</Button>
            <Button onClick={handlePayVendor} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(Finance);
