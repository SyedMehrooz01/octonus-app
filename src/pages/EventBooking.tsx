import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, UtensilsCrossed, Edit, Loader2, Printer, Save, CheckCircle2, User, Wallet, History, CalendarDays, Clock, TrendingUp, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

const sc = (status: BookingStatus) => {
  const s = status?.toLowerCase();
  if (s === 'confirmed') return "bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  if (s === 'tentative') return "bg-gray-400 hover:bg-gray-500 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  if (s === 'pending') return "bg-blue-500 hover:bg-blue-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  if (s === 'cancelled' || s === 'postponed') return "bg-rose-500 hover:bg-rose-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  return "bg-muted text-muted-foreground border-border px-3 py-1 rounded-lg font-bold";
};

const EMPTY = { clientName:"",phone:"",eventType:"",eventDate:"",bookingDate:new Date().toISOString().split("T")[0],venue:"",guests:"",totalAmount:"",advance:"",paymentMethod:"Cash",status:"tentative" as BookingStatus,menu:"Menu A - Desi",notes:"",thirdParty:false,supplierCost:"",sellingRate:"" };

const EventBooking = () => {
  const { user, canDo, logAction } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const [bookings, setBookings] = useState<Booking[]>(DUMMY_BOOKINGS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showKitchen, setShowKitchen] = useState(false);
  const [selected, setSelected] = useState<Booking|null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [nb, setNb] = useState(EMPTY);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchMenus = async () => {
    setLoadingMenus(true);
    try {
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .order('id', { ascending: true });

      if (menusError) throw menusError;

      if (menusData && (menusData ?? []).length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .order('id', { ascending: true });

        if (itemsError) throw itemsError;

        const formattedMenus = (menusData ?? []).map(m => ({
          ...m,
          items: (itemsData ?? []).filter(i => i?.menu_id === m?.id) || []
        }));
        setMenus(formattedMenus);
      } else {
        setMenus(INITIAL_MENUS);
      }
    } catch (error: any) {
      toast.error("Failed to load menus from database");
      setMenus(INITIAL_MENUS);
    } finally {
      setLoadingMenus(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data: sData } = await supabase.from('suppliers').select('*');
      if (sData) setSuppliers(sData ?? []);
      
      const { data: pData } = await supabase.from('supplier_payments').select('*').order('date', { ascending: false });
      if (pData) setSupplierPayments(pData ?? []);
    } catch (err) {
      toast.error("Failed to fetch suppliers");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMenus(), fetchSuppliers()]);
      setLoading(false);
    };
    init();
  }, []);

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
    const clientBookings = (bookings ?? []).filter(b => b?.clientName === clientName);
    const totalPaid = clientBookings.reduce((sum, b) => sum + (b?.advance ?? 0), 0);
    const remainingBalance = clientBookings.reduce((sum, b) => sum + (b?.balanceRemaining ?? 0), 0);
    
    const clientPayments = clientBookings.map(b => ({
      date: b?.bookingDate ?? format(new Date(), "yyyy-MM-dd"),
      amount: b?.advance ?? 0,
      method: b?.paymentMethod ?? "Cash"
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
      fetchMenus();
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchKitchenData = async (eventId: number) => {
    try {
      const { data: kiData } = await supabase.from('kitchen_items').select('*').eq('event_id', eventId);
      const { data: rmData } = await supabase.from('raw_materials').select('*').eq('event_id', eventId);
      
      if (kiData && (kiData ?? []).length > 0) {
        setKitchenItems(kiData ?? []);
      } else {
        const booking = (bookings ?? []).find(b => b?.id === eventId);
        if (booking) {
          const menu = (menus ?? []).find(m => m?.name === booking?.menu);
          if (menu) {
            const items: KitchenItem[] = (menu?.items ?? []).map(mi => ({
              event_id: eventId,
              item_name: mi?.item,
              unit: mi?.unit,
              estimated_qty: booking?.guests ?? 0,
              actual_qty: booking?.guests ?? 0,
              is_adjusted: false
            }));
            setKitchenItems(items);
          }
        }
      }

      if (rmData && (rmData ?? []).length > 0) {
        setRawMaterials(rmData ?? []);
      } else {
        const booking = (bookings ?? []).find(b => b?.id === eventId);
        if (booking) {
          const menu = (menus ?? []).find(m => m?.name === booking?.menu);
          if (menu) {
            const materialsMap = new Map<string, {name: string, unit: string, qty: number}>();
            (menu?.items ?? []).forEach(mi => {
              if (mi?.raw_materials) {
                (mi?.raw_materials ?? []).forEach(rm => {
                  const key = `${rm?.material}-${rm?.unit}`;
                  const current = materialsMap.get(key) || { name: rm?.material, unit: rm?.unit, qty: 0 };
                  materialsMap.set(key, { ...current, qty: current.qty + ((rm?.ratio_per_guest ?? 0) * (booking?.guests ?? 0)) });
                });
              }
            });
            const materials: RawMaterial[] = Array.from(materialsMap.values()).map(m => ({
              event_id: eventId,
              material_name: m?.name,
              unit: m?.unit,
              estimated_qty: m?.qty,
              actual_qty: m?.qty
            }));
            setRawMaterials(materials);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to fetch kitchen data");
    }
  };

  const handleSaveKitchen = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      const { error: kiErr } = await supabase.from('kitchen_items').upsert(
        kitchenItems.map(item => ({ ...item, event_id: selected.id })),
        { onConflict: 'event_id,item_name' }
      );
      if (kiErr) throw kiErr;

      const { error: rmErr } = await supabase.from('raw_materials').upsert(
        rawMaterials.map(item => ({ ...item, event_id: selected.id })),
        { onConflict: 'event_id,material_name' }
      );
      if (rmErr) throw rmErr;

      toast.success("Kitchen data saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save kitchen data");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchBookingsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_bookings')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      if (data) {
        setBookings(data.map(b => ({
          id: b.id,
          clientName: b.client_name,
          phone: b.phone,
          eventType: b.event_type,
          eventDate: b.event_date,
          bookingDate: b.booking_date,
          venue: b.venue,
          guests: b.guests,
          totalAmount: b.total_amount,
          advance: b.advance,
          balanceRemaining: b.balance_remaining,
          status: b.status,
          paymentMethod: b.payment_method,
          menu: b.menu,
          notes: b.notes,
          thirdParty: b.third_party,
          supplierCost: b.supplier_cost,
          sellingRate: b.selling_rate
        })));
      }
    } catch (err: any) {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBookingsData(), fetchMenus(), fetchSuppliers()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAdd = async () => {
    if (!nb?.clientName || !nb?.eventDate) {
      toast.error("Client name and event date are required");
      return;
    }
    if (!proceedWithBooking && !checkAvailability()) {
      setProceedWithBooking(true);
      return;
    }
    
    setSaving(true);
    try {
      const total = Number(nb?.totalAmount || 0);
      const adv = Number(nb?.advance || 0);
      const bookingData = {
        client_name: nb.clientName,
        phone: nb.phone,
        event_type: nb.eventType,
        event_date: nb.eventDate,
        booking_date: nb.bookingDate,
        venue: nb.venue,
        guests: Number(nb.guests || 0),
        total_amount: total,
        advance: adv,
        balance_remaining: total - adv,
        status: nb.status,
        payment_method: nb.paymentMethod,
        menu: nb.menu,
        notes: nb.notes,
        third_party: nb.thirdParty,
        supplier_cost: Number(nb.supplierCost || 0),
        selling_rate: Number(nb.sellingRate || 0),
        created_by: user?.email
      };

      if ((nb as any).id) {
        const { error } = await supabase.from('event_bookings').update(bookingData).eq('id', (nb as any).id);
        if (error) throw error;
        toast.success("Booking updated successfully");
      } else {
        const { error } = await supabase.from('event_bookings').insert([bookingData]);
        if (error) throw error;
        toast.success("Booking created successfully");
      }

      await fetchBookingsData();
      setNb(EMPTY); 
      setShowAdd(false); 
      setAvailabilityWarning(null); 
      setProceedWithBooking(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this booking?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('event_bookings').delete().eq('id', id);
      if (error) throw error;
      await fetchBookingsData();
      toast.success("Booking deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: BookingStatus) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('event_bookings').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchBookingsData();
      toast.success(`Booking status updated to ${status}`);
    } catch (err: any) {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const monthStart = startOfMonth(calMonth);
  const days = eachDayOfInterval({start:monthStart,end:endOfMonth(calMonth)});
  const startDow = getDay(monthStart);
  const bookingDates = (bookings ?? []).map(b=>({date:new Date(b?.eventDate ?? ""),status:b?.status,name:b?.clientName}));
  const getDayB = (d:Date) => (bookingDates ?? []).filter(b=>isSameDay(b?.date,d));
  const tp = (bookings ?? []).filter(b=>b?.thirdParty).reduce((s,b)=>s+((b?.sellingRate ?? 0)-(b?.supplierCost ?? 0)),0);

  const handlePrint = () => {
    window.print();
  };

  const filtered = (bookings ?? []).filter(b => {
    const ms = (b?.clientName ?? "").toLowerCase().includes((search ?? "").toLowerCase()) || (b?.eventType ?? "").toLowerCase().includes((search ?? "").toLowerCase());
    const mf = statusFilter==="all" || b?.status===statusFilter;
    return ms && mf;
  });

  const totalPages = Math.ceil((filtered ?? []).length / itemsPerPage);
  const paginatedBookings = (filtered ?? []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const checkAvailability = () => {
    if (!nb?.eventDate || !nb?.venue) return true;
    const existing = (bookings ?? []).find(b => b?.eventDate === nb?.eventDate && b?.venue === nb?.venue && b?.status !== 'cancelled');
    if (existing) {
      setAvailabilityWarning(`This venue is already booked on this date for "${existing?.clientName}" (${existing?.eventType})`);
      return false;
    }
    setAvailabilityWarning(null);
    return true;
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Event Booking & Scheduling</h1>
          <p className="text-slate-500 font-bold mt-1">Manage bookings, menus, and production from one central hub.</p>
        </div>
        <Button onClick={()=>setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 gap-2 h-12 px-8 transition-all hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-right duration-500">
          <Plus className="h-5 w-5"/> NEW BOOKING
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[
          {l:"Total Bookings",v:(bookings ?? []).length,c:"from-blue-500 to-blue-700",s:"shadow-blue-500/20",i:CalendarDays},
          {l:"Confirmed",v:(bookings ?? []).filter(b=>b?.status==="confirmed").length,c:"from-emerald-500 to-emerald-700",s:"shadow-emerald-500/20",i:CheckCircle2},
          {l:"Tentative",v:(bookings ?? []).filter(b=>b?.status==="tentative").length,c:"from-slate-400 to-slate-600",s:"shadow-slate-400/20",i:Clock},
          {l:"Cancelled",v:(bookings ?? []).filter(b=>b?.status==="cancelled").length,c:"from-rose-500 to-rose-700",s:"shadow-rose-500/20",i:Trash2},
          {l:"3rd Party Profit",v:`₨ ${(tp ?? 0).toLocaleString()}`,c:"from-indigo-500 to-indigo-700",s:"shadow-indigo-500/20",i:TrendingUp},
          {l:"Outstanding",v:`₨ ${(bookings ?? []).reduce((s,b)=>s+(b?.balanceRemaining ?? 0),0).toLocaleString()}`,c:"from-amber-500 to-amber-700",s:"shadow-amber-500/20",i:Wallet}
        ].map((c, idx)=>(
          <div key={c.l} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${c.c} p-5 text-white shadow-xl ${c.s} transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl animate-in fade-in zoom-in duration-500 delay-${idx * 50}`}>
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                <c.i className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">{c.l}</p>
                <p className="text-xl font-black truncate mt-0.5 tracking-tight">{c.v}</p>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform duration-500 group-hover:scale-125">
              <c.i size={80} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-8 flex-wrap h-auto gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
          {["list", "calendar", "menu", "kitchen", "thirdparty", "suppliers"].map(tab => (
            <TabsTrigger 
              key={tab}
              value={tab} 
              className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all"
            >
              {tab === 'list' ? 'All Bookings' : tab === 'thirdparty' ? 'Third-Party' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="list" className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input 
                placeholder="Search bookings, clients or venues..." 
                className="pl-12 h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 font-bold transition-all" 
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={s => { setStatusFilter(s); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-56 h-12 rounded-xl border-slate-200 bg-white font-black text-[11px] uppercase tracking-widest shadow-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                  <SelectItem value="all" className="rounded-lg font-bold">All Status</SelectItem>
                  <SelectItem value="confirmed" className="rounded-lg font-bold text-emerald-600">Confirmed</SelectItem>
                  <SelectItem value="tentative" className="rounded-lg font-bold text-slate-500">Tentative</SelectItem>
                  <SelectItem value="postponed" className="rounded-lg font-bold text-amber-600">Postponed</SelectItem>
                  <SelectItem value="cancelled" className="rounded-lg font-bold text-rose-600">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-12 rounded-xl border-slate-200 font-black px-6 gap-2 hover:bg-slate-50 transition-all shadow-sm">
                <Filter className="h-4 w-4 text-slate-500" /> FILTER
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Event Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule & Venue</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">PAX</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financials</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                      {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-8 py-10"><div className="h-14 w-full animate-pulse rounded-2xl bg-slate-50" /></td></tr>
                    ))
                  ) : (paginatedBookings ?? []).length > 0 ? (
                    (paginatedBookings ?? []).map((b, idx) => (
                      <tr key={b?.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50 transition-colors group`}>
                        <td className="px-8 py-6">
                          <button onClick={() => b?.clientName && b?.phone && openClientProfile(b.clientName, b.phone)} className="text-left group/client">
                            <p className="text-base font-black text-[#0f172a] leading-none group-hover/client:text-blue-600 transition-colors">{b?.clientName}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{b?.phone}</p>
                          </button>
                        </td>
                        <td className="px-8 py-6">
                          <Badge variant="outline" className="rounded-lg font-black text-[9px] uppercase tracking-widest bg-white border-slate-200 text-slate-600 px-2.5 py-1 shadow-sm">
                            {b?.eventType}
                          </Badge>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 tracking-tight">{b?.eventDate ? format(new Date(b.eventDate), 'MMM dd, yyyy') : "N/A"}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{b?.venue}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="inline-flex items-center justify-center h-9 w-14 rounded-xl bg-slate-50 font-black text-[11px] text-slate-600 border border-slate-200/50 shadow-sm">
                            {b?.guests ?? 0}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <p className="text-sm font-black text-blue-600 tracking-tight">₨ {(b?.totalAmount ?? 0).toLocaleString()}</p>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter mt-1">{(b?.balanceRemaining ?? 0) > 0 ? `Due: ₨ ${(b?.balanceRemaining ?? 0).toLocaleString()}` : 'FULLY PAID'}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <Badge className={`${sc(b?.status)} rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-none shadow-md`}>
                            {b?.status}
                          </Badge>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50 hover:text-blue-700 shadow-sm" onClick={() => { setSelected(b); setShowView(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-100/50 hover:text-emerald-700 shadow-sm" onClick={() => { setSelected(b); setShowAdd(true); setNb({...b, guests: (b?.guests ?? 0).toString(), totalAmount: (b?.totalAmount ?? 0).toString(), advance: (b?.advance ?? 0).toString(), supplierCost: (b?.supplierCost ?? 0).toString(), sellingRate: (b?.sellingRate ?? 0).toString()}); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-100/50 hover:text-rose-600 shadow-sm" onClick={() => { if(confirm("Permanently delete this booking record?")) setBookings((bookings ?? []).filter(bk => bk?.id !== b?.id)); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <CalendarDays className="h-8 w-8 text-slate-200" />
                          </div>
                          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No matching bookings found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length} results
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="rounded-xl border-slate-200 bg-white font-black h-10 px-6 disabled:opacity-40 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                  >
                    PREVIOUS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="rounded-xl border-slate-200 bg-white font-black h-10 px-6 disabled:opacity-40 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                  >
                    NEXT
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4 bg-muted/50 p-1 rounded-xl border border-border/50">
                <button onClick={()=>setCalMonth(subMonths(calMonth,1))} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"><ChevronLeft className="h-5 w-5"/></button>
                <h3 className="text-lg font-black text-foreground min-w-[160px] text-center tracking-tight">{format(calMonth, calView === 'month' ? "MMMM yyyy" : "MMM d, yyyy")}</h3>
                <button onClick={()=>setCalMonth(addMonths(calMonth,1))} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"><ChevronRight className="h-5 w-5"/></button>
              </div>

              <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
                {(["day", "week", "month"] as const).map(v => (
                  <button key={v} onClick={() => setCalView(v)} className={`px-5 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${calView === v ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
                ))}
              </div>
            </div>

            {calView === "month" && (
              <div className="grid grid-cols-7 gap-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="py-3 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{d}</div>)}
                {Array.from({length:startDow}).map((_,i)=><div key={`e${i}`} className="bg-muted/5 rounded-xl border border-dashed border-border/20"/>)}
                {days.map(day=>{
                  const db = getDayB(day);
                  const isToday = isSameDay(day, new Date());
                  return <div key={day.toISOString()} className={`min-h-[120px] rounded-xl border p-2 transition-all ${isToday ? "border-primary bg-primary/5 shadow-sm" : db.length>0?"border-blue-100 bg-blue-50/30":"border-border/50 hover:bg-muted/30"}`}>
                    <div className={`mb-2 text-xs font-black ${isToday ? "text-primary" : "text-muted-foreground"}`}>{format(day,"d")}</div>
                    <div className="space-y-1">
                      {(db ?? []).map((b,i)=>(
                        <div key={i} className="truncate rounded-lg px-2 py-1.5 text-[9px] font-black border shadow-sm cursor-pointer hover:brightness-95 transition-all uppercase tracking-tighter" onClick={() => { setSelected((bookings ?? []).find(x => x?.clientName === b?.name) || null); setShowView(true); }}
                          style={{
                            backgroundColor: b?.status === "confirmed" ? "#dcfce7" : b?.status === "tentative" ? "#fef9c3" : b?.status === "cancelled" ? "#fee2e2" : "#ffedd5",
                            color: b?.status === "confirmed" ? "#166534" : b?.status === "tentative" ? "#854f0b" : b?.status === "cancelled" ? "#991b1b" : "#9a3412",
                            borderColor: b?.status === "confirmed" ? "#bbf7d0" : b?.status === "tentative" ? "#fef08a" : b?.status === "cancelled" ? "#fecaca" : "#fed7aa"
                          }}>
                          {b?.name}
                        </div>
                      ))}
                    </div>
                  </div>;
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingMenus ? (
              Array(2).fill(0).map((_, i) => <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-muted" />)
            ) : (
              (menus ?? []).filter(m=>m?.name!=="Custom").map(menu=>(
                <div key={menu?.id} className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                  <div className="flex items-center justify-between border-b border-border p-6 bg-muted/5">
                    <div>
                      <h3 className="text-lg font-black text-foreground tracking-tight">{menu?.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{(menu?.items ?? []).length} Production Items</p>
                    </div>
                    {canDo("add") && menu?.id && (
                      <Button variant="outline" size="sm" onClick={() => handleAddClick(menu.id)} className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 h-9">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                      <thead>
                        <tr className="bg-muted/20 text-left">
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Item Name</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unit</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rate</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(menu?.items ?? []).map((item,idx)=>(
                          <tr key={item?.id || idx} className="hover:bg-muted/10 transition-colors group">
                            <td className="px-6 py-4 text-sm font-bold text-foreground">{item?.item}</td>
                            <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">{item?.unit}</td>
                            <td className="px-6 py-4 text-sm font-black text-primary">₨ {item?.rate}</td>
                            <td className="px-6 py-4 text-right">
                              {canDo("edit") && menu?.id && (
                                <button onClick={() => handleEditClick(item, menu.id)} className="rounded-lg p-2 hover:bg-emerald-50 text-emerald-600 transition-colors opacity-0 group-hover:opacity-100">
                                  <Edit className="h-4 w-4"/>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="kitchen" className="space-y-6">
          <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight">Kitchen Production Hub</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Real-time inventory mapping and consumption tracking</p>
                </div>
                <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-border shadow-sm hover:bg-muted" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2"/> Export Production Sheet
                </Button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end p-8 bg-muted/5 rounded-2xl border border-border">
                <div className="flex-1 w-full space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Event Selection</Label>
                  <Select onValueChange={v=>{const b=bookings.find(x=>x.id===Number(v));setSelected(b||null); if(b) fetchKitchenData(b.id);}}>
                    <SelectTrigger className="w-full h-14 rounded-xl border-border bg-white font-black text-lg shadow-sm">
                      <SelectValue placeholder="Select an upcoming event schedule..."/>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border shadow-2xl p-2">
                      {(bookings ?? []).filter(b=>b?.status!=="cancelled").map(b=><SelectItem key={b?.id} value={String(b?.id)} className="py-3 rounded-xl font-bold">{b?.clientName} — {b?.eventDate ? format(new Date(b.eventDate), 'MMMM dd, yyyy') : "N/A"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selected && (
                  <div className="flex gap-3 w-full lg:w-auto">
                    <Button className="h-14 px-8 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/20 flex-1 lg:flex-none" onClick={handleSaveKitchen} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <Save className="h-5 w-5 mr-2"/>}
                      Commit Changes
                    </Button>
                    <Button variant="outline" className="h-14 px-8 rounded-xl border-border bg-white font-black shadow-sm flex-1 lg:flex-none" onClick={() => setShowConsumptionModal(true)}>
                      <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-500"/> Track Usage
                    </Button>
                  </div>
                )}
              </div>

              {selected ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 mb-1">Host Identity</p>
                      <p className="text-xl font-black text-blue-900 leading-tight">{selected.clientName}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 mb-1">Production Date</p>
                      <p className="text-xl font-black text-emerald-900 leading-tight">{format(new Date(selected.eventDate), 'MMMM d, yyyy')}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-1">Guest Capacity</p>
                      <p className="text-xl font-black text-amber-900 leading-tight">{selected.guests} PAX SCHEDULED</p>
                    </div>
                  </div>
                  
                  <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="bg-muted/30 text-left border-b border-border">
                          <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Menu Component</th>
                          <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Measurement</th>
                          <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Standard Yield</th>
                          <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Kitchen Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {kitchenItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                            <td className="px-8 py-5 text-sm font-black text-foreground">{item.item_name}</td>
                            <td className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.unit}</td>
                            <td className="px-8 py-5 text-center">
                              <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-muted font-black text-xs text-muted-foreground">
                                {item.estimated_qty} Units
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex justify-end">
                                <Input type="number" className="w-32 h-11 rounded-xl border-border text-right font-black focus:ring-primary/20" value={item.actual_qty} onChange={e => {
                                    const val = Number(e.target.value);
                                    setKitchenItems(prev => prev.map((ki, i) => i === idx ? { ...ki, actual_qty: val, is_adjusted: val !== ki.estimated_qty } : ki));
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="ghost" className="text-primary font-black uppercase tracking-widest text-[11px] hover:bg-primary/5 gap-2" onClick={() => setShowRawMaterialsModal(true)}>
                      <TrendingUp className="h-4 w-4"/> Analyze Raw Material Efficiency
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-32 text-center border-2 border-dashed border-border rounded-3xl bg-muted/5">
                  <UtensilsCrossed className="h-16 w-16 text-muted-foreground/10 mx-auto mb-6" />
                  <p className="text-xl font-black text-muted-foreground tracking-tight">Ready for production schedule</p>
                  <p className="text-sm text-muted-foreground/60 mt-2 font-medium max-w-xs mx-auto">Please select an active event booking from the control panel above to begin kitchen mapping.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="thirdparty" className="space-y-6">
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-foreground tracking-tight">Market Sourcing Intelligence</h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">Vendor cost analysis and dynamic profit margin tracking</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-none rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px]">Real-time Sync Active</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-muted/30 text-left border-b border-border">
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sourcing Assignment</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Market Cost</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Client Rate</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Net Yield</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Margin %</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(bookings ?? []).filter(b=>b?.thirdParty).map(b=>{
                    const profit=(b?.sellingRate ?? 0)-(b?.supplierCost ?? 0);
                    const margin=(b?.sellingRate ?? 0)>0?Math.round((profit/(b?.sellingRate ?? 1))*100):0;
                    return(
                      <tr key={b?.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-foreground">{b?.clientName}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">{b?.eventDate ? format(new Date(b.eventDate), 'MMMM dd, yyyy') : "N/A"}</p>
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-rose-500">₨ {(b?.supplierCost ?? 0).toLocaleString()}</td>
                        <td className="px-8 py-6 text-sm font-black text-foreground">₨ {(b?.sellingRate ?? 0).toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex px-4 py-1.5 rounded-xl font-black text-xs shadow-sm ${profit>=0?"bg-emerald-50 text-emerald-700 border border-emerald-100":"bg-rose-50 text-rose-700 border border-rose-100"}`}>
                            ₨ {(profit ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-black text-emerald-600">{margin}% Margin</span>
                            <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, margin)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <Badge variant="outline" className="rounded-xl bg-muted/50 text-muted-foreground border-border text-[9px] font-black uppercase tracking-widest px-3 py-1">Verified</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/40 border-t-2 border-border">
                  <tr>
                    <td className="px-8 py-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Consolidated Portfolio Performance</td>
                    <td className="px-8 py-8 text-sm font-black text-rose-600">₨ {(bookings ?? []).filter(b=>b?.thirdParty).reduce((s,b)=>s+(b?.supplierCost ?? 0),0).toLocaleString()}</td>
                    <td className="px-8 py-8 text-sm font-black text-foreground">₨ {(bookings ?? []).filter(b=>b?.thirdParty).reduce((s,b)=>s+(b?.sellingRate ?? 0),0).toLocaleString()}</td>
                    <td className="px-8 py-8 text-center">
                      <div className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-black shadow-xl shadow-emerald-500/20 text-lg">
                        ₨ {(tp ?? 0).toLocaleString()}
                      </div>
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowAddSupplierModal(true)} className="bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 h-12 px-8 gap-2">
              <Plus className="h-5 w-5" /> Onboard New Vendor
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {(suppliers ?? []).map(s => (
              <div key={s?.id} className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center justify-between border-b border-border p-8 bg-muted/5">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/20">
                      {(s?.name ?? "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-foreground tracking-tight">{s?.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">{s?.service_type} • {s?.contact_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Net Payable</p>
                    <p className="text-2xl font-black text-rose-500">₨ {(s?.current_balance ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <History className="h-4 w-4 text-primary"/> Sourcing Ledger
                    </h4>
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
                      {(supplierPayments ?? []).filter(p => p?.supplier_id === s?.id).map(p => (
                        <div key={p?.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/50 transition-all hover:bg-white hover:shadow-sm">
                          <span className="text-[10px] font-black text-muted-foreground uppercase">{p?.date ? format(new Date(p.date), 'MMM d, yyyy') : "N/A"}</span>
                          <span className="text-xs font-black text-foreground">₨ {(p?.amount ?? 0).toLocaleString()} <span className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">[{p?.method}]</span></span>
                        </div>
                      ))}
                      {(supplierPayments ?? []).filter(p => p?.supplier_id === s?.id).length === 0 && (
                        <div className="py-12 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic border-2 border-dashed border-border/50 rounded-2xl">
                          Zero transaction history
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="p-6 rounded-2xl bg-muted/20 border border-border/50 space-y-4 shadow-inner">
                      <div className="flex justify-between text-[11px] font-black">
                        <span className="text-muted-foreground uppercase tracking-widest">Opening Bal:</span>
                        <span className="text-foreground">₨ {(s?.opening_balance ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="h-[1px] bg-border/50 w-full" />
                      <div className="flex justify-between text-[11px] font-black">
                        <span className="text-muted-foreground uppercase tracking-widest text-emerald-600">Total Settled:</span>
                        <span className="text-emerald-600">₨ {((s?.opening_balance ?? 0) - (s?.current_balance ?? 0)).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button className="mt-6 w-full h-12 rounded-xl bg-white border border-border text-foreground font-black hover:bg-muted shadow-sm uppercase tracking-widest text-[11px] gap-2" onClick={() => { setSelectedSupplier(s); setSupplierPaymentForm({ ...supplierPaymentForm, amount: 0 }); setShowSupplierPaymentModal(true); }}>
                      <Wallet className="h-4 w-4 text-primary"/> Disburse Payment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD MODAL */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Create New Event Booking</DialogTitle><DialogDescription className="font-medium">Enter client requirements and scheduling details below.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Client Full Identity *</Label><Input placeholder="e.g. Ahmed & Sara Wedding" className="h-12 rounded-xl font-bold" value={nb.clientName} onChange={e=>setNb({...nb,clientName:e.target.value})}/></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Phone Contact</Label><Input placeholder="0300-0000000" className="h-12 rounded-xl font-bold" value={nb.phone} onChange={e=>setNb({...nb,phone:e.target.value})}/></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Event Category</Label><Select value={nb.eventType} onValueChange={v=>setNb({...nb,eventType:v})}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue placeholder="Select Category"/></SelectTrigger><SelectContent className="rounded-xl">{EVENT_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Scheduled Event Date *</Label><Input type="date" className="h-12 rounded-xl font-bold" value={nb.eventDate} onChange={e=>setNb({...nb,eventDate:e.target.value})}/></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Official Booking Date</Label><Input type="date" className="h-12 rounded-xl font-bold" value={nb.bookingDate} onChange={e=>setNb({...nb,bookingDate:e.target.value})}/></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Target Venue</Label><Select value={nb.venue} onValueChange={v=>setNb({...nb,venue:v})}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue placeholder="Select Venue"/></SelectTrigger><SelectContent className="rounded-xl">{VENUES.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Anticipated Guests</Label><Input type="number" placeholder="300" className="h-12 rounded-xl font-bold" value={nb.guests} onChange={e=>setNb({...nb,guests:e.target.value})}/></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Contract Total (₨)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={nb.totalAmount} onChange={e=>setNb({...nb,totalAmount:e.target.value})}/></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Advance Commitment (₨)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={nb.advance} onChange={e=>setNb({...nb,advance:e.target.value})}/></div>
            {nb.advance&&nb.totalAmount&&<div className="col-span-2 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-black uppercase tracking-widest text-rose-600 text-center shadow-inner">Remaining Liability: ₨ {(Number(nb.totalAmount)-Number(nb.advance)).toLocaleString()}</div>}
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Settlement Method</Label><Select value={nb.paymentMethod} onValueChange={v=>setNb({...nb,paymentMethod:v})}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue/></SelectTrigger><SelectContent className="rounded-xl">{PAYMENT_METHODS.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Booking Lifecycle Status</Label><Select value={nb.status} onValueChange={v=>setNb({...nb,status:v as BookingStatus})}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue/></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="tentative">Tentative</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="postponed">Postponed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div className="col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Catering Configuration</Label><Select value={nb.menu} onValueChange={v=>setNb({...nb,menu:v})}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue/></SelectTrigger><SelectContent className="rounded-xl">{menus.map(m=><SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select></div>
            
            <div className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50"><input type="checkbox" id="tp" checked={nb.thirdParty} onChange={e=>setNb({...nb,thirdParty:e.target.checked})} className="h-5 w-5 accent-primary cursor-pointer"/><Label htmlFor="tp" className="text-sm font-black cursor-pointer">Activate External Vendor Sourcing (Third-Party)</Label></div>
            
            {nb.thirdParty&&<>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Market Cost Basis (₨)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={nb.supplierCost} onChange={e=>setNb({...nb,supplierCost:e.target.value})}/></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Arbitrage Selling Rate (₨)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={nb.sellingRate} onChange={e=>setNb({...nb,sellingRate:e.target.value})}/></div>
              {nb.supplierCost&&nb.sellingRate&&<div className="col-span-2 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-black uppercase tracking-widest text-emerald-700 text-center shadow-inner">Anticipated Profit: ₨ {(Number(nb.sellingRate)-Number(nb.supplierCost)).toLocaleString()}</div>}
            </>}
            <div className="col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Logistics & Operational Notes</Label><Input placeholder="Specific table layouts, flower choices, or VIP requirements..." className="h-12 rounded-xl font-bold" value={nb.notes} onChange={e=>setNb({...nb,notes:e.target.value})}/></div>
            
            {availabilityWarning && (
              <div className="col-span-2 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex flex-col gap-3 shadow-sm">
                <p className="font-black flex items-center gap-2 uppercase tracking-tight text-amber-700"><AlertTriangle className="h-5 w-5"/> Calendar Collision Detected</p>
                <p className="font-medium opacity-80">{availabilityWarning}</p>
                <div className="flex items-center gap-3 mt-2 p-3 bg-white/50 rounded-xl border border-amber-200/50">
                  <input type="checkbox" id="confirm-booking" checked={proceedWithBooking} onChange={e => setProceedWithBooking(e.target.checked)} className="h-5 w-5 accent-amber-600 cursor-pointer" />
                  <Label htmlFor="confirm-booking" className="text-amber-800 font-black text-xs uppercase tracking-widest cursor-pointer">Acknowledge Collision & Force Booking</Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3"><Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-[11px]" onClick={()=>{setShowAdd(false); setAvailabilityWarning(null); setProceedWithBooking(false);}}>Discard</Button><Button className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/20 uppercase tracking-widest text-[11px]" onClick={handleAdd}>{proceedWithBooking ? "Force Save Record" : "Confirm Booking"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW MODAL */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Booking Summary</DialogTitle></DialogHeader>
          {selected&&<div className="space-y-3 py-4">{[{l:"Client",v:selected.clientName},{l:"Phone",v:selected.phone},{l:"Event Type",v:selected.eventType},{l:"Event Date",v:selected.eventDate},{l:"Booking Date",v:selected.bookingDate},{l:"Venue",v:selected.venue},{l:"Guests",v:selected.guests},{l:"Menu",v:selected.menu},{l:"Payment Method",v:selected.paymentMethod},{l:"Total Amount",v:`₨ ${selected.totalAmount.toLocaleString()}`},{l:"Advance Paid",v:`₨ ${selected.advance.toLocaleString()}`},{l:"Balance Remaining",v:`₨ ${selected.balanceRemaining.toLocaleString()}`},{l:"Status",v:selected.status},{l:"Third-Party",v:selected.thirdParty?`Yes (Profit: ₨ ${(selected.sellingRate-selected.supplierCost).toLocaleString()})`:"No"},{l:"Notes",v:selected.notes||"-"}].map(row=><div key={row.l} className="flex justify-between border-b border-border/50 pb-2.5 text-sm last:border-0"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{row.l}</span><span className="font-black text-foreground text-right">{String(row.v)}</span></div>)}</div>}
        </DialogContent>
      </Dialog>

      {/* KITCHEN MODAL */}
      <Dialog open={showKitchen} onOpenChange={setShowKitchen}>
        <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Production Blueprint</DialogTitle></DialogHeader>
          {selected&&<div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-muted/40 p-4 text-[10px] font-black uppercase tracking-widest">
              <div><p className="text-muted-foreground mb-1">Date</p><p className="text-foreground">{selected.eventDate}</p></div>
              <div><p className="text-muted-foreground mb-1">Yield</p><p className="text-foreground">{selected.guests} PAX</p></div>
              <div><p className="text-muted-foreground mb-1">Plan</p><p className="text-foreground">{selected.menu}</p></div>
            </div>
            <div className="space-y-2">
              {(menus.find(m=>m.name===selected.menu)?.items||[]).map((item,idx)=><div key={idx} className="flex justify-between items-center border-b border-border/50 py-3 last:border-0"><span className="text-sm font-black text-foreground">{item.item}</span><span className="text-xs font-bold text-muted-foreground">{selected.guests} × ₨{item.rate} = <strong className="text-foreground ml-1">₨ {(selected.guests*item.rate).toLocaleString()}</strong></span></div>)}
            </div>
            <div className="flex justify-between border-t-2 border-border pt-4 text-sm font-black uppercase tracking-[0.2em]"><span>Aggregate Production Cost</span><span className="text-primary text-lg">₨ {(menus.find(m=>m.name===selected.menu)?.items.reduce((s,i)=>s+selected.guests*i.rate,0)||0).toLocaleString()}</span></div>
          </div>}
        </DialogContent>
      </Dialog>

      {/* MENU ITEM MODAL */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black tracking-tight">{editingItem ? "Update Production Item" : "New Production Item"}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Item Nomenclature</Label><Input className="h-12 rounded-xl font-bold" placeholder="e.g. Traditional Beef Biryani" value={itemForm.item} onChange={e => setItemForm({ ...itemForm, item: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">UoM</Label><Input className="h-12 rounded-xl font-bold" placeholder="e.g. per plate" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Unit Yield Rate (₨)</Label><Input className="h-12 rounded-xl font-bold" type="number" value={itemForm.rate} onChange={e => setItemForm({ ...itemForm, rate: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-[11px]" onClick={() => setShowItemModal(false)}>Cancel</Button><Button className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/20 uppercase tracking-widest text-[11px]" onClick={handleSaveItem} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RAW MATERIALS MODAL */}
      <Dialog open={showRawMaterialsModal} onOpenChange={setShowRawMaterialsModal}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Raw Material Inventory Mapping</DialogTitle><DialogDescription className="font-medium">Algorithmically derived requirements for {selected?.guests} pax.</DialogDescription></DialogHeader>
          <div className="py-4" ref={printRef}>
            <div className="hidden print:block mb-6">
              <h2 className="text-2xl font-black">Production Inventory Sheet</h2>
              <p className="text-sm font-bold text-muted-foreground mt-1">Assignment: {selected?.clientName} | Scheduled: {selected?.eventDate}</p>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Inventory Component</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">UoM</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Calculated Need</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rawMaterials.map((rm, idx) => (
                    <tr key={idx} className="hover:bg-muted/5">
                      <td className="px-6 py-4 text-sm font-black text-foreground">{rm.material_name}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">{rm.unit}</td>
                      <td className="px-6 py-4 text-sm font-black text-primary">{rm.estimated_qty.toFixed(2)} {rm.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="print:hidden"><Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[11px] gap-2 border-border" onClick={handlePrint}><Printer className="h-4 w-4"/> Generate PDF</Button><Button className="rounded-xl font-black uppercase tracking-widest text-[11px] bg-primary text-white" onClick={() => setShowRawMaterialsModal(false)}>Close Ledger</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONSUMPTION TRACKING MODAL */}
      <Dialog open={showConsumptionModal} onOpenChange={setShowConsumptionModal}>
        <DialogContent className="max-w-3xl rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Post-Production Consumption Audit</DialogTitle><DialogDescription className="font-medium">Variance analysis between estimated yield and actual inventory usage.</DialogDescription></DialogHeader>
          <div className="py-4 overflow-y-auto max-h-[60vh]">
            <div className="rounded-2xl border border-border overflow-hidden bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Component</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plan</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actual</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rawMaterials.map((rm, idx) => {
                    const diff = rm.actual_qty - rm.estimated_qty;
                    return (
                      <tr key={idx} className="hover:bg-muted/5 transition-colors group">
                        <td className="px-6 py-4 text-sm font-black text-foreground">{rm.material_name}</td>
                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{rm.estimated_qty.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <Input type="number" className="w-28 h-9 rounded-lg border-border font-black text-right" value={rm.actual_qty} onChange={e => {
                              const val = Number(e.target.value);
                              setRawMaterials(prev => prev.map((item, i) => i === idx ? { ...item, actual_qty: val } : item));
                            }}
                          />
                        </td>
                        <td className={`px-6 py-4 text-xs font-black ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {diff > 0 ? '↑' : diff < 0 ? '↓' : '—'} {Math.abs(diff).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-[11px]" onClick={() => setShowConsumptionModal(false)}>Discard</Button><Button className="h-12 px-8 rounded-xl bg-emerald-500 text-white font-black shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-[11px]" onClick={handleSaveKitchen} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>} Sync Audit Results</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLIENT PROFILE MODAL */}
      <Dialog open={showClientProfile} onOpenChange={setShowClientProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><User className="h-6 w-6"/></div>Client Dossier: {selectedClient?.clientName}</DialogTitle><DialogDescription className="font-medium">Strategic overview of lifetime booking value and financial commitments.</DialogDescription></DialogHeader>
          {selectedClient && (
            <div className="space-y-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm transition-transform hover:scale-[1.02]"><p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Lifetime Settlement</p><p className="text-2xl font-black text-emerald-700">₨ {selectedClient.totalPaid.toLocaleString()}</p></div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm transition-transform hover:scale-[1.02]"><p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest mb-2">Aggregate Liability</p><p className="text-2xl font-black text-rose-700">₨ {selectedClient.remainingBalance.toLocaleString()}</p></div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm transition-transform hover:scale-[1.02]"><p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-2">Booking Frequency</p><p className="text-2xl font-black text-blue-700">{selectedClient.bookings.length} Events</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 ml-1"><History className="h-4 w-4 text-primary"/> Event Engagement History</h4>
                <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Event Detail</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Venue</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Investment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedClient.bookings.map((b, i) => (
                        <tr key={i} className="hover:bg-muted/5 transition-colors">
                          <td className="px-6 py-4"><p className="text-sm font-black text-foreground leading-tight">{b.eventType}</p><p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{format(new Date(b.eventDate), 'MMM d, yyyy')}</p></td>
                          <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{b.venue}</td>
                          <td className="px-6 py-4"><Badge className={`${sc(b.status)} rounded-lg px-2.5 py-1 text-[9px] font-black uppercase border-none`}>{b.status}</Badge></td>
                          <td className="px-6 py-4 text-right font-black text-sm">₨ {b.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button className="rounded-xl font-black uppercase tracking-widest text-[11px] bg-primary text-white" onClick={() => setShowClientProfile(false)}>Dismiss Profile</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUPPLIER PAYMENT MODAL */}
      <Dialog open={showSupplierPaymentModal} onOpenChange={setShowSupplierPaymentModal}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Vendor Settlement</DialogTitle><DialogDescription className="font-medium">Record a financial disbursement to {selectedSupplier?.name}.</DialogDescription></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Disbursement Amount (₨)</Label><Input type="number" className="h-12 rounded-xl font-black text-lg focus:ring-emerald-500/20" value={supplierPaymentForm.amount} onChange={e => setSupplierPaymentForm({ ...supplierPaymentForm, amount: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Payment Protocol</Label><Select value={supplierPaymentForm.method} onValueChange={v => setSupplierPaymentForm({ ...supplierPaymentForm, method: v })}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Execution Date</Label><Input type="date" className="h-12 rounded-xl font-bold" value={supplierPaymentForm.date} onChange={e => setSupplierPaymentForm({ ...supplierPaymentForm, date: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Internal Reference / Notes</Label><Input className="h-12 rounded-xl font-bold" placeholder="Reference invoice or check number..." value={supplierPaymentForm.notes} onChange={e => setSupplierPaymentForm({ ...supplierPaymentForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-3"><Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-[11px]" onClick={() => setShowSupplierPaymentModal(false)}>Cancel</Button><Button className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/20 uppercase tracking-widest text-[11px]" onClick={handleSupplierPayment} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Finalize Disbursal</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(EventBooking);
