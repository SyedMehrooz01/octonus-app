import { useState, useEffect, useRef, memo } from "react";
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, UtensilsCrossed, Edit, Loader2, Printer, Save, CheckCircle2, User, Wallet, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type BookingStatus = "tentative" | "confirmed" | "postponed" | "cancelled";
interface Booking { id: number; clientName: string; phone: string; eventType: string; eventDate: string; bookingDate: string; venue: string; guests: number; totalAmount: number; advance: number; balanceRemaining: number; status: BookingStatus; paymentMethod: string; menu: string; notes: string; thirdParty: boolean; supplierCost: number; sellingRate: number; }

const DUMMY_BOOKINGS: Booking[] = [
  { id:1, clientName:"Tariq & Sana", phone:"0300-1111111", eventType:"Wedding", eventDate:"2024-03-18", bookingDate:"2024-03-01", venue:"Main Hall", guests:500, totalAmount:350000, advance:150000, balanceRemaining:200000, status:"confirmed", paymentMethod:"Bank", menu:"Menu A - Desi", notes:"VIP tables required", thirdParty:false, supplierCost:0, sellingRate:0 },
  { id:2, clientName:"Ali Corp Dinner", phone:"0301-2222222", eventType:"Corporate", eventDate:"2024-03-20", bookingDate:"2024-03-03", venue:"Banquet Hall", guests:200, totalAmount:180000, advance:100000, balanceRemaining:80000, status:"confirmed", paymentMethod:"Cheque", menu:"Menu B - Continental", notes:"", thirdParty:true, supplierCost:120000, sellingRate:180000 },
  { id:3, clientName:"Farhan Birthday", phone:"0302-3333333", eventType:"Birthday", eventDate:"2024-03-22", bookingDate:"2024-03-05", venue:"Garden", guests:100, totalAmount:75000, advance:30000, balanceRemaining:45000, status:"tentative", paymentMethod:"Cash", menu:"Custom", notes:"Cake required", thirdParty:false, supplierCost:0, sellingRate:0 },
  { id:4, clientName:"Mehndi Ceremony", phone:"0303-4444444", eventType:"Mehndi", eventDate:"2024-03-25", bookingDate:"2024-03-06", venue:"Lawn Area", guests:300, totalAmount:220000, advance:110000, balanceRemaining:110000, status:"confirmed", paymentMethod:"Bank", menu:"Menu A - Desi", notes:"", thirdParty:false, supplierCost:0, sellingRate:0 },
  { id:5, clientName:"Tech Summit 2024", phone:"0304-5555555", eventType:"Corporate", eventDate:"2024-04-05", bookingDate:"2024-03-10", venue:"Conference Room", guests:150, totalAmount:120000, advance:60000, balanceRemaining:60000, status:"tentative", paymentMethod:"Bank", menu:"Menu B - Continental", notes:"", thirdParty:true, supplierCost:85000, sellingRate:120000 },
  { id:6, clientName:"Nikkah Ceremony", phone:"0305-6666666", eventType:"Wedding", eventDate:"2024-04-10", bookingDate:"2024-03-12", venue:"Main Hall", guests:400, totalAmount:280000, advance:140000, balanceRemaining:140000, status:"confirmed", paymentMethod:"Cheque", menu:"Menu A - Desi", notes:"", thirdParty:false, supplierCost:0, sellingRate:0 },
];

interface MenuItem { id?: number | string; item: string; unit: string; rate: number; menu_id?: number | string; raw_materials?: RawMaterialRequirement[]; }
interface Menu { id: number | string; name: string; items: MenuItem[]; }

interface RawMaterialRequirement { material: string; unit: string; ratio_per_guest: number; }
interface KitchenItem { id?: string; event_id: number; item_name: string; unit: string; estimated_qty: number; actual_qty: number; is_adjusted: boolean; }
interface RawMaterial { id?: string; event_id: number; material_name: string; unit: string; estimated_qty: number; actual_qty: number; }

interface Supplier { id: string; name: string; contact_number: string; email: string; service_type: string; opening_balance: number; current_balance: number; created_at?: string; }
interface SupplierPayment { id: string; supplier_id: string; date: string; amount: number; method: string; notes?: string; }
interface ClientProfile { clientName: string; phone: string; totalPaid: number; remainingBalance: number; bookings: Booking[]; payments: {date: string, amount: number, method: string}[]; }

const INITIAL_MENUS: Menu[] = [
  { 
    id: 1, 
    name:"Menu A - Desi", 
    items:[
      {id:1, item:"Biryani", unit:"per plate", rate:250, raw_materials: [{material: "Rice", unit: "kg", ratio_per_guest: 0.2}, {material: "Chicken", unit: "kg", ratio_per_guest: 0.25}]},
      {id:2, item:"Nihari", unit:"per plate", rate:280, raw_materials: [{material: "Beef", unit: "kg", ratio_per_guest: 0.25}, {material: "Wheat", unit: "kg", ratio_per_guest: 0.05}]},
      {id:3, item:"Naan", unit:"per piece", rate:30, raw_materials: [{material: "Flour", unit: "kg", ratio_per_guest: 0.1}]},
      {id:4, item:"Raita", unit:"per portion", rate:40, raw_materials: [{material: "Yogurt", unit: "kg", ratio_per_guest: 0.1}]},
      {id:5, item:"Dessert", unit:"per plate", rate:80, raw_materials: [{material: "Sugar", unit: "kg", ratio_per_guest: 0.05}, {material: "Milk", unit: "liter", ratio_per_guest: 0.15}]}
    ] 
  },
  { 
    id: 2, 
    name:"Menu B - Continental", 
    items:[
      {id:6, item:"Grilled Chicken", unit:"per plate", rate:450, raw_materials: [{material: "Chicken Breast", unit: "kg", ratio_per_guest: 0.3}]},
      {id:7, item:"Pasta", unit:"per plate", rate:350, raw_materials: [{material: "Pasta", unit: "kg", ratio_per_guest: 0.15}, {material: "Cream", unit: "liter", ratio_per_guest: 0.05}]},
      {id:8, item:"Garlic Bread", unit:"per piece", rate:60, raw_materials: [{material: "Bread", unit: "loaf", ratio_per_guest: 0.1}]},
      {id:9, item:"Soup", unit:"per bowl", rate:120, raw_materials: [{material: "Vegetables", unit: "kg", ratio_per_guest: 0.1}]},
      {id:10, item:"Ice Cream", unit:"per scoop", rate:100, raw_materials: [{material: "Ice Cream", unit: "liter", ratio_per_guest: 0.1}]}
    ] 
  },
  { id: 3, name:"Custom", items:[] },
];

const EVENT_TYPES = ["Wedding","Corporate","Birthday","Mehndi","Engagement","Conference","Other"];
const VENUES = ["Main Hall","Banquet Hall","Garden","Lawn Area","Conference Room","Rooftop"];
const PAYMENT_METHODS = ["Cash","Bank Transfer","Cheque","Online"];

const sc = (s: BookingStatus) => s==="confirmed"?"bg-success/10 text-success border-success/20":s==="tentative"?"bg-warning/10 text-warning border-warning/20":s==="postponed"?"bg-secondary/10 text-secondary border-secondary/20":"bg-destructive/10 text-destructive border-destructive/20";
const sd = (s: BookingStatus) => s==="confirmed"?"bg-success":s==="tentative"?"bg-warning":s==="postponed"?"bg-secondary":"bg-destructive";

const EMPTY = { clientName:"",phone:"",eventType:"",eventDate:"",bookingDate:new Date().toISOString().split("T")[0],venue:"",guests:"",totalAmount:"",advance:"",paymentMethod:"Cash",status:"tentative" as BookingStatus,menu:"Menu A - Desi",notes:"",thirdParty:false,supplierCost:"",sellingRate:"" };

const EventBooking = () => {
  const { canDo, logAction } = useAuth();
  const [menus, setMenus] = useState<Menu[]>(INITIAL_MENUS);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | string | null>(null);
  const [itemForm, setItemForm] = useState<MenuItem>({ item: "", unit: "per plate", rate: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [kitchenItems, setKitchenItems] = useState<KitchenItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [showRawMaterialsModal, setShowRawMaterialsModal] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierPaymentModal, setShowSupplierPaymentModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supplierPaymentForm, setSupplierPaymentForm] = useState({ amount: 0, method: "Cash", date: format(new Date(), "yyyy-MM-dd"), notes: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", contact: "", email: "", category: "Food", opening_balance: 0 });
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [showClientProfile, setShowClientProfile] = useState(false);
  const [calView, setCalView] = useState<"day" | "week" | "month">("month");
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
  const [proceedWithBooking, setProceedWithBooking] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchMenus = async () => {
    setLoadingMenus(true);
    try {
      // 1. Fetch menus
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .order('id', { ascending: true });

      if (menusError) throw menusError;

      if (menusData && menusData.length > 0) {
        // 2. Fetch items for each menu
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .order('id', { ascending: true });

        if (itemsError) throw itemsError;

        const formattedMenus = menusData.map(m => ({
          ...m,
          items: itemsData?.filter(i => i.menu_id === m.id) || []
        }));
        setMenus(formattedMenus);
      } else {
        // Fallback to initial menus if DB is empty
        setMenus(INITIAL_MENUS);
      }
    } catch (error: any) {
      console.error("Error fetching menus:", error);
      toast.error("Failed to load menus from database");
      setMenus(INITIAL_MENUS); // Fallback
    } finally {
      setLoadingMenus(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data: sData } = await supabase.from('suppliers').select('*');
      if (sData) setSuppliers(sData);
      
      const { data: pData } = await supabase.from('supplier_payments').select('*').order('date', { ascending: false });
      if (pData) setSupplierPayments(pData);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  const handleAddSupplier = async () => {
    if (!supplierForm.name) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('suppliers').insert([{
        name: supplierForm.name,
        contact_number: supplierForm.contact,
        email: supplierForm.email,
        service_type: supplierForm.category,
        opening_balance: supplierForm.opening_balance,
        current_balance: supplierForm.opening_balance
      }]);
      if (error) throw error;
      toast.success("Supplier added successfully");
      setShowAddSupplierModal(false);
      setSupplierForm({ name: "", contact: "", email: "", category: "Food", opening_balance: 0 });
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add supplier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSupplierPayment = async () => {
    if (!selectedSupplier || supplierPaymentForm.amount <= 0) return;
    setIsSaving(true);
    try {
      const payment = {
        supplier_id: selectedSupplier.id,
        amount: supplierPaymentForm.amount,
        method: supplierPaymentForm.method,
        date: supplierPaymentForm.date,
        notes: supplierPaymentForm.notes
      };

      const { error: pErr } = await supabase.from('supplier_payments').insert([payment]);
      if (pErr) throw pErr;

      const { error: sErr } = await supabase.from('suppliers').update({
        current_balance: selectedSupplier.current_balance - supplierPaymentForm.amount
      }).eq('id', selectedSupplier.id);
      if (sErr) throw sErr;

      toast.success("Payment recorded successfully");
      setShowSupplierPaymentModal(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  };

  const openClientProfile = (clientName: string, phone: string) => {
    const clientBookings = bookings.filter(b => b.clientName === clientName);
    const totalPaid = clientBookings.reduce((sum, b) => sum + b.advance, 0);
    const remainingBalance = clientBookings.reduce((sum, b) => sum + b.balanceRemaining, 0);
    
    // Mock client payments for now since we don't have a separate client_payments table yet
    const clientPayments = clientBookings.map(b => ({
      date: b.bookingDate,
      amount: b.advance,
      method: b.paymentMethod
    }));

    setSelectedClient({
      clientName,
      phone,
      totalPaid,
      remainingBalance,
      bookings: clientBookings,
      payments: clientPayments
    });
    setShowClientProfile(true);
  };

  useEffect(() => {
    fetchMenus();
    fetchSuppliers();
  }, []);

  const handleEditClick = (item: MenuItem, menuId: number | string) => {
    setEditingItem(item);
    setActiveMenuId(menuId);
    setItemForm({ ...item });
    setShowItemModal(true);
  };

  const handleAddClick = (menuId: number | string) => {
    setEditingItem(null);
    setActiveMenuId(menuId);
    setItemForm({ item: "", unit: "per plate", rate: 0 });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.item || itemForm.rate <= 0) {
      toast.error("Please provide item name and a valid rate");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            item: itemForm.item,
            unit: itemForm.unit,
            rate: itemForm.rate
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        logAction(`Updated menu item: ${itemForm.item}`, "Event Booking");
        toast.success("Item updated successfully");
      } else {
        // Add new item
        const { error } = await supabase
          .from('menu_items')
          .insert([{
            item: itemForm.item,
            unit: itemForm.unit,
            rate: itemForm.rate,
            menu_id: activeMenuId
          }]);

        if (error) throw error;
        logAction(`Added new menu item: ${itemForm.item}`, "Event Booking");
        toast.success("Item added successfully");
      }
      
      setShowItemModal(false);
      fetchMenus(); // Refresh state
    } catch (error: any) {
      console.error("Error saving menu item:", error);
      toast.error(error.message || "Failed to save item");
      
      // Local state update fallback if Supabase fails (e.g. table doesn't exist)
      if (editingItem) {
        setMenus(prev => prev.map(m => 
          m.id === activeMenuId 
            ? { ...m, items: m.items.map(i => i.id === editingItem.id ? { ...itemForm } : i) }
            : m
        ));
      } else {
        setMenus(prev => prev.map(m => 
          m.id === activeMenuId 
            ? { ...m, items: [...m.items, { ...itemForm, id: Date.now() }] }
            : m
        ));
      }
      setShowItemModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchKitchenData = async (eventId: number) => {
    try {
      const { data: kiData } = await supabase.from('kitchen_items').select('*').eq('event_id', eventId);
      const { data: rmData } = await supabase.from('raw_materials').select('*').eq('event_id', eventId);
      
      if (kiData && kiData.length > 0) {
        setKitchenItems(kiData);
      } else {
        // Generate from menu
        const booking = bookings.find(b => b.id === eventId);
        if (booking) {
          const menu = menus.find(m => m.name === booking.menu);
          if (menu) {
            const items: KitchenItem[] = menu.items.map(mi => ({
              event_id: eventId,
              item_name: mi.item,
              unit: mi.unit,
              estimated_qty: booking.guests,
              actual_qty: booking.guests,
              is_adjusted: false
            }));
            setKitchenItems(items);
          } else {
            setKitchenItems([]);
          }
        } else {
          setKitchenItems([]);
        }
      }

      if (rmData && rmData.length > 0) {
        setRawMaterials(rmData);
      } else {
        // Generate from kitchen items & menu requirements
        const booking = bookings.find(b => b.id === eventId);
        if (booking) {
          const menu = menus.find(m => m.name === booking.menu);
          if (menu) {
            const materialsMap = new Map<string, {name: string, unit: string, qty: number}>();
            menu.items.forEach(mi => {
              if (mi.raw_materials) {
                mi.raw_materials.forEach(rm => {
                  const key = `${rm.material}-${rm.unit}`;
                  const current = materialsMap.get(key) || { name: rm.material, unit: rm.unit, qty: 0 };
                  materialsMap.set(key, { ...current, qty: current.qty + ((rm.ratio_per_guest ?? 0) * (booking.guests ?? 0)) });
                });
              }
            });
            const materials: RawMaterial[] = Array.from(materialsMap.values()).map(m => ({
              event_id: eventId,
              material_name: m.name,
              unit: m.unit,
              estimated_qty: m.qty,
              actual_qty: m.qty
            }));
            setRawMaterials(materials);
          } else {
            setRawMaterials([]);
          }
        } else {
          setRawMaterials([]);
        }
      }
    } catch (err) {
      console.error("Error fetching kitchen data:", err);
      setKitchenItems([]);
      setRawMaterials([]);
    }
  };

  const handleSaveKitchen = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      // Upsert kitchen items
      const { error: kiErr } = await supabase.from('kitchen_items').upsert(
        kitchenItems.map(item => ({ ...item, event_id: selected.id })),
        { onConflict: 'event_id,item_name' }
      );
      if (kiErr) throw kiErr;

      // Upsert raw materials
      const { error: rmErr } = await supabase.from('raw_materials').upsert(
        rawMaterials.map(item => ({ ...item, event_id: selected.id })),
        { onConflict: 'event_id,material_name' }
      );
      if (rmErr) throw rmErr;

      toast.success("Kitchen data saved successfully");
    } catch (err: any) {
      console.error("Error saving kitchen data:", err);
      toast.error(err.message || "Failed to save kitchen data");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [bookings, setBookings] = useState<Booking[]>(DUMMY_BOOKINGS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showKitchen, setShowKitchen] = useState(false);
  const [selected, setSelected] = useState<Booking|null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [nb, setNb] = useState(EMPTY);

  const filtered = bookings.filter(b => {
    const ms = b.clientName.toLowerCase().includes(search.toLowerCase()) || b.eventType.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter==="all" || b.status===statusFilter;
    return ms && mf;
  });

  const checkAvailability = () => {
    if (!nb.eventDate || !nb.venue) return true;
    const existing = bookings.find(b => b.eventDate === nb.eventDate && b.venue === nb.venue && b.status !== 'cancelled');
    if (existing) {
      setAvailabilityWarning(`This venue is already booked on this date for "${existing.clientName}" (${existing.eventType})`);
      return false;
    }
    setAvailabilityWarning(null);
    return true;
  };

  const handleAdd = () => {
    if (!nb.clientName || !nb.eventDate) return;
    
    if (!proceedWithBooking) {
      const isAvailable = checkAvailability();
      if (!isAvailable) {
        setProceedWithBooking(true);
        return;
      }
    }

    const total = Number(nb.totalAmount), adv = Number(nb.advance);
    setBookings([...bookings,{id:bookings.length+1,...nb,guests:Number(nb.guests),totalAmount:total,advance:adv,balanceRemaining:total-adv,supplierCost:Number(nb.supplierCost),sellingRate:Number(nb.sellingRate)}]);
    setNb(EMPTY); setShowAdd(false); setAvailabilityWarning(null); setProceedWithBooking(false);
  };

  const monthStart = startOfMonth(calMonth);
  const days = eachDayOfInterval({start:monthStart,end:endOfMonth(calMonth)});
  const startDow = getDay(monthStart);
  const bookingDates = bookings.map(b=>({date:new Date(b.eventDate),status:b.status,name:b.clientName}));
  const getDayB = (d:Date) => bookingDates.filter(b=>isSameDay(b.date,d));
  const tp = bookings.filter(b=>b.thirdParty).reduce((s,b)=>s+(b.sellingRate-b.supplierCost),0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-foreground">Event Booking & Scheduling</h2><p className="text-sm text-muted-foreground">All bookings, menus, kitchen production, third-party sourcing</p></div>
        <Button onClick={()=>setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4"/>New Booking</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[{l:"Total",v:bookings.length,c:"text-foreground"},{l:"Confirmed",v:bookings.filter(b=>b.status==="confirmed").length,c:"text-success"},{l:"Tentative",v:bookings.filter(b=>b.status==="tentative").length,c:"text-warning"},{l:"Postponed",v:bookings.filter(b=>b.status==="postponed").length,c:"text-secondary"},{l:"Cancelled",v:bookings.filter(b=>b.status==="cancelled").length,c:"text-destructive"},{l:"3rd Party Profit",v:`₨ ${tp.toLocaleString()}`,c:"text-primary"}].map(c=>(
          <div key={c.l} className="rounded-lg border border-border bg-card p-3"><p className="text-[10px] uppercase font-bold text-muted-foreground">{c.l}</p><p className={`mt-1 text-base sm:text-lg font-bold ${c.c}`}>{c.v}</p></div>
        ))}
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="list">All Bookings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen Sheet</TabsTrigger>
          <TabsTrigger value="thirdparty">Third-Party Sourcing</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap gap-3 border-b border-border p-4">
              <div className="relative flex-1 min-w-40"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="tentative">Tentative</SelectItem><SelectItem value="postponed">Postponed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead><tr className="border-b border-border bg-muted/40">{["Client","Type","Date","Venue","Guests","Total","Advance","Balance","Status","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(b=>(
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-3 text-sm font-medium text-card-foreground whitespace-nowrap">
                        <button onClick={() => openClientProfile(b.clientName, b.phone)} className="hover:text-primary hover:underline transition-colors flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {b.clientName}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{b.eventType}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">{b.eventDate}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{b.venue}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{b.guests}</td>
                      <td className="px-3 py-3 text-sm font-medium text-card-foreground whitespace-nowrap">₨ {b.totalAmount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-sm text-success whitespace-nowrap">₨ {b.advance.toLocaleString()}</td>
                      <td className="px-3 py-3 text-sm font-medium text-destructive whitespace-nowrap">₨ {b.balanceRemaining.toLocaleString()}</td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sc(b.status)}`}><span className={`h-1.5 w-1.5 rounded-full ${sd(b.status)}`}/>{b.status}</span></td>
                      <td className="px-3 py-3"><div className="flex gap-1">
                        <button onClick={()=>{setSelected(b);setShowView(true);}} className="rounded p-1 hover:bg-muted"><Eye className="h-3.5 w-3.5 text-muted-foreground"/></button>
                        <button onClick={()=>{setSelected(b);setShowKitchen(true);}} className="rounded p-1 hover:bg-muted" title="Kitchen Sheet"><UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground"/></button>
                        <button onClick={()=>setBookings(bookings.filter(x=>x.id!==b.id))} className="rounded p-1 hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t-2 border-border bg-muted/40">
                  <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-muted-foreground">Totals ({filtered.length})</td>
                  <td className="px-3 py-2 text-xs font-bold">₨ {filtered.reduce((s,b)=>s+b.totalAmount,0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs font-bold text-success">₨ {filtered.reduce((s,b)=>s+b.advance,0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs font-bold text-destructive">₨ {filtered.reduce((s,b)=>s+b.balanceRemaining,0).toLocaleString()}</td>
                  <td colSpan={2}/>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <button onClick={()=>setCalMonth(subMonths(calMonth,1))} className="rounded p-1 hover:bg-muted"><ChevronLeft className="h-5 w-5"/></button>
                <h3 className="text-lg font-bold text-card-foreground min-w-[140px] text-center">{format(calMonth, calView === 'month' ? "MMMM yyyy" : "MMM d, yyyy")}</h3>
                <button onClick={()=>setCalMonth(addMonths(calMonth,1))} className="rounded p-1 hover:bg-muted"><ChevronRight className="h-5 w-5"/></button>
              </div>

              <div className="flex bg-muted p-1 rounded-lg">
                {(["day", "week", "month"] as const).map(v => (
                  <button 
                    key={v} 
                    onClick={() => setCalView(v)} 
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${calView === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
                {(["confirmed", "tentative", "postponed", "cancelled"] as const).map(s => {
                  const count = bookings.filter(b => b.status === s && b.eventDate.startsWith(format(calMonth, "yyyy-MM"))).length;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${s === 'confirmed' ? 'bg-success' : s === 'tentative' ? 'bg-warning' : s === 'cancelled' ? 'bg-destructive' : 'bg-orange-500'}`} />
                      <span className="text-xs font-semibold capitalize">{s}: <span className="text-foreground">{count}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>

            {calView === "month" && (
              <div className="grid grid-cols-7 gap-1">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
                {Array.from({length:startDow}).map((_,i)=><div key={`e${i}`}/>)}
                {days.map(day=>{
                  const db = getDayB(day);
                  return <div key={day.toISOString()} className={`min-h-[100px] rounded-lg border p-1 text-xs ${db.length>0?"border-primary/30 bg-primary/5":"border-border hover:bg-muted/30"}`}>
                    <div className="mb-1 font-medium text-card-foreground">{format(day,"d")}</div>
                    <div className="space-y-1">
                      {db.map((b,i)=>(
                        <div 
                          key={i} 
                          className="truncate rounded px-1.5 py-0.5 text-[10px] font-bold border shadow-sm cursor-pointer hover:brightness-95 transition-all" 
                          onClick={() => { setSelected(bookings.find(x => x.clientName === b.name) || null); setShowView(true); }}
                          style={{
                            backgroundColor: b.status === "confirmed" ? "#dcfce7" : b.status === "tentative" ? "#fef9c3" : b.status === "cancelled" ? "#fee2e2" : "#ffedd5",
                            color: b.status === "confirmed" ? "#166534" : b.status === "tentative" ? "#854f0b" : b.status === "cancelled" ? "#991b1b" : "#9a3412",
                            borderColor: b.status === "confirmed" ? "#bbf7d0" : b.status === "tentative" ? "#fef08a" : b.status === "cancelled" ? "#fecaca" : "#fed7aa"
                          }}
                        >
                          {b.name}
                        </div>
                      ))}
                    </div>
                  </div>;
                })}
              </div>
            )}

            {calView === "week" && (
              <div className="space-y-4">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(calMonth);
                  d.setDate(d.getDate() - d.getDay() + i);
                  const db = getDayB(d);
                  return (
                    <div key={i} className="flex gap-4 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="w-24 flex flex-col items-center justify-center border-r border-border pr-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{format(d, "EEE")}</span>
                        <span className="text-2xl font-black">{format(d, "d")}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        {db.length > 0 ? db.map((b, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { setSelected(bookings.find(x => x.clientName === b.name) || null); setShowView(true); }}
                            className="flex items-center justify-between p-2 rounded-md border shadow-sm cursor-pointer hover:scale-[1.01] transition-transform"
                            style={{
                              backgroundColor: b.status === "confirmed" ? "#dcfce7" : b.status === "tentative" ? "#fef9c3" : b.status === "cancelled" ? "#fee2e2" : "#ffedd5",
                              color: b.status === "confirmed" ? "#166534" : b.status === "tentative" ? "#854f0b" : b.status === "cancelled" ? "#991b1b" : "#9a3412",
                              borderColor: b.status === "confirmed" ? "#bbf7d0" : b.status === "tentative" ? "#fef08a" : b.status === "cancelled" ? "#fecaca" : "#fed7aa"
                            }}
                          >
                            <span className="font-bold text-sm">{b.name} — {bookings.find(x => x.clientName === b.name)?.eventType}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/50">{b.status}</span>
                          </div>
                        )) : (
                          <div className="h-full flex items-center text-muted-foreground text-xs italic">No events scheduled</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {calView === "day" && (
              <div className="p-6 rounded-xl border border-border bg-muted/10">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h4 className="text-2xl font-black text-foreground">{format(calMonth, "EEEE")}</h4>
                    <p className="text-sm text-muted-foreground">{format(calMonth, "MMMM d, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daily Events</p>
                    <p className="text-3xl font-black text-primary">{getDayB(calMonth).length}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {getDayB(calMonth).length > 0 ? getDayB(calMonth).map((b, i) => (
                    <div 
                      key={i} 
                      onClick={() => { setSelected(bookings.find(x => x.clientName === b.name) || null); setShowView(true); }}
                      className="p-4 rounded-xl border shadow-md flex items-center justify-between cursor-pointer hover:translate-x-1 transition-transform"
                      style={{
                        backgroundColor: b.status === "confirmed" ? "#dcfce7" : b.status === "tentative" ? "#fef9c3" : b.status === "cancelled" ? "#fee2e2" : "#ffedd5",
                        color: b.status === "confirmed" ? "#166534" : b.status === "tentative" ? "#854f0b" : b.status === "cancelled" ? "#991b1b" : "#9a3412",
                        borderColor: b.status === "confirmed" ? "#bbf7d0" : b.status === "tentative" ? "#fef08a" : b.status === "cancelled" ? "#fecaca" : "#fed7aa"
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-lg font-black">{b.name}</span>
                        <span className="text-sm font-bold opacity-80">{bookings.find(x => x.clientName === b.name)?.eventType} at {bookings.find(x => x.clientName === b.name)?.venue}</span>
                      </div>
                      <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-white/40 shadow-inner">{b.status}</span>
                    </div>
                  )) : (
                    <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <p className="text-lg font-bold">No bookings for this day</p>
                      <p className="text-sm">Click "New Booking" to schedule an event</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu">
          <div className="space-y-4">
            {loadingMenus ? (
              <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              menus.filter(m=>m.name!=="Custom").map(menu=>(
                <div key={menu.id} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <h3 className="font-semibold text-card-foreground">{menu.name}</h3>
                    {canDo("add") && (
                      <Button variant="outline" size="sm" onClick={() => handleAddClick(menu.id)}>+ Add Item</Button>
                    )}
                  </div>
                  <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-border bg-muted/40"><th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Item</th><th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Unit</th><th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Rate (₨)</th><th className="px-4 py-2 text-xs text-muted-foreground text-center">Edit</th></tr></thead>
                    <tbody>{menu.items.map((item,idx)=><tr key={item.id || idx} className="border-b border-border last:border-0"><td className="px-4 py-2 text-sm font-medium text-card-foreground">{item.item}</td><td className="px-4 py-2 text-sm text-muted-foreground">{item.unit}</td><td className="px-4 py-2 text-sm">₨ {item.rate}</td><td className="px-4 py-2 text-center">{canDo("edit") && <button onClick={() => handleEditClick(item, menu.id)} className="rounded p-1 hover:bg-muted"><Edit className="h-3.5 w-3.5 text-muted-foreground"/></button>}</td></tr>)}</tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="kitchen">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 font-semibold text-card-foreground">Kitchen Production Sheet</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <Select onValueChange={v=>{const b=bookings.find(x=>x.id===Number(v));setSelected(b||null); if(b) fetchKitchenData(b.id);}}>
                <SelectTrigger className="w-72"><SelectValue placeholder="Select event..."/></SelectTrigger>
                <SelectContent>{bookings.filter(b=>b.status!=="cancelled").map(b=><SelectItem key={b.id} value={String(b.id)}>{b.clientName} — {b.eventDate}</SelectItem>)}</SelectContent>
              </Select>
              {selected && (
                <div className="flex gap-2">
                  {canDo("edit") && (
                    <Button variant="outline" size="sm" onClick={handleSaveKitchen} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                      Save Progress
                    </Button>
                  )}
                  {canDo("add") && (
                    <Button variant="outline" size="sm" onClick={() => setShowConsumptionModal(true)}>
                      <CheckCircle2 className="h-4 w-4 mr-2"/>
                      Track Consumption
                    </Button>
                  )}
                </div>
              )}
            </div>

            {selected&&(
              <>
                <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Event</p><p className="font-medium">{selected.clientName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{selected.eventDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Guests</p><p className="font-medium">{selected.guests}</p></div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead><tr className="border-b border-border bg-muted/40">{["Item","Unit","Estimated Qty","Manual Adjustment"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody>
                      {kitchenItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 text-sm font-medium text-card-foreground">{item.item_name}</td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{item.unit}</td>
                          <td className="px-4 py-2 text-sm">{item.estimated_qty}</td>
                          <td className="px-4 py-2 text-sm">
                            <Input 
                              type="number" 
                              className="w-24 h-8" 
                              value={item.actual_qty} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                setKitchenItems(prev => prev.map((ki, i) => i === idx ? { ...ki, actual_qty: val, is_adjusted: val !== ki.estimated_qty } : ki));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2"/>Print Sheet</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRawMaterialsModal(true)}>Raw Material List</Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="thirdparty">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><h3 className="font-semibold text-card-foreground">Third-Party Sourcing</h3><p className="text-xs text-muted-foreground mt-1">Supplier rate vs selling rate with auto profit calculation and supplier ledger update</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead><tr className="border-b border-border bg-muted/40">{["Event","Date","Supplier Cost","Selling Rate","Profit","Margin %","Ledger Updated"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{bookings.filter(b=>b.thirdParty).map(b=>{const profit=b.sellingRate-b.supplierCost;const margin=b.sellingRate>0?Math.round((profit/b.sellingRate)*100):0;return(
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground">{b.clientName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{b.eventDate}</td>
                    <td className="px-4 py-3 text-sm text-destructive">₨ {b.supplierCost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-card-foreground">₨ {b.sellingRate.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${profit>=0?"text-success":"text-destructive"}`}>₨ {profit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-success">{margin}%</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success border border-success/20">Updated</span></td>
                  </tr>
                );})}
                </tbody>
                <tfoot><tr className="border-t-2 border-border bg-muted/40">
                  <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-muted-foreground">Totals</td>
                  <td className="px-4 py-2 text-xs font-bold text-destructive">₨ {bookings.filter(b=>b.thirdParty).reduce((s,b)=>s+b.supplierCost,0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs font-bold">₨ {bookings.filter(b=>b.thirdParty).reduce((s,b)=>s+b.sellingRate,0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs font-bold text-success">₨ {tp.toLocaleString()}</td>
                  <td colSpan={2}/>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShowAddSupplierModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
          <div className="space-y-4">
            {suppliers.map(s => (
              <div key={s.id} className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <h3 className="font-semibold text-card-foreground">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.service_type} | {s.contact_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="text-lg font-bold text-destructive">₨ {s.current_balance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4"/>Payment History</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {supplierPayments.filter(p => p.supplier_id === s.id).map(p => (
                        <div key={p.id} className="flex justify-between text-xs border-b border-border pb-1">
                          <span className="text-muted-foreground">{p.date}</span>
                          <span className="font-medium">₨ {p.amount.toLocaleString()} ({p.method})</span>
                        </div>
                      ))}
                      {supplierPayments.filter(p => p.supplier_id === s.id).length === 0 && <p className="text-xs text-muted-foreground">No payment history found.</p>}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Opening Balance:</span>
                        <span className="font-medium">₨ {s.opening_balance.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button className="mt-4 w-full" onClick={() => { setSelectedSupplier(s); setSupplierPaymentForm({ ...supplierPaymentForm, amount: 0 }); setShowSupplierPaymentModal(true); }}>
                      <Wallet className="h-4 w-4 mr-2"/>
                      Add Payment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <div className="text-center py-10 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">No suppliers found in the database.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD MODAL */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Event Booking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Client Name *</Label><Input placeholder="e.g. Ahmed & Sara Wedding" value={nb.clientName} onChange={e=>setNb({...nb,clientName:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input placeholder="0300-0000000" value={nb.phone} onChange={e=>setNb({...nb,phone:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Event Type</Label><Select value={nb.eventType} onValueChange={v=>setNb({...nb,eventType:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{EVENT_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Event Date *</Label><Input type="date" value={nb.eventDate} onChange={e=>setNb({...nb,eventDate:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Booking Date</Label><Input type="date" value={nb.bookingDate} onChange={e=>setNb({...nb,bookingDate:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Venue</Label><Select value={nb.venue} onValueChange={v=>setNb({...nb,venue:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{VENUES.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>No. of Guests</Label><Input type="number" placeholder="300" value={nb.guests} onChange={e=>setNb({...nb,guests:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Total Amount (₨)</Label><Input type="number" value={nb.totalAmount} onChange={e=>setNb({...nb,totalAmount:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Advance Paid (₨)</Label><Input type="number" value={nb.advance} onChange={e=>setNb({...nb,advance:e.target.value})}/></div>
            {nb.advance&&nb.totalAmount&&<div className="col-span-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">Balance Remaining: <strong className="text-destructive">₨ {(Number(nb.totalAmount)-Number(nb.advance)).toLocaleString()}</strong></div>}
            <div className="space-y-1.5"><Label>Payment Method</Label><Select value={nb.paymentMethod} onValueChange={v=>setNb({...nb,paymentMethod:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{PAYMENT_METHODS.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={nb.status} onValueChange={v=>setNb({...nb,status:v as BookingStatus})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="tentative">Tentative</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="postponed">Postponed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Menu</Label><Select value={nb.menu} onValueChange={v=>setNb({...nb,menu:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{menus.map(m=><SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center gap-2 pt-4"><input type="checkbox" id="tp" checked={nb.thirdParty} onChange={e=>setNb({...nb,thirdParty:e.target.checked})} className="accent-primary"/><Label htmlFor="tp">Third-Party Sourcing</Label></div>
            {nb.thirdParty&&<>
              <div className="space-y-1.5"><Label>Supplier Cost (₨)</Label><Input type="number" value={nb.supplierCost} onChange={e=>setNb({...nb,supplierCost:e.target.value})}/></div>
              <div className="space-y-1.5"><Label>Selling Rate (₨)</Label><Input type="number" value={nb.sellingRate} onChange={e=>setNb({...nb,sellingRate:e.target.value})}/></div>
              {nb.supplierCost&&nb.sellingRate&&<div className="col-span-2 rounded-lg bg-success/10 border border-success/20 p-2 text-sm">Auto Profit: <strong className="text-success">₨ {(Number(nb.sellingRate)-Number(nb.supplierCost)).toLocaleString()}</strong></div>}
            </>}
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input placeholder="Special requirements..." value={nb.notes} onChange={e=>setNb({...nb,notes:e.target.value})}/></div>
            
            {availabilityWarning && (
              <div className="col-span-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm flex flex-col gap-2">
                <p className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 rotate-45"/> Double Booking Warning</p>
                <p>{availabilityWarning}</p>
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="confirm-booking" checked={proceedWithBooking} onChange={e => setProceedWithBooking(e.target.checked)} className="accent-warning" />
                  <Label htmlFor="confirm-booking" className="text-warning font-medium">I understand and want to proceed anyway</Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>{setShowAdd(false); setAvailabilityWarning(null); setProceedWithBooking(false);}}>Cancel</Button><Button onClick={handleAdd}>{proceedWithBooking ? "Save Anyway" : "Save Booking"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW MODAL */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Booking Details</DialogTitle></DialogHeader>
          {selected&&<div className="space-y-2">{[{l:"Client",v:selected.clientName},{l:"Phone",v:selected.phone},{l:"Event Type",v:selected.eventType},{l:"Event Date",v:selected.eventDate},{l:"Booking Date",v:selected.bookingDate},{l:"Venue",v:selected.venue},{l:"Guests",v:selected.guests},{l:"Menu",v:selected.menu},{l:"Payment Method",v:selected.paymentMethod},{l:"Total Amount",v:`₨ ${selected.totalAmount.toLocaleString()}`},{l:"Advance Paid",v:`₨ ${selected.advance.toLocaleString()}`},{l:"Balance Remaining",v:`₨ ${selected.balanceRemaining.toLocaleString()}`},{l:"Status",v:selected.status},{l:"Third-Party",v:selected.thirdParty?`Yes (Profit: ₨ ${(selected.sellingRate-selected.supplierCost).toLocaleString()})`:"No"},{l:"Notes",v:selected.notes||"-"}].map(row=><div key={row.l} className="flex justify-between border-b border-border pb-2 text-sm last:border-0"><span className="text-muted-foreground">{row.l}</span><span className="font-medium text-card-foreground text-right">{String(row.v)}</span></div>)}</div>}
        </DialogContent>
      </Dialog>

      {/* KITCHEN MODAL */}
      <Dialog open={showKitchen} onOpenChange={setShowKitchen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Kitchen Sheet — {selected?.clientName}</DialogTitle></DialogHeader>
          {selected&&<>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-sm mb-2">
              <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{selected.eventDate}</p></div>
              <div><p className="text-xs text-muted-foreground">Guests</p><p className="font-medium">{selected.guests}</p></div>
              <div><p className="text-xs text-muted-foreground">Menu</p><p className="font-medium">{selected.menu}</p></div>
            </div>
            {(menus.find(m=>m.name===selected.menu)?.items||[]).map((item,idx)=><div key={idx} className="flex justify-between border-b border-border py-2 text-sm last:border-0"><span className="font-medium text-card-foreground">{item.item}</span><span className="text-muted-foreground">{selected.guests} × ₨{item.rate} = <strong className="text-card-foreground">₨ {(selected.guests*item.rate).toLocaleString()}</strong></span></div>)}
            <div className="flex justify-between border-t-2 border-border pt-2 text-sm font-bold"><span>Total Kitchen Cost</span><span className="text-primary">₨ {(menus.find(m=>m.name===selected.menu)?.items.reduce((s,i)=>s+selected.guests*i.rate,0)||0).toLocaleString()}</span></div>
          </>}
        </DialogContent>
      </Dialog>
      {/* MENU ITEM MODAL */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the name and price of this item." : "Enter the details for the new menu item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input 
                id="item-name" 
                placeholder="e.g. Biryani" 
                value={itemForm.item} 
                onChange={e => setItemForm({ ...itemForm, item: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-unit">Unit</Label>
                <Input 
                  id="item-unit" 
                  placeholder="e.g. per plate" 
                  value={itemForm.unit} 
                  onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-rate">Rate (₨)</Label>
                <Input 
                  id="item-rate" 
                  type="number" 
                  placeholder="0" 
                  value={itemForm.rate} 
                  onChange={e => setItemForm({ ...itemForm, rate: Number(e.target.value) })} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemModal(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* RAW MATERIALS MODAL */}
      <Dialog open={showRawMaterialsModal} onOpenChange={setShowRawMaterialsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Raw Material Requirements — {selected?.clientName}</DialogTitle>
            <DialogDescription>Auto-calculated based on menu and guest count ({selected?.guests} guests)</DialogDescription>
          </DialogHeader>
          <div className="py-4" ref={printRef}>
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold">Raw Material List</h2>
              <p>Event: {selected?.clientName} | Date: {selected?.eventDate} | Guests: {selected?.guests}</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Material</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Unit</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Required Qty</th>
                </tr>
              </thead>
              <tbody>
                {rawMaterials.map((rm, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-sm font-medium">{rm.material_name}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{rm.unit}</td>
                    <td className="px-4 py-2 text-sm font-bold">{rm.estimated_qty.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2"/>Print / Export PDF</Button>
            <Button onClick={() => setShowRawMaterialsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONSUMPTION TRACKING MODAL */}
      <Dialog open={showConsumptionModal} onOpenChange={setShowConsumptionModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Consumption Tracking — {selected?.clientName}</DialogTitle>
            <DialogDescription>Compare estimated raw materials with actual consumption</DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-y-auto max-h-[60vh]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Material</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Unit</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Estimated</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Actual</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rawMaterials.map((rm, idx) => {
                  const diff = rm.actual_qty - rm.estimated_qty;
                  return (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-sm font-medium">{rm.material_name}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{rm.unit}</td>
                      <td className="px-4 py-2 text-sm">{rm.estimated_qty.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={rm.actual_qty} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setRawMaterials(prev => prev.map((item, i) => i === idx ? { ...item, actual_qty: val } : item));
                          }}
                        />
                      </td>
                      <td className={`px-4 py-2 text-sm font-bold ${diff > 0 ? 'text-destructive' : diff < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowConsumptionModal(false)}>Cancel</Button>
             <Button onClick={handleSaveKitchen} disabled={isSaving}>
               {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
               Save Consumption
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* SUPPLIER PAYMENT MODAL */}
       <Dialog open={showSupplierPaymentModal} onOpenChange={setShowSupplierPaymentModal}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Add Supplier Payment — {selectedSupplier?.name}</DialogTitle>
             <DialogDescription>Enter the amount and method of payment for this supplier.</DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Amount (₨)</Label>
               <Input 
                 type="number" 
                 placeholder="0" 
                 value={supplierPaymentForm.amount} 
                 onChange={e => setSupplierPaymentForm({ ...supplierPaymentForm, amount: Number(e.target.value) })} 
               />
             </div>
             <div className="space-y-2">
               <Label>Payment Method</Label>
               <Select value={supplierPaymentForm.method} onValueChange={v => setSupplierPaymentForm({ ...supplierPaymentForm, method: v })}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Date</Label>
               <Input 
                 type="date" 
                 value={supplierPaymentForm.date} 
                 onChange={e => setSupplierPaymentForm({ ...supplierPaymentForm, date: e.target.value })} 
               />
             </div>
             <div className="space-y-2">
               <Label>Notes (Optional)</Label>
               <Input 
                 placeholder="Add any additional notes..." 
                 value={supplierPaymentForm.notes} 
                 onChange={e => setSupplierPaymentForm({ ...supplierPaymentForm, notes: e.target.value })} 
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowSupplierPaymentModal(false)}>Cancel</Button>
             <Button onClick={handleSupplierPayment} disabled={isSaving}>
               {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
               Save Payment
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* ADD SUPPLIER MODAL */}
       <Dialog open={showAddSupplierModal} onOpenChange={setShowAddSupplierModal}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Add New Supplier</DialogTitle>
             <DialogDescription>Enter the supplier details to add them to your ledger.</DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="s-name">Supplier Name</Label>
               <Input id="s-name" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} placeholder="e.g. ABC Catering" />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="s-contact">Contact Number</Label>
                 <Input id="s-contact" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} placeholder="e.g. 0300-1234567" />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="s-email">Email</Label>
                 <Input id="s-email" type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} placeholder="e.g. supplier@example.com" />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="s-category">Service Type</Label>
                 <Select value={supplierForm.category} onValueChange={v => setSupplierForm({...supplierForm, category: v})}>
                   <SelectTrigger id="s-category"><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {["Food", "Decoration", "Logistics", "Photography", "Sound System", "Waiters", "Other"].map(cat => (
                       <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="s-balance">Opening Balance (₨)</Label>
                 <Input id="s-balance" type="number" value={supplierForm.opening_balance} onChange={e => setSupplierForm({...supplierForm, opening_balance: Number(e.target.value)})} placeholder="0" />
               </div>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowAddSupplierModal(false)}>Cancel</Button>
             <Button onClick={handleAddSupplier} disabled={isSaving}>
               {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
               Add Supplier
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* CLIENT PROFILE MODAL */}
       <Dialog open={showClientProfile} onOpenChange={setShowClientProfile}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5"/>Client Profile: {selectedClient?.clientName}</DialogTitle>
             <DialogDescription>Comprehensive booking and payment history for this client.</DialogDescription>
           </DialogHeader>
           {selectedClient && (
             <div className="space-y-6 py-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="rounded-lg border border-border bg-card p-4">
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Paid</p>
                   <p className="text-xl font-bold text-success">₨ {selectedClient.totalPaid.toLocaleString()}</p>
                 </div>
                 <div className="rounded-lg border border-border bg-card p-4">
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Outstanding Balance</p>
                   <p className="text-xl font-bold text-destructive">₨ {selectedClient.remainingBalance.toLocaleString()}</p>
                 </div>
                 <div className="rounded-lg border border-border bg-card p-4">
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Bookings</p>
                   <p className="text-xl font-bold">{selectedClient.bookings.length}</p>
                 </div>
               </div>

               <div className="space-y-4">
                 <h4 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-2"><History className="h-4 w-4"/>Booking History</h4>
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="border-b border-border bg-muted/40">
                         <th className="px-3 py-2 text-left font-semibold">Date</th>
                         <th className="px-3 py-2 text-left font-semibold">Event</th>
                         <th className="px-3 py-2 text-left font-semibold">Venue</th>
                         <th className="px-3 py-2 text-left font-semibold">Status</th>
                         <th className="px-3 py-2 text-right font-semibold">Total</th>
                       </tr>
                     </thead>
                     <tbody>
                       {selectedClient.bookings.map(b => (
                         <tr key={b.id} className="border-b border-border last:border-0">
                           <td className="px-3 py-2">{b.eventDate}</td>
                           <td className="px-3 py-2">{b.eventType}</td>
                           <td className="px-3 py-2">{b.venue}</td>
                           <td className="px-3 py-2">
                             <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc(b.status)}`}>
                               {b.status}
                             </span>
                           </td>
                           <td className="px-3 py-2 text-right font-medium">₨ {b.totalAmount.toLocaleString()}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>

               <div className="space-y-4">
                 <h4 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-2"><Wallet className="h-4 w-4"/>Payment Summary</h4>
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="border-b border-border bg-muted/40">
                         <th className="px-3 py-2 text-left font-semibold">Date</th>
                         <th className="px-3 py-2 text-left font-semibold">Amount</th>
                         <th className="px-3 py-2 text-left font-semibold">Method</th>
                       </tr>
                     </thead>
                     <tbody>
                       {selectedClient.payments.map((p, idx) => (
                         <tr key={idx} className="border-b border-border last:border-0">
                           <td className="px-3 py-2">{p.date}</td>
                           <td className="px-3 py-2 font-medium text-success">₨ {p.amount.toLocaleString()}</td>
                           <td className="px-3 py-2">{p.method}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           )}
           <DialogFooter>
             <Button onClick={() => setShowClientProfile(false)}>Close Profile</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };

export default memo(EventBooking);
