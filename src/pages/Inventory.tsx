import { useState, useEffect } from "react";
import { Package, Plus, Search, AlertTriangle, ArrowUp, ArrowDown, RotateCcw, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

interface InventoryItem {
  id: string | number;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  supplier: string;
  type: "consumable" | "non-consumable";
}

interface StockMovement {
  id: string | number;
  date: string;
  item_id: string | number;
  item_name: string;
  type: "purchase" | "issue" | "return";
  category: "consumable" | "non-consumable";
  qty: number;
  note: string;
  issued_to?: string;
  returned_by?: string;
  return_date?: string;
}

const CATEGORIES = ["Kitchen", "Furniture", "Decoration", "Linens", "Electronics", "Other"];

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [newItem, setNewItem] = useState({ name: "", category: "Other", unit: "", stock: "", minStock: "", purchasePrice: "", supplier: "", type: "consumable" as const });
  const [returnForm, setReturnForm] = useState({ qty: "", returned_by: "", note: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase.from('inventory_items').select('*');
      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      const { data: historyData, error: historyError } = await supabase.from('stock_movements').select('*').order('date', { ascending: false });
      if (historyError) throw historyError;
      setHistory(historyData || []);
    } catch (err: any) {
      console.error("Error fetching inventory data:", err);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history.filter(h => {
    const matchesSearch = h.item_name.toLowerCase().includes(historySearch.toLowerCase());
    const matchesCategory = categoryFilter === "all" || h.category === categoryFilter;
    let matchesDate = true;
    if (fromDate && toDate) {
      matchesDate = isWithinInterval(parseISO(h.date), {
        start: parseISO(fromDate),
        end: parseISO(toDate)
      });
    }
    return matchesSearch && matchesCategory && matchesDate;
  });

  const lowStock = items.filter(i => i.stock <= i.minStock);
  const totalValue = items.reduce((s, i) => s + i.stock * i.purchasePrice, 0);

  const handleAdd = async () => {
    if (!newItem.name) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('inventory_items').insert([{
        name: newItem.name,
        category: newItem.category,
        unit: newItem.unit,
        stock: Number(newItem.stock),
        minStock: Number(newItem.minStock),
        purchasePrice: Number(newItem.purchasePrice),
        supplier: newItem.supplier,
        type: newItem.type
      }]).select();

      if (error) throw error;
      
      // Also record initial stock movement if stock > 0
      if (Number(newItem.stock) > 0) {
        await supabase.from('stock_movements').insert([{
          date: format(new Date(), "yyyy-MM-dd"),
          item_id: data[0].id,
          item_name: newItem.name,
          type: "purchase",
          category: newItem.type,
          qty: Number(newItem.stock),
          note: "Initial Stock"
        }]);
      }

      toast.success("Item added successfully");
      setShowAddModal(false);
      setNewItem({ name: "", category: "Other", unit: "", stock: "", minStock: "", purchasePrice: "", supplier: "", type: "consumable" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!stockAction.qty || !selectedItem) return;
    setIsSaving(true);
    try {
      const qty = Number(stockAction.qty);
      const newStock = stockAction.type === "purchase" ? selectedItem.stock + qty : Math.max(0, selectedItem.stock - qty);
      
      const { error: itemError } = await supabase.from('inventory_items').update({
        stock: newStock
      }).eq('id', selectedItem.id);

      if (itemError) throw itemError;

      const { error: moveError } = await supabase.from('stock_movements').insert([{
        date: format(new Date(), "yyyy-MM-dd"),
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        type: stockAction.type,
        category: selectedItem.type,
        qty: qty,
        note: stockAction.note,
        issued_to: stockAction.type === "issue" ? stockAction.issued_to : null
      }]);

      if (moveError) throw moveError;

      toast.success("Stock updated successfully");
      setShowStockModal(false);
      setStockAction({ type: "purchase", qty: "", note: "", issued_to: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update stock");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnForm.qty || !selectedMovement || !selectedItem) return;
    setIsSaving(true);
    try {
      const qty = Number(returnForm.qty);
      if (qty > selectedMovement.qty) {
        throw new Error("Return quantity cannot exceed issued quantity");
      }

      // Update item stock
      const { error: itemError } = await supabase.from('inventory_items').update({
        stock: selectedItem.stock + qty
      }).eq('id', selectedItem.id);

      if (itemError) throw itemError;

      // Record return movement
      const { error: moveError } = await supabase.from('stock_movements').insert([{
        date: format(new Date(), "yyyy-MM-dd"),
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        type: "return",
        category: selectedItem.type,
        qty: qty,
        note: returnForm.note,
        returned_by: returnForm.returned_by,
        return_date: format(new Date(), "yyyy-MM-dd")
      }]);

      if (moveError) throw moveError;

      toast.success("Item returned successfully");
      setShowReturnModal(false);
      setReturnForm({ qty: "", returned_by: "", note: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setIsSaving(false);
    }
  };

  const exportHistory = () => {
    const data = filteredHistory.map(h => ({
      Date: h.date,
      Item: h.item_name,
      Type: h.type,
      Category: h.category,
      Quantity: h.qty,
      "Issued To / Returned By": h.issued_to || h.returned_by || "-",
      Note: h.note
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Stock_Movement_History_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventory & Stock Management</h2>
          <p className="text-sm text-muted-foreground">Track items, purchases, and stock levels</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Items", value: items.length, icon: Package, color: "bg-primary" },
          { label: "Low Stock", value: lowStock.length, icon: AlertTriangle, color: "bg-warning" },
          { label: "Stock Value", value: `₨ ${totalValue.toLocaleString()}`, icon: Package, color: "bg-success" },
          { label: "Categories", value: [...new Set(items.map(i => i.category))].length, icon: Package, color: "bg-secondary" },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">{card.label}</p>
                <p className="mt-1 text-base sm:text-xl font-bold text-card-foreground truncate">{card.value}</p>
              </div>
              <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg flex-shrink-0 ${card.color}`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h4 className="text-sm font-semibold text-warning">Low Stock Alert ({lowStock.length} items)</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="rounded-full bg-warning/20 px-3 py-1 text-xs font-medium text-warning">
                {i.name} ({i.stock} {i.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="stock">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock Balance</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
        </TabsList>

        {/* Stock Balance */}
        <TabsContent value="stock">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search items..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Item Name", "Type", "Category", "Unit", "In Stock", "Min Stock", "Value", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                  ) : filteredItems.map(item => (
                    <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-muted/20 ${item.stock <= item.minStock ? "bg-warning/5" : ""}`}>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${item.type === 'consumable' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${item.stock <= item.minStock ? "text-warning" : "text-card-foreground"}`}>
                          {item.stock}
                          {item.stock <= item.minStock && <AlertTriangle className="ml-1 inline h-3 w-3" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.minStock}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">₨ {(item.stock * item.purchasePrice).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelectedItem(item); setStockAction({ type: "purchase", qty: "", note: "", issued_to: "" }); setShowStockModal(true); }} className="flex items-center gap-1 rounded bg-success/10 px-2 py-1 text-xs text-success hover:bg-success/20">
                            <ArrowUp className="h-3 w-3" /> In
                          </button>
                          <button onClick={() => { setSelectedItem(item); setStockAction({ type: "issue", qty: "", note: "", issued_to: "" }); setShowStockModal(true); }} className="flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20">
                            <ArrowDown className="h-3 w-3" /> Out
                          </button>
                        </div>
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
              <Button variant="outline" size="sm" onClick={exportHistory} className="h-9">
                <Download className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Item", "Type", "Qty", "Issued To / Returned By", "Note", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                  ) : filteredHistory.map(h => (
                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{h.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">
                        {h.item_name}
                        <span className="ml-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase border bg-muted/50">
                          {h.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${h.type === "purchase" ? "bg-success/10 text-success border-success/20" : h.type === "return" ? "bg-blue-10 text-blue-700 border-blue-200" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                          {h.type === "purchase" ? <ArrowUp className="h-3 w-3" /> : h.type === "return" ? <RotateCcw className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {h.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-card-foreground">{h.qty}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{h.issued_to || h.returned_by || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{h.note}</td>
                      <td className="px-4 py-3">
                        {h.type === "issue" && h.category === "non-consumable" && (
                          <Button variant="ghost" size="sm" onClick={() => {
                            const item = items.find(i => i.id === h.item_id);
                            if (item) {
                              setSelectedItem(item);
                              setSelectedMovement(h);
                              setReturnForm({ qty: String(h.qty), returned_by: "", note: "" });
                              setShowReturnModal(true);
                            }
                          }} className="h-7 px-2 text-[10px] gap-1">
                            <RotateCcw className="h-3 w-3" /> Return
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredHistory.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No stock movements found.</td></tr>
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
              <Input type="number" placeholder="0" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Min Stock Level</Label>
              <Input type="number" placeholder="0" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Price (₨)</Label>
              <Input type="number" placeholder="0" value={newItem.purchasePrice} onChange={e => setNewItem({ ...newItem, purchasePrice: e.target.value })} />
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
              Current Stock: <span className="font-bold">{selectedItem?.stock} {selectedItem?.unit}</span>
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

export default Inventory;
