import { useState } from "react";
import { Package, Plus, Search, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DUMMY_ITEMS = [
  { id: 1, name: "Basmati Rice (50kg bag)", category: "Kitchen", unit: "Bag", stock: 12, minStock: 5, purchasePrice: 8500, supplier: "Fresh Foods Co." },
  { id: 2, name: "Cooking Oil (16L)", category: "Kitchen", unit: "Can", stock: 8, minStock: 10, purchasePrice: 5200, supplier: "Fresh Foods Co." },
  { id: 3, name: "Round Tables", category: "Furniture", unit: "Pcs", stock: 50, minStock: 20, purchasePrice: 3500, supplier: "Tent & Furniture Rental" },
  { id: 4, name: "Chairs (Plastic)", category: "Furniture", unit: "Pcs", stock: 300, minStock: 100, purchasePrice: 800, supplier: "Tent & Furniture Rental" },
  { id: 5, name: "Table Cloths", category: "Decoration", unit: "Pcs", stock: 80, minStock: 50, purchasePrice: 450, supplier: "Decoration World" },
  { id: 6, name: "Fairy Lights (Roll)", category: "Decoration", unit: "Roll", stock: 15, minStock: 20, purchasePrice: 1200, supplier: "Decoration World" },
  { id: 7, name: "Gas Cylinders", category: "Kitchen", unit: "Cylinder", stock: 6, minStock: 4, purchasePrice: 3200, supplier: "Fresh Foods Co." },
  { id: 8, name: "Disposable Plates (100pcs)", category: "Kitchen", unit: "Pack", stock: 3, minStock: 10, purchasePrice: 650, supplier: "Fresh Foods Co." },
];

const DUMMY_HISTORY = [
  { id: 1, date: "2024-03-14", item: "Basmati Rice", type: "purchase", qty: 5, note: "Monthly stock" },
  { id: 2, date: "2024-03-14", item: "Cooking Oil", type: "issue", qty: 3, note: "Ali Corp Dinner" },
  { id: 3, date: "2024-03-13", item: "Round Tables", type: "issue", qty: 20, note: "Mehndi Ceremony" },
  { id: 4, date: "2024-03-12", item: "Fairy Lights", type: "purchase", qty: 10, note: "Restock" },
  { id: 5, date: "2024-03-11", item: "Disposable Plates", type: "issue", qty: 5, note: "Birthday Party" },
  { id: 6, date: "2024-03-10", item: "Table Cloths", type: "purchase", qty: 30, note: "Restock for weddings" },
];

const CATEGORIES = ["Kitchen", "Furniture", "Decoration", "Linens", "Electronics", "Other"];

const Inventory = () => {
  const [items, setItems] = useState(DUMMY_ITEMS);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [stockAction, setStockAction] = useState({ type: "purchase", qty: "", note: "" });
  const [newItem, setNewItem] = useState({ name: "", category: "", unit: "", stock: "", minStock: "", purchasePrice: "", supplier: "" });

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = items.filter(i => i.stock <= i.minStock);

  const handleAdd = () => {
    if (!newItem.name) return;
    setItems([...items, { id: items.length + 1, ...newItem, stock: Number(newItem.stock), minStock: Number(newItem.minStock), purchasePrice: Number(newItem.purchasePrice) }]);
    setNewItem({ name: "", category: "", unit: "", stock: "", minStock: "", purchasePrice: "", supplier: "" });
    setShowAddModal(false);
  };

  const handleStockUpdate = () => {
    if (!stockAction.qty) return;
    setItems(items.map(i => {
      if (i.id !== selectedItem.id) return i;
      const qty = Number(stockAction.qty);
      return { ...i, stock: stockAction.type === "purchase" ? i.stock + qty : Math.max(0, i.stock - qty) };
    }));
    setShowStockModal(false);
    setStockAction({ type: "purchase", qty: "", note: "" });
  };

  const totalValue = items.reduce((s, i) => s + i.stock * i.purchasePrice, 0);

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
                    {["Item Name", "Category", "Unit", "In Stock", "Min Stock", "Value", "Supplier", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-muted/20 ${item.stock <= item.minStock ? "bg-warning/5" : ""}`}>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{item.name}</td>
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
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.supplier}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelectedItem(item); setStockAction({ type: "purchase", qty: "", note: "" }); setShowStockModal(true); }} className="flex items-center gap-1 rounded bg-success/10 px-2 py-1 text-xs text-success hover:bg-success/20">
                            <ArrowUp className="h-3 w-3" /> In
                          </button>
                          <button onClick={() => { setSelectedItem(item); setStockAction({ type: "issue", qty: "", note: "" }); setShowStockModal(true); }} className="flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20">
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Item", "Type", "Qty", "Note"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DUMMY_HISTORY.map(h => (
                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{h.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{h.item}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${h.type === "purchase" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                          {h.type === "purchase" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {h.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-card-foreground">{h.qty}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{h.note}</td>
                    </tr>
                  ))}
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
            <Button onClick={handleAdd}>Add Item</Button>
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
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="e.g. Monthly restock / Event name" value={stockAction.note} onChange={e => setStockAction({ ...stockAction, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockModal(false)}>Cancel</Button>
            <Button onClick={handleStockUpdate}>{stockAction.type === "purchase" ? "Add Stock" : "Issue Stock"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
