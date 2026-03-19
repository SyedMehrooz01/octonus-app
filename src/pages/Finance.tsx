import { useState, useEffect } from "react";
import { Landmark, TrendingUp, TrendingDown, Plus, Search, FileText, Download, Calendar, Users, History, Wallet, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { canDo, logAction } = useAuth();
  const { toast } = useToast();
  const [ledger, setLedger] = useState<LedgerEntry[]>(INIT_LEDGER);
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

  const fetchVendors = async () => {
    try {
      const { data: vData } = await supabase.from('suppliers').select('*');
      if (vData) {
        setVendors(vData.map((v: any) => ({
          id: v.id,
          name: v.name,
          contact: v.contact_number,
          category: v.service_type,
          total_bills: v.opening_balance || 0,
          paid: (v.opening_balance || 0) - (v.current_balance || 0),
          balance: v.current_balance || 0
        })));
      }
      
      const { data: pData } = await supabase.from('supplier_payments').select('*').order('date', { ascending: false });
      if (pData) setVendorPayments(pData);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filtered = ledger.filter(l => {
    const matchesSearch = l.description.toLowerCase().includes(search.toLowerCase());
    const matchesAccount = accountFilter === "all" || l.account === accountFilter;
    const matchesDate = isWithinInterval(parseISO(l.date), { 
      start: parseISO(fromDate), 
      end: parseISO(toDate) 
    });
    return matchesSearch && matchesAccount && matchesDate;
  });

  const totalDebit = ledger.filter(l=>l.type==="debit").reduce((s,l)=>s+l.amount,0);
  const totalCredit = ledger.filter(l=>l.type==="credit").reduce((s,l)=>s+l.amount,0);
  const netBalance = totalDebit - totalCredit;
  const totalRevenue = EVENT_FINANCE.filter(e=>e.status!=="cancelled").reduce((s,e)=>s+e.totalAmount,0);
  const totalPending = EVENT_FINANCE.filter(e=>e.status!=="cancelled").reduce((s,e)=>s+e.balance,0);
  const totalProfit = EVENT_FINANCE.filter(e=>e.status!=="cancelled").reduce((s,e)=>s+e.profit,0);

  const handleAdd = () => {
    if (!newEntry.description||!newEntry.amount) return;
    const amount = Number(newEntry.amount);
    const lastBal = ledger[ledger.length-1]?.balance||0;
    const balance = newEntry.type==="debit" ? lastBal+amount : lastBal-amount;
    setLedger([...ledger,{id:Date.now(),...newEntry,amount,balance}]);
    setNewEntry({date: format(new Date(), "yyyy-MM-dd"),description:"",account:"Cash",type:"debit",amount:""});
    setShowAdd(false); toast({title:"Entry added"});
  };

  const handlePaySupplier = async () => {
    if (!payAmount || !selectedSupplier) return;
    setIsSaving(true);
    try {
      const amt = Number(payAmount);
      
      // Since this is for legacy suppliers (not vendors/Supabase yet)
      // We update local state
      setSuppliers(suppliers.map(s => s.id === selectedSupplier.id 
        ? { ...s, paid: s.paid + amt, balance: Math.max(0, s.balance - amt) } 
        : s
      ));

      toast({ title: "Supplier payment recorded" });
      setShowPaySupplier(false);
      setPayAmount("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
        supplier_id: selectedVendor.id,
        amount: amt,
        method: vendorPayForm.method,
        date: vendorPayForm.date,
        notes: vendorPayForm.notes
      }]);
      if (pErr) throw pErr;

      const { error: sErr } = await supabase.from('suppliers').update({
        current_balance: selectedVendor.balance - amt
      }).eq('id', selectedVendor.id);
      if (sErr) throw sErr;

      toast({title:"Vendor payment recorded"});
      setShowPayVendor(false);
      fetchVendors();
    } catch (err: any) {
      toast({title:"Error", description: err.message, variant: "destructive"});
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
    const data = EVENT_FINANCE.map(e => ({
      Event: e.event,
      Date: e.date,
      Revenue: e.totalAmount,
      "Menu Cost": e.menuCost,
      "3rd Party Cost": e.thirdPartyCost,
      Profit: e.profit,
      Margin: `${Math.round((e.profit/e.totalAmount)*100)}%`
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
    const data = filtered.map(l => ({
      Date: l.date,
      Description: l.description,
      Account: l.account,
      Type: l.type,
      Amount: l.amount,
      Balance: l.balance
    }));

    if (format === 'excel') {
      exportToExcel(data, `Account_Statement_${accountFilter}_${fromDate}_to_${toDate}`);
    } else {
      const headers = ["Date", "Description", "Account", "Type", "Amount", "Balance"];
      const rows = data.map(d => Object.values(d));
      exportToPDF(headers, rows, `Account Statement: ${accountFilter} (${fromDate} to ${toDate})`, `Account_Statement_${accountFilter}`);
    }
  };

  const totalAdvances = EVENT_FINANCE.reduce((s,e)=>s+e.advance,0);
  
  // Yearly Breakdown logic
  const yearlyMonths = eachMonthOfInterval({
    start: startOfYear(parseISO(`${selectedYear}-01-01`)),
    end: endOfYear(parseISO(`${selectedYear}-01-01`))
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-foreground">Finance & Accounts</h2><p className="text-sm text-muted-foreground">Ledger, event finance, advance tracking, supplier & P&L</p></div>
        {canDo("add") && (
          <Button onClick={()=>setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4"/>Add Entry</Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{l:"Total Revenue",v:`₨${totalRevenue.toLocaleString()}`,c:"text-success",icon:TrendingUp},{l:"Total Expenses",v:`₨${totalCredit.toLocaleString()}`,c:"text-destructive",icon:TrendingDown},{l:"Net Balance",v:`₨${netBalance.toLocaleString()}`,c:netBalance>=0?"text-success":"text-destructive",icon:Landmark},{l:"Pending Balances",v:`₨${totalPending.toLocaleString()}`,c:"text-warning",icon:Landmark}].map(c=>(
          <div key={c.l} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{c.l}</p><p className={`mt-1 text-lg sm:text-xl font-bold ${c.c}`}>{c.v}</p></div>
              <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${c.c==="text-success"?"bg-success":c.c==="text-destructive"?"bg-destructive":c.c==="text-warning"?"bg-warning":"bg-primary"}`}><c.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white"/></div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="ledger">
        <TabsList className="mb-4">
          <TabsTrigger value="ledger">General Ledger</TabsTrigger>
          <TabsTrigger value="event">Event-Based Finance</TabsTrigger>
          <TabsTrigger value="advances">Advance Tracking</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Ledger</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Ledger</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
        </TabsList>

        {/* GENERAL LEDGER */}
        <TabsContent value="ledger">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search transactions..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Account"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="w-36 text-xs h-9" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="w-36 text-xs h-9" />
                </div>
                {canDo("export") && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="outline" size="sm" onClick={() => exportStatement('pdf')} className="h-9 px-2"><FileText className="h-4 w-4 mr-1"/>PDF</Button>
                    <Button variant="outline" size="sm" onClick={() => exportStatement('excel')} className="h-9 px-2"><Download className="h-4 w-4 mr-1"/>Excel</Button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead><tr className="border-b border-border bg-muted/40">{["Date","Description","Account","Type","Amount","Balance"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(l=>(
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{l.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{l.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{l.account}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${l.type==="debit"?"bg-success/10 text-success border-success/20":"bg-destructive/10 text-destructive border-destructive/20"}`}>{l.type}</span></td>
                      <td className={`px-4 py-3 text-sm font-bold ${l.type==="debit"?"text-success":"text-destructive"}`}>{l.type==="debit"?"+":"-"}₨{l.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">₨{l.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-muted/40">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold">Current Balance</td>
                  <td colSpan={2} className={`px-4 py-3 text-sm font-bold ${netBalance>=0?"text-success":"text-destructive"}`}>₨{netBalance.toLocaleString()}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* EVENT FINANCE */}
        <TabsContent value="event">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><h3 className="text-sm font-semibold text-card-foreground">Event-Based Finance — Track each event's financial status</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead><tr className="border-b border-border bg-muted/40">{["Event","Date","Total","Advance","Balance","Menu Cost","3rd Party","Profit","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {EVENT_FINANCE.map(e=>(
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground whitespace-nowrap">{e.event}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground whitespace-nowrap">₨{e.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-success whitespace-nowrap">₨{e.advance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-destructive whitespace-nowrap">₨{e.balance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{e.menuCost>0?`₨${e.menuCost.toLocaleString()}`:"-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{e.thirdPartyCost>0?`₨${e.thirdPartyCost.toLocaleString()}`:"-"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-success whitespace-nowrap">₨{e.profit.toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${{confirmed:"bg-success/10 text-success border-success/20",tentative:"bg-warning/10 text-warning border-warning/20"}[e.status]||"bg-muted text-muted-foreground"}`}>{e.status}</span></td>
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
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Total Advances Received</p><p className="text-xl font-bold text-primary">₨{totalAdvances.toLocaleString()}</p></div>
              <div className="rounded-lg bg-success/5 border border-success/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Total Revenue</p><p className="text-xl font-bold text-success">₨{totalRevenue.toLocaleString()}</p></div>
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Pending Balance</p><p className="text-xl font-bold text-destructive">₨{totalPending.toLocaleString()}</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
              <thead><tr className="border-b border-border bg-muted/40">{["Event","Total","Advance","Balance","% Paid"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {EVENT_FINANCE.map(e=>{
                  const pct = Math.round((e.advance/e.totalAmount)*100);
                  return <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground">{e.event}</td>
                    <td className="px-4 py-3 text-sm text-card-foreground">₨{e.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-success">₨{e.advance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-destructive">₨{e.balance.toLocaleString()}</td>
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
                  {suppliers.map(s=>(
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.contact}</td>
                      <td className="px-4 py-3 text-sm text-card-foreground">₨{s.totalBills.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-success">₨{s.paid.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${s.balance>0?"text-destructive":"text-success"}`}>₨{s.balance.toLocaleString()}</td>
                      <td className="px-4 py-3">{s.balance>0&&<button onClick={()=>{ setSelectedSupplier(s); setShowPaySupplier(true); }} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20">Pay Now</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-muted/40">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold">Total Outstanding</td>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-destructive">₨{suppliers.reduce((s,x)=>s+x.balance,0).toLocaleString()}</td>
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
                  {vendors.map(v=>(
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground"/>
                        {v.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{v.category}</td>
                      <td className="px-4 py-3 text-sm">₨{v.total_bills.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-success">₨{v.paid.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${v.balance>0?"text-destructive":"text-success"}`}>₨{v.balance.toLocaleString()}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedVendor(v); setShowVendorHistory(true); }} className="h-8 px-2"><Eye className="h-4 w-4"/></Button>
                        {v.balance > 0 && <Button size="sm" onClick={() => { setSelectedVendor(v); setVendorPayForm({...vendorPayForm, amount: ""}); setShowPayVendor(true); }} className="h-8 px-2">Pay</Button>}
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No vendors found. Add them in Event Booking - Supplier Ledger.</td></tr>}
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
                      {EVENT_FINANCE.map(e=>{
                        const margin = Math.round((e.profit/e.totalAmount)*100);
                        return <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 text-sm font-medium text-card-foreground">{e.event}</td>
                          <td className="px-4 py-3 text-sm text-success">₨{e.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-destructive">{e.menuCost>0?`₨${e.menuCost.toLocaleString()}`:"-"}</td>
                          <td className="px-4 py-3 text-sm text-destructive">{e.thirdPartyCost>0?`₨${e.thirdPartyCost.toLocaleString()}`:"-"}</td>
                          <td className="px-4 py-3 text-sm font-bold text-success">₨{e.profit.toLocaleString()}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${margin>=50?"bg-success/10 text-success border-success/20":margin>=30?"bg-warning/10 text-warning border-warning/20":"bg-destructive/10 text-destructive border-destructive/20"}`}>{margin}%</span></td>
                        </tr>;
                      })}
                    </tbody>
                    <tfoot><tr className="bg-muted/40">
                      <td className="px-4 py-3 text-sm font-semibold">Monthly Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-success">₨{totalRevenue.toLocaleString()}</td>
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-destructive">₨{EVENT_FINANCE.reduce((s,e)=>s+e.menuCost+e.thirdPartyCost,0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-bold text-success">₨{totalProfit.toLocaleString()}</td>
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
                        const monthEvents = EVENT_FINANCE.filter(e => e.date.startsWith(`${selectedYear}-${monthStr}`));
                        const mIncome = monthEvents.reduce((s, e) => s + e.totalAmount, 0);
                        const mExpenses = monthEvents.reduce((s, e) => s + e.menuCost + e.thirdPartyCost, 0);
                        const mProfit = mIncome - mExpenses;
                        return (
                          <tr key={month.toISOString()} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm font-medium text-card-foreground">{format(month, "MMMM")}</td>
                            <td className="px-4 py-3 text-sm text-success font-bold">₨{mIncome.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-destructive font-bold">₨{mExpenses.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-sm font-black ${mProfit >= 0 ? "text-primary" : "text-destructive"}`}>₨{mProfit.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr className="bg-muted/40">
                      <td className="px-4 py-3 text-sm font-bold uppercase tracking-widest">Yearly Totals</td>
                      <td className="px-4 py-3 text-lg font-black text-success">₨{totalRevenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-lg font-black text-destructive">₨{EVENT_FINANCE.reduce((s,e)=>s+e.menuCost+e.thirdPartyCost,0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xl font-black text-primary">₨{totalProfit.toLocaleString()}</td>
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
                  {ledger.filter(l=>l.type==="debit").map(l=>(
                    <div key={l.id} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{l.description}</span><span className="font-medium text-card-foreground">₨{l.amount.toLocaleString()}</span></div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-success/20 pt-2 text-sm font-bold"><span>Total Income</span><span className="text-success">₨{totalDebit.toLocaleString()}</span></div>
                </div>
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-destructive">Expenses</h4>
                  {ledger.filter(l=>l.type==="credit").map(l=>(
                    <div key={l.id} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{l.description}</span><span className="font-medium text-card-foreground">₨{l.amount.toLocaleString()}</span></div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-destructive/20 pt-2 text-sm font-bold"><span>Total Expenses</span><span className="text-destructive">₨{totalCredit.toLocaleString()}</span></div>
                </div>
                <div className={`rounded-lg p-4 ${netBalance>=0?"bg-primary/10 border border-primary/20":"bg-destructive/10 border border-destructive/20"}`}>
                  <div className="flex justify-between text-base font-bold"><span>Net Profit / Loss</span><span className={netBalance>=0?"text-primary":"text-destructive"}>₨{netBalance.toLocaleString()}</span></div>
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
            <div className="rounded-lg bg-muted/40 p-3 text-sm"><span className="text-muted-foreground">Outstanding Balance: </span><span className="font-bold text-destructive">₨{selectedSupplier.balance.toLocaleString()}</span></div>
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
                <p className="text-sm font-bold">₨{selectedVendor?.total_bills.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Paid</p>
                <p className="text-sm font-bold text-success">₨{selectedVendor?.paid.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Outstanding</p>
                <p className="text-sm font-bold text-destructive">₨{selectedVendor?.balance.toLocaleString()}</p>
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
                {vendorPayments.filter(p => p.vendor_id === selectedVendor?.id).map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{p.date}</td>
                    <td className="px-3 py-2">Payment via {p.method} {p.notes ? `(${p.notes})` : ""}</td>
                    <td className="px-3 py-2 text-right text-success font-medium">- ₨{p.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">Opening</td>
                  <td className="px-3 py-2">Initial Balance</td>
                  <td className="px-3 py-2 text-right font-medium">₨{selectedVendor?.total_bills.toLocaleString()}</td>
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
              <span className="text-lg font-bold text-destructive">₨{selectedVendor?.balance.toLocaleString()}</span>
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

export default Finance;
