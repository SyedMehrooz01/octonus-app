import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Package, Plus, Search, AlertTriangle, ArrowUp, ArrowDown, RotateCcw, FileText, Download, Loader2, Wallet, Landmark, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as inventoryService from "@/services/inventoryService";
import { format, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import SkeletonLoading from "@/components/SkeletonLoading";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  purchase_price: number;
  supplier: string;
  type: "consumable" | "non-consumable";
  status: string;
  created_at: string;
}

interface StockMovement {
  id: string;
  date: string;
  item_id: string;
  item_name: string;
  movement_type: "in" | "out" | "return" | "purchase" | "issue";
  quantity: number;
  notes: string;
  event_id?: string;
  created_by?: string;
  created_at: string;
}


const CATEGORIES = ["Kitchen", "Furniture", "Decoration", "Linens", "Electronics", "Other"];

const Inventory = () => {
  const { canDo, logAction } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  
  const [stockAction, setStockAction] = useState({ type: "purchase", qty: "", note: "", issued_to: "" });
  const [newItem, setNewItem] = useState({ name: "", category: "Other", unit: "", current_stock: "", min_stock_level: "", purchase_price: "", supplier: "", type: "consumable" as const });
  const [returnForm, setReturnForm] = useState({ qty: "", returned_by: "", note: "" });

  const fetchData = useCallback(async (isMounted = true) => {
    if (isMounted) {
      setLoading(true);
      setError(null);
    }
    try {
      const [itemsDataRaw, historyDataRaw] = await Promise.all([
        inventoryService.getInventoryItems(),
        inventoryService.getStockMovements()
      ]);
      
      if (!isMounted) return;

      setItems((itemsDataRaw ?? []).map(i => ({
        id: String(i?.id ?? ""),
        name: i?.name ?? "Unknown",
        category: i?.category ?? "Other",
        unit: i?.unit ?? "Unit",
        current_stock: Number(i?.current_stock ?? 0),
        min_stock_level: Number(i?.min_stock_level ?? 0),
        purchase_price: Number(i?.purchase_price ?? 0),
        supplier: i?.supplier ?? "N/A",
        type: i?.type ?? "consumable",
        status: i?.status ?? "active",
        created_at: i?.created_at ?? new Date().toISOString()
      })) ?? []);

      setHistory((historyDataRaw ?? []).map(h => ({
        id: String(h?.id ?? ""),
        date: h?.date ?? format(new Date(), "yyyy-MM-dd"),
        item_id: String(h?.item_id ?? ""),
        item_name: h?.item_name ?? "Unknown",
        movement_type: h?.movement_type ?? "in",
        quantity: Number(h?.quantity ?? 0),
        notes: h?.notes ?? "",
        event_id: h?.event_id,
        created_by: h?.created_by,
        created_at: h?.created_at ?? new Date().toISOString()
      })) ?? []);

    } catch (err: any) {
      console.error("Inventory fetchData unexpected error:", err);
      if (isMounted) {
        setError(err.message || "Failed to fetch inventory data.");
        setItems([]);
        setHistory([]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);


  useEffect(() => {
    let isMounted = true;
    fetchData(isMounted);
    return () => { isMounted = false; };
  }, [fetchData]);

  const filteredItems = useMemo(() => (items ?? []).filter(i =>
    (i?.name ?? "").toLowerCase().includes((search ?? "").toLowerCase()) ||
    (i?.category ?? "").toLowerCase().includes((search ?? "").toLowerCase())
  ), [items, search]);

  const filteredHistory = useMemo(() => (history ?? []).filter(h => {
    const matchesSearch = (h?.item_name ?? "").toLowerCase().includes((historySearch ?? "").toLowerCase());
    const matchesCategory = categoryFilter === "all" || (items ?? []).find(i => i.id === h.item_id)?.category === categoryFilter;
    let matchesDate = true;
    if (fromDate && toDate) {
      matchesDate = isWithinInterval(parseISO(h?.date ?? format(new Date(), "yyyy-MM-dd")), {
        start: parseISO(fromDate),
        end: parseISO(toDate)
      });
    }
    return matchesSearch && matchesCategory && matchesDate;
  }), [history, historySearch, categoryFilter, fromDate, toDate, items]);

  const lowStock = useMemo(() => (items ?? []).filter(i => (i?.current_stock ?? 0) <= (i?.min_stock_level ?? 0)), [items]);
  const totalValue = useMemo(() => (items ?? []).reduce((s, i) => s + ((i?.current_stock ?? 0) * (i?.purchase_price ?? 0)), 0), [items]);
  const categoryCount = useMemo(() => {
    const cats = (items ?? []).map(i => i?.category).filter(Boolean);
    return [...new Set(cats)].length;
  }, [items]);


  const handleAdd = useCallback(async () => {
    if (!newItem?.name) return;
    setIsSaving(true);
    try {
      const data = await inventoryService.addInventoryItem({
        name: newItem.name,
        type: newItem.type,
        category: newItem.category,
        unit: newItem.unit,
        current_stock: Number(newItem.current_stock || 0),
        min_stock_level: Number(newItem.min_stock_level || 0),
        purchase_price: Number(newItem.purchase_price || 0),
        supplier: newItem.supplier,
        status: 'active'
      });

      if (Number(newItem.current_stock) > 0 && data && data.length > 0) {
        await inventoryService.addStockMovement({
          date: format(new Date(), "yyyy-MM-dd"),
          item_id: data[0].id,
          item_name: newItem.name,
          movement_type: "in",
          quantity: Number(newItem.current_stock),
          notes: "Initial Stock"
        });
      }

      toast.success("Item added successfully");
      setShowAddModal(false);
      setNewItem({ name: "", category: "Other", unit: "", current_stock: "", min_stock_level: "", purchase_price: "", supplier: "", type: "consumable" });
      fetchData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    } finally {
      setIsSaving(false);
    }
  }, [newItem, fetchData]);

  const handleStockUpdate = useCallback(async () => {
    if (!stockAction.qty || !selectedItem) return;
    setIsSaving(true);
    try {
      const qty = Number(stockAction.qty);
      const currentStock = selectedItem.current_stock ?? 0;
      const newStock = stockAction.type === "purchase" ? currentStock + qty : Math.max(0, currentStock - qty);
      
      await inventoryService.updateInventoryItem(selectedItem.id, {
        current_stock: newStock
      });

      await inventoryService.addStockMovement({
        date: format(new Date(), "yyyy-MM-dd"),
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        movement_type: stockAction.type === "purchase" ? "in" : "out",
        quantity: qty,
        notes: stockAction.note
      });

      toast.success("Stock updated successfully");
      setShowStockModal(false);
      setStockAction({ type: "purchase", qty: "", note: "", issued_to: "" });
      fetchData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to update stock");
    } finally {
      setIsSaving(false);
    }
  }, [stockAction, selectedItem, fetchData]);

  const handleReturn = useCallback(async () => {
    if (!returnForm.qty || !selectedMovement || !selectedItem) return;
    setIsSaving(true);
    try {
      const qty = Number(returnForm.qty);
      const issuedQty = selectedMovement.quantity ?? 0;
      if (qty > issuedQty) {
        throw new Error("Return quantity cannot exceed issued quantity");
      }

      // Update item stock
      const currentStock = selectedItem.current_stock ?? 0;
      await inventoryService.updateInventoryItem(selectedItem.id, {
        current_stock: currentStock + qty
      });

      // Record return movement
      await inventoryService.addStockMovement({
        date: format(new Date(), "yyyy-MM-dd"),
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        movement_type: "return",
        quantity: qty,
        notes: returnForm.note
      });

      toast.success("Item returned successfully");
      setShowReturnModal(false);
      setReturnForm({ qty: "", returned_by: "", note: "" });
      fetchData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setIsSaving(false);
    }
  }, [returnForm, selectedMovement, selectedItem, fetchData]);


  const exportHistory = useCallback(() => {
    const data = (filteredHistory ?? []).map(h => ({
      Date: h?.date ?? "N/A",
      Item: h?.item_name ?? "Unknown",
      Type: h?.movement_type ?? "N/A",
      Quantity: h?.quantity ?? 0,
      Note: h?.notes ?? "-"
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Stock_Movement_History_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }, [filteredHistory]);


  if (loading) {
    return (
      <div className="space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="h-20 w-full bg-white rounded-3xl animate-pulse mb-8" />
        <SkeletonLoading type="stats" />
        <div className="h-12 w-64 bg-slate-100 rounded-xl animate-pulse mb-8" />
        <div className="bg-white rounded-3xl border border-slate-100 p-6">
          <SkeletonLoading type="table" count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <RotateCcw className="h-5 w-5 animate-spin-slow" />
          <p className="font-bold">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchData(true)} className="ml-auto text-rose-600 hover:bg-rose-100 font-black uppercase text-[10px] tracking-widest">Retry</Button>
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight uppercase">Inventory Management</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            <Clock className="h-3 w-3" /> Real-time Stock Tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchData}
            className="h-12 w-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-500"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          {canDo("add") && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl shadow-lg shadow-primary/20 h-12 px-8 gap-2 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" /> NEW ITEM
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Asset Types", value: (items ?? []).length, icon: Package, color: "from-blue-500 to-blue-700", shadow: "shadow-blue-500/20" },
          { label: "Low Stock Alerts", value: (lowStock ?? []).length, icon: AlertTriangle, color: "from-rose-500 to-rose-700", shadow: "shadow-rose-500/20" },
          { label: "Est. Stock Value", value: `₨ ${(totalValue ?? 0).toLocaleString()}`, icon: Wallet, color: "from-emerald-500 to-emerald-700", shadow: "shadow-emerald-500/20" },
          { label: "Active Categories", value: categoryCount, icon: Landmark, color: "from-violet-500 to-violet-700", shadow: "shadow-violet-500/20" },
        ].map((card, i) => (
          <div key={card.label} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.color} p-6 text-white shadow-xl ${card.shadow} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-in fade-in zoom-in duration-500 delay-${i * 100}`}>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{card.label}</p>
                <p className="text-2xl font-black truncate tracking-tight">{card.value}</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <card.icon size={140} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      {(lowStock ?? []).length > 0 && (
        <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-rose-500 p-2.5 text-white shadow-lg shadow-rose-500/30 animate-pulse">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-black text-rose-900 uppercase tracking-[0.1em]">Critical Low Stock Warning ({(lowStock ?? []).length})</h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {(lowStock ?? []).map(i => (
              <span key={i?.id} className="rounded-xl bg-white border border-rose-100 px-4 py-2.5 text-xs font-black text-rose-600 shadow-sm flex items-center gap-3 group hover:border-rose-300 transition-colors">
                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                {i?.name} <span className="text-rose-400 font-bold ml-1">— {i?.current_stock} {i?.unit} LEFT</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="mb-8 h-auto gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
          <TabsTrigger value="stock" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Inventory List</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <div className="relative max-w-md group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input placeholder="Search inventory items..." className="pl-11 h-12 bg-white border-slate-200 rounded-xl font-bold shadow-sm focus-visible:ring-blue-500/20" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Details</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Stock Level</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Asset Value</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-6 py-8"><div className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" /></td></tr>
                    ))
                  ) : (filteredItems ?? []).map((item, idx) => (
                    <tr key={item?.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/40 transition-all duration-200 group`}>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-black text-sm shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform duration-300">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-blue-600 transition-colors">{item?.name}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-tighter flex items-center gap-2">
                              <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                              Supplier: {item?.supplier}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm ${item?.type === 'consumable' ? 'bg-blue-500 text-white' : 'bg-violet-500 text-white'}`}>
                          {item?.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-6">
                        <Badge variant="outline" className="rounded-lg font-black text-[10px] uppercase tracking-tighter bg-white border-slate-200 px-3 py-1 shadow-sm">
                          {item?.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`text-sm font-black tracking-tight ${(item?.current_stock ?? 0) <= (item?.min_stock_level ?? 0) ? "text-rose-600" : "text-slate-700"}`}>
                            {item?.current_stock} {item?.unit}
                          </span>
                          <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full transition-all duration-500 ${(item?.current_stock ?? 0) <= (item?.min_stock_level ?? 0) ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`} style={{ width: `${Math.min(100, ((item?.current_stock ?? 0) / (item?.min_stock_level || 1)) * 50)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm font-black text-right text-slate-700 tracking-tight">₨ {((item?.current_stock ?? 0) * (item?.purchase_price ?? 0)).toLocaleString()}</td>
                      <td className="px-6 py-6 text-right">
                        {canDo("edit") && (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                            <Button size="sm" onClick={() => { setSelectedItem(item); setStockAction({ type: "purchase", qty: "", note: "", issued_to: "" }); setShowStockModal(true); }} className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-emerald-500/20">
                              <ArrowUp className="h-3.5 w-3.5" /> STOCK IN
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setStockAction({ type: "issue", qty: "", note: "", issued_to: "" }); setShowStockModal(true); }} className="h-9 px-4 rounded-xl border-rose-200 text-rose-500 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm">
                              <ArrowDown className="h-3.5 w-3.5" /> STOCK OUT
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search item history..." className="pl-9" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                  <SelectItem value="non-consumable">Non-Consumable</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36 text-xs h-9" />
                <span className="text-muted-foreground">to</span>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36 text-xs h-9" />
              </div>
              {canDo("export") && (
                <Button variant="outline" size="sm" onClick={exportHistory} className="h-9">
                  <Download className="h-4 w-4 mr-2" /> Export Excel
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Item", "Type", "Qty", "Note", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                  ) : (filteredHistory ?? []).map(h => {
                    const item = (items ?? []).find(i => i.id === h.item_id);
                    return (
                      <tr key={h?.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{h?.date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-card-foreground">
                          {h?.item_name}
                          <span className="ml-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase border bg-muted/50">
                            {item?.category ?? "Other"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${h?.movement_type === "in" ? "bg-success/10 text-success border-success/20" : h?.movement_type === "return" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                            {h?.movement_type === "in" ? <ArrowUp className="h-3 w-3" /> : h?.movement_type === "return" ? <RotateCcw className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {h?.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-card-foreground">{h?.quantity}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{h?.notes}</td>
                        <td className="px-4 py-3">
                          {canDo("edit") && h?.movement_type === "out" && item?.type === "non-consumable" && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              if (item) {
                                setSelectedItem(item);
                                setSelectedMovement(h);
                                setReturnForm({ qty: String(h?.quantity ?? 0), returned_by: "", note: "" });
                                setShowReturnModal(true);
                              }
                            }} className="h-7 px-2 text-[10px] gap-1">
                              <RotateCcw className="h-3 w-3" /> Return
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && (filteredHistory ?? []).length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No stock movements found.</td></tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Item Name</Label>
              <Input placeholder="e.g. Basmati Rice (50kg)" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newItem.type} onValueChange={v => setNewItem({ ...newItem, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumable">Consumable</SelectItem>
                  <SelectItem value="non-consumable">Non-Consumable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input placeholder="e.g. Bag, Pcs, Roll" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Stock</Label>
              <Input type="number" placeholder="0" value={newItem.current_stock} onChange={e => setNewItem({ ...newItem, current_stock: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Min Stock Level</Label>
              <Input type="number" placeholder="0" value={newItem.min_stock_level} onChange={e => setNewItem({ ...newItem, min_stock_level: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Price (₨)</Label>
              <Input type="number" placeholder="0" value={newItem.purchase_price} onChange={e => setNewItem({ ...newItem, purchase_price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input placeholder="Supplier name" value={newItem.supplier} onChange={e => setNewItem({ ...newItem, supplier: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Update Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stockAction.type === "purchase" ? "Stock In" : "Issue Stock"} — {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              Current Stock: <span className="font-bold">{selectedItem?.current_stock} {selectedItem?.unit}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" placeholder="Enter quantity" value={stockAction.qty} onChange={e => setStockAction({ ...stockAction, qty: e.target.value })} />
            </div>
            {stockAction.type === "issue" && (
              <div className="space-y-1.5">
                <Label>Issued To</Label>
                <Input placeholder="e.g. Staff Name / Event Name" value={stockAction.issued_to} onChange={e => setStockAction({ ...stockAction, issued_to: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="e.g. Monthly restock / Special requirement" value={stockAction.note} onChange={e => setStockAction({ ...stockAction, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockModal(false)}>Cancel</Button>
            <Button onClick={handleStockUpdate} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : stockAction.type === "purchase" ? "Add Stock" : "Issue Stock"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Item — {selectedItem?.name}</DialogTitle>
            <DialogDescription>Process return for items issued on {selectedMovement?.date}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 text-sm">
              <div><p className="text-xs text-muted-foreground uppercase">Issued Qty</p><p className="font-bold">{selectedMovement?.qty} {selectedItem?.unit}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase">Issued To</p><p className="font-bold">{selectedMovement?.issued_to}</p></div>
            </div>
            <div className="space-y-1.5">
              <Label>Return Quantity</Label>
              <Input type="number" placeholder="Enter quantity" value={returnForm.qty} onChange={e => setReturnForm({ ...returnForm, qty: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Returned By</Label>
              <Input placeholder="Name of person returning" value={returnForm.returned_by} onChange={e => setReturnForm({ ...returnForm, returned_by: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="e.g. Returned after event" value={returnForm.note} onChange={e => setReturnForm({ ...returnForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>Cancel</Button>
            <Button onClick={handleReturn} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process Return"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(Inventory);
