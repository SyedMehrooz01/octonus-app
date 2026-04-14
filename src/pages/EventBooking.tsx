import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, UtensilsCrossed, Edit, Loader2, Printer, Save, CheckCircle2, User, Wallet, History, CalendarDays, Clock, TrendingUp, Filter, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import * as eventService from "@/services/eventService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import SkeletonLoading from "@/components/SkeletonLoading";

type BookingStatus = "tentative" | "confirmed" | "postponed" | "cancelled";
interface Booking { id: string; clientName: string; phone: string; eventType: string; eventDate: string; bookingDate: string; venue: string; guests: number; totalAmount: number; advance: number; balanceRemaining: number; status: BookingStatus; paymentMethod: string; menu: string; notes: string; thirdParty: boolean; supplierCost: number; sellingRate: number; }

const DUMMY_BOOKINGS: Booking[] = [
  { id:"1", clientName:"Tariq & Sana", phone:"0300-1111111", eventType:"Wedding", eventDate:"2024-03-18", bookingDate:"2024-03-01", venue:"Main Hall", guests:500, totalAmount:350000, advance:150000, balanceRemaining:200000, status:"confirmed", paymentMethod:"Bank", menu:"Menu A - Desi", notes:"VIP tables required", thirdParty:false, supplierCost:0, sellingRate:0 },
  { id:"2", clientName:"Ali Corp Dinner", phone:"0301-2222222", eventType:"Corporate", eventDate:"2024-03-20", bookingDate:"2024-03-03", venue:"Banquet Hall", guests:200, totalAmount:180000, advance:100000, balanceRemaining:80000, status:"confirmed", paymentMethod:"Cheque", menu:"Menu B - Continental", notes:"", thirdParty:true, supplierCost:120000, sellingRate:180000 },
];

interface MenuItem { id?: number | string; item: string; unit: string; rate: number; menu_id?: number | string; raw_materials?: RawMaterialRequirement[]; }
interface Menu { id: number | string; name: string; items: MenuItem[]; }

interface RawMaterialRequirement { material: string; unit: string; ratio_per_guest: number; }
interface KitchenItem { id?: string; event_id: string; item_name: string; unit: string; estimated_qty: number; actual_qty: number; is_adjusted: boolean; }
interface RawMaterial { id?: string; event_id: string; material_name: string; unit: string; estimated_qty: number; actual_qty: number; }


interface Supplier { id: string; name: string; contact_number: string; email: string; service_type: string; opening_balance: number; current_balance: number; created_at?: string; }
interface SupplierPayment { id: string; supplier_id: string; payment_date: string; amount: number; payment_method: string; notes?: string; created_by?: string; created_at?: string; }
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
  const [error, setError] = useState<string | null>(null);
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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showKitchen, setShowKitchen] = useState(false);
  const [selected, setSelected] = useState<Booking|null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [nb, setNb] = useState(EMPTY);
  const [dateFilter, setDateFilter] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchMenus = useCallback(async (isMounted = true, retry = true) => {
    if (isMounted) setLoadingMenus(true);
    try {
      const [menusDataRaw, itemsDataRaw] = await Promise.all([
        eventService.getMenus().catch(err => { console.error(err); return []; }),
        eventService.getMenuItems().catch(err => { console.error(err); return []; })
      ]);

      if (!isMounted) return;

      const menusData = menusDataRaw;
      const itemsData = itemsDataRaw ?? [];

      if ((menusData ?? []).length > 0) {
        const formattedMenus = (menusData ?? []).map(m => ({
          ...m,
          items: (itemsData ?? []).filter(i => i?.menu_id === m?.id).map(i => ({
            ...i,
            item: i.name // Mapping 'name' from DB to 'item' used in UI
          })) || []
        }));
        setMenus(formattedMenus);
      } else {
        setMenus(INITIAL_MENUS);
      }
    } catch (error: any) {
      console.error("fetchMenus unexpected error:", error);
      if (retry) {
        setTimeout(() => fetchMenus(isMounted, false), 2000);
        return;
      }
      if (isMounted) {
        // setError(prev => prev || error.message || "Failed to fetch menus.");
        setMenus(INITIAL_MENUS);
      }
    } finally {
      if (isMounted) setLoadingMenus(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async (isMounted = true, retry = true) => {
    try {
      const [sData, pData] = await Promise.all([
        eventService.getSuppliers().catch(err => { console.error(err); return []; }),
        eventService.getSupplierPayments().catch(err => { console.error(err); return []; })
      ]);
      if (isMounted) {
        setSuppliers(sData);
        setSupplierPayments(pData ?? []);
      }
    } catch (err: any) {
      console.error("fetchSuppliers unexpected error:", err);
      if (retry) {
        setTimeout(() => fetchSuppliers(isMounted, false), 2000);
        return;
      }
      if (isMounted) {
        // setError(prev => prev || err.message || "Failed to fetch suppliers.");
        setSuppliers([]);
        setSupplierPayments([]);
      }
    }
  }, []);

  const fetchBookingsData = useCallback(async (isMounted = true, retry = true) => {
    if (isMounted) setLoading(true);
    try {
      const data = await eventService.getBookings();
      if (!isMounted) return;
      
      setBookings((data ?? []).map(b => ({
        id: String(b?.id ?? ""),
        clientName: b?.client_name ?? "Unnamed",
        phone: b?.client_phone ?? "N/A",
        eventType: b?.event_type ?? "Event",
        eventDate: b?.event_date ?? "",
        bookingDate: b?.booking_date ?? b?.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0], 
        venue: b?.venue ?? "N/A",
        guests: Number(b?.pax ?? 0),
        totalAmount: Number(b?.total_amount ?? 0),
        advance: Number(b?.advance_paid ?? 0),
        balanceRemaining: Number(b?.balance_due ?? 0),
        status: b?.status ?? "tentative",
        paymentMethod: "N/A", 
        menu: b?.menu || "N/A", 
        notes: b?.notes || "", 
        thirdParty: false, 
        supplierCost: 0, 
        sellingRate: 0 
      })) ?? []);
    } catch (err: any) {
      console.error("fetchBookingsData unexpected error:", err);
      if (retry) {
        setTimeout(() => fetchBookingsData(isMounted, false), 2000);
        return;
      }
      if (isMounted) {
        // setError(prev => prev || err.message || "Failed to fetch bookings.");
        setBookings([]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);



  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        await Promise.all([
          fetchBookingsData(isMounted), 
          fetchMenus(isMounted), 
          fetchSuppliers(isMounted)
        ]);
      } catch (err: any) {
        if (isMounted) setError(err.message || "An error occurred while loading data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchBookingsData, fetchMenus, fetchSuppliers]);

  const handleAddSupplier = useCallback(async () => {
    if (!supplierForm.name) return;
    setIsSaving(true);
    try {
      await eventService.addSupplier({
        name: supplierForm.name,
        contact_number: supplierForm.contact,
        email: supplierForm.email,
        service_type: supplierForm.category,
        opening_balance: supplierForm.opening_balance,
        current_balance: supplierForm.opening_balance
      });
      toast.success("Supplier added successfully");
      setShowAddSupplierModal(false);
      setSupplierForm({ name: "", contact: "", email: "", category: "Food", opening_balance: 0 });
      fetchSuppliers(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to add supplier");
    } finally {
      setIsSaving(false);
    }
  }, [supplierForm, fetchSuppliers]);

  const handleSupplierPayment = useCallback(async () => {
    if (!selectedSupplier || supplierPaymentForm.amount <= 0) return;
    setIsSaving(true);
    try {
      const payment = {
        supplier_id: selectedSupplier.id,
        amount: supplierPaymentForm.amount,
        payment_method: supplierPaymentForm.method,
        payment_date: supplierPaymentForm.date,
        notes: supplierPaymentForm.notes,
        created_by: user?.name || user?.email
      };

      await eventService.addSupplierPayment(payment);

      await eventService.updateSupplier(selectedSupplier.id, {
        current_balance: (selectedSupplier.current_balance ?? 0) - supplierPaymentForm.amount
      });

      toast.success("Payment recorded successfully");
      setShowSupplierPaymentModal(false);
      fetchSuppliers(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  }, [selectedSupplier, supplierPaymentForm, fetchSuppliers, user]);

  const openClientProfile = useCallback((clientName: string, phone: string) => {
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
  }, [bookings]);

  const handleEditClick = useCallback((item: MenuItem, menuId: number | string) => {
    setEditingItem(item);
    setActiveMenuId(menuId);
    setItemForm({ ...item });
    setShowItemModal(true);
  }, []);

  const handleAddClick = useCallback((menuId: number | string) => {
    setEditingItem(null);
    setActiveMenuId(menuId);
    setItemForm({ item: "", unit: "per plate", rate: 0 });
    setShowItemModal(true);
  }, []);

  const handleSaveItem = useCallback(async () => {
    if (!itemForm.item || itemForm.rate <= 0) {
      toast.error("Please provide item name and a valid rate");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await eventService.updateMenuItem(editingItem.id!, {
          name: itemForm.item,
          unit: itemForm.unit,
          rate: itemForm.rate
        });
        logAction(`Updated menu item: ${itemForm.item}`, "Event Booking");
        toast.success("Item updated successfully");
      } else {
        await eventService.addMenuItem({
          name: itemForm.item,
          unit: itemForm.unit,
          rate: itemForm.rate,
          menu_id: activeMenuId,
          quantity: 1 // Default quantity if required
        });
        logAction(`Added new menu item: ${itemForm.item}`, "Event Booking");
        toast.success("Item added successfully");
      }
      
      setShowItemModal(false);
      fetchMenus(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  }, [itemForm, editingItem, activeMenuId, logAction, fetchMenus]);

  const fetchKitchenData = useCallback(async (eventId: string) => {
    try {
      const [kiData, rmData] = await Promise.all([
        eventService.getKitchenItems(eventId),
        eventService.getRawMaterials(eventId)
      ]);
      
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
      console.error("fetchKitchenData error:", err);
      toast.error("Failed to fetch kitchen data");
    }
  }, [bookings, menus]);

  const handleSaveKitchen = useCallback(async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await eventService.upsertKitchenItems((kitchenItems ?? []).map(item => ({ ...item, event_id: selected.id })));
      await eventService.upsertRawMaterials((rawMaterials ?? []).map(item => ({ ...item, event_id: selected.id })));
      toast.success("Kitchen data saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save kitchen data");
    } finally {
      setIsSaving(false);
    }
  }, [selected, kitchenItems, rawMaterials]);

  const checkAvailability = useCallback(() => {
    if (!nb?.eventDate || !nb?.venue) return true;
    const existing = (bookings ?? []).find(b => b?.eventDate === nb?.eventDate && b?.venue === nb?.venue && b?.status !== 'cancelled');
    if (existing) {
      setAvailabilityWarning(`This venue is already booked on this date for "${existing?.clientName}" (${existing?.eventType})`);
      return false;
    }
    setAvailabilityWarning(null);
    return true;
  }, [nb, bookings]);

  const handleAdd = useCallback(async () => {
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
        client_phone: nb.phone,
        event_type: nb.eventType,
        event_date: nb.eventDate,
        venue: nb.venue,
        pax: Number(nb.guests || 0),
        total_amount: total,
        advance_paid: adv,
        balance_due: total - adv,
        status: nb.status,
        menu: nb.menu,
        notes: nb.notes,
        created_at: nb.bookingDate || new Date().toISOString()
      };

      if ((nb as any).id) {
        await eventService.updateBooking((nb as any).id, bookingData);
        toast.success("Booking updated successfully");
      } else {
        await eventService.addBooking(bookingData);
        toast.success("Booking created successfully");
      }

      await fetchBookingsData(true);
      setNb(EMPTY); 
      setShowAdd(false); 
      setAvailabilityWarning(null); 
      setProceedWithBooking(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save booking");
    } finally {
      setSaving(false);
    }
  }, [nb, proceedWithBooking, checkAvailability, fetchBookingsData]);

  const handleDeleteBooking = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this booking?")) return;
    setSaving(true);
    try {
      await eventService.deleteBooking(id);
      await fetchBookingsData(true);
      toast.success("Booking deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking");
    } finally {
      setSaving(false);
    }
  }, [fetchBookingsData]);

  const handleStatusChange = useCallback(async (id: string, status: BookingStatus) => {
    setSaving(true);
    try {
      await eventService.updateBooking(id, { status });
      await fetchBookingsData(true);
      toast.success(`Booking status updated to ${status}`);
    } catch (err: any) {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }, [fetchBookingsData]);


  const monthStart = startOfMonth(calMonth);
  const days = eachDayOfInterval({start:monthStart,end:endOfMonth(calMonth)});
  const startDow = getDay(monthStart);
  const bookingDates = (bookings ?? []).map(b=>({date:new Date(b?.eventDate ?? ""),status:b?.status,name:b?.clientName}));
  const getDayB = (d:Date) => (bookingDates ?? []).filter(b=>isSameDay(b?.date,d));
  const tp = (bookings ?? []).filter(b=>b?.thirdParty).reduce((s,b)=>s+((b?.sellingRate ?? 0)-(b?.supplierCost ?? 0)),0);

  const filtered = useMemo(() => {
    return (bookings ?? []).filter(b => {
      const ms = (b?.clientName ?? "").toLowerCase().includes((search ?? "").toLowerCase()) || (b?.eventType ?? "").toLowerCase().includes((search ?? "").toLowerCase());
      const mf = statusFilter === "all" || b?.status === statusFilter;
      const md = !dateFilter || (b?.eventDate && b.eventDate === dateFilter);
      return ms && mf && md;
    });
  }, [bookings, search, statusFilter, dateFilter]);

  const totalPages = Math.ceil((filtered ?? []).length / itemsPerPage);
  const paginatedBookings = useMemo(() => (filtered ?? []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage]);

  if (loading && (bookings ?? []).length === 0) {
    return (
      <div className="space-y-8 pb-10 max-w-full overflow-hidden">
        <div className="h-24 w-full bg-white rounded-3xl animate-pulse" />
        <SkeletonLoading type="stats" />
        <div className="bg-white rounded-3xl border border-slate-100 p-6">
          <SkeletonLoading type="table" count={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-full overflow-hidden">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-bold">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchBookingsData(true)} className="ml-auto text-rose-600 hover:bg-rose-100 font-black uppercase text-[10px] tracking-widest">Retry</Button>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight uppercase">Event Booking Hub</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            <Clock className="h-3 w-3" /> Real-time Schedule Sync
          </p>
        </div>
        <Button onClick={()=>setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 gap-2 h-12 px-8 transition-all hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-right duration-500">
          <Plus className="h-5 w-5"/> NEW BOOKING
        </Button>
      </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
              <Input 
                type="date" 
                className="w-full sm:w-44 h-12 rounded-xl border-slate-200 bg-white font-bold shadow-sm" 
                value={dateFilter}
                onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
              />
              <Select value={statusFilter} onValueChange={s => { setStatusFilter(s); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-44 h-12 rounded-xl border-slate-200 bg-white font-black text-[11px] uppercase tracking-widest shadow-sm">
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
              {(search || statusFilter !== "all" || dateFilter) && (
                <Button 
                  variant="ghost" 
                  onClick={() => { setSearch(""); setStatusFilter("all"); setDateFilter(""); setCurrentPage(1); }}
                  className="h-12 rounded-xl text-rose-500 font-black px-4 hover:bg-rose-50 transition-all"
                >
                  RESET
                </Button>
              )}
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
                  {paginatedBookings.length > 0 ? (
                    paginatedBookings.map((b, idx) => (
                      <tr key={b.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50 transition-colors group`}>
                        <td className="px-8 py-6">
                          <button onClick={() => b.clientName && b.phone && openClientProfile(b.clientName, b.phone)} className="text-left group/client">
                            <p className="text-base font-black text-[#0f172a] leading-none group-hover/client:text-blue-600 transition-colors">{b.clientName}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{b.phone}</p>
                          </button>
                        </td>
                        <td className="px-8 py-6">
                          <Badge variant="outline" className="rounded-lg font-black text-[9px] uppercase tracking-widest bg-white border-slate-200 text-slate-600 px-2.5 py-1 shadow-sm">
                            {b.eventType}
                          </Badge>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 tracking-tight">{b.eventDate ? format(new Date(b.eventDate), 'MMM dd, yyyy') : "N/A"}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{b.venue}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="inline-flex items-center justify-center h-9 w-14 rounded-xl bg-slate-50 font-black text-[11px] text-slate-600 border border-slate-200/50 shadow-sm">
                            {b.guests}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <p className="text-sm font-black text-blue-600 tracking-tight">₨ {b.totalAmount.toLocaleString()}</p>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter mt-1">{b.balanceRemaining > 0 ? `Due: ₨ ${b.balanceRemaining.toLocaleString()}` : 'FULLY PAID'}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <Badge className={`${sc(b.status)} rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-none shadow-md`}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50 hover:text-blue-700 shadow-sm" onClick={() => { setSelected(b); setShowView(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-100/50 hover:text-emerald-700 shadow-sm" onClick={() => { setSelected(b); setShowAdd(true); setNb({...b, guests: b.guests.toString(), totalAmount: b.totalAmount.toString(), advance: b.advance.toString(), supplierCost: b.supplierCost.toString(), sellingRate: b.sellingRate.toString()}); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-100/50 hover:text-rose-600 shadow-sm" onClick={() => handleDeleteBooking(b.id)}>
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
                        <div key={i} className="truncate rounded-lg px-2 py-1.5 text-[9px] font-black border shadow-sm cursor-pointer hover:brightness-95 transition-all uppercase tracking-tighter" onClick={() => { setSelected((bookings ?? []).find(x => x.clientName === b.name) || null); setShowView(true); }}

                          style={{
                            backgroundColor: b.status === "confirmed" ? "#dcfce7" : b.status === "tentative" ? "#fef9c3" : b.status === "cancelled" ? "#fee2e2" : "#ffedd5",
                            color: b.status === "confirmed" ? "#166534" : b.status === "tentative" ? "#854f0b" : b.status === "cancelled" ? "#991b1b" : "#9a3412",
                            borderColor: b.status === "confirmed" ? "#bbf7d0" : b.status === "tentative" ? "#fef08a" : b.status === "cancelled" ? "#fecaca" : "#fed7aa"
                          }}>
                          {b.name}
                        </div>
                      ))}
                    </div>
                  </div>;
                })}
              </div>
            )}

            {calView === "week" && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <CalendarDays className="h-12 w-12 text-slate-200" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Week view coming soon</p>
              </div>
            )}
            {calView === "day" && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Clock className="h-12 w-12 text-slate-200" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Day view coming soon</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingMenus ? (
              Array(2).fill(0).map((_, i) => <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-muted" />)
            ) : (
              (menus ?? []).filter(m=>m.name!=="Custom").map(menu=>(
                <div key={menu.id} className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                  <div className="flex items-center justify-between border-b border-border p-6 bg-muted/5">
                    <div>
                      <h3 className="text-lg font-black text-foreground tracking-tight">{menu.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{menu.items.length} Production Items</p>
                    </div>
                    {canDo("add") && (
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
                          <tr key={item.id || idx} className="hover:bg-muted/10 transition-colors group">

                            <td className="px-6 py-4 text-sm font-bold text-foreground">{item.item}</td>
                            <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">{item.unit}</td>
                            <td className="px-6 py-4 text-sm font-black text-primary">₨ {item.rate}</td>
                            <td className="px-6 py-4 text-right">
                              {canDo("edit") && (
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
                <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-border shadow-sm hover:bg-muted" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2"/> Export Production Sheet
                </Button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end p-8 bg-muted/5 rounded-2xl border border-border">
                <div className="flex-1 w-full space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Event Selection</Label>
                  <Select onValueChange={v=>{const b=(bookings ?? []).find(x=>x.id===v);setSelected(b||null); if(b) fetchKitchenData(b.id);}}>
                    <SelectTrigger className="w-full h-14 rounded-xl border-border bg-white font-black text-lg shadow-sm">
                      <SelectValue placeholder="Select an upcoming event schedule..."/>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border shadow-2xl p-2">
                      {(bookings ?? []).filter(b=>b.status!=="cancelled").map(b=><SelectItem key={b.id} value={String(b.id)} className="py-3 rounded-xl font-bold">{b.clientName} — {b.eventDate ? format(new Date(b.eventDate), 'MMMM dd, yyyy') : "N/A"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {selected && (
                  <div className="flex gap-3 w-full lg:w-auto">
                    <Button className="h-14 px-8 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/20 flex-1 lg:flex-none" onClick={() => handleSaveKitchen()} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <Save className="h-5 w-5 mr-2"/>}
                      Commit Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="thirdparty" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-8">
            <h3 className="text-2xl font-black text-[#0f172a] tracking-tight mb-6 uppercase">Third-Party Bookings</h3>
            {bookings.filter(b => b.thirdParty).length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-24">
                <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Package className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No third-party bookings found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Event</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Supplier Cost</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Selling Rate</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bookings.filter(b => b.thirdParty).map(b => (
                      <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-5 font-black text-[#0f172a]">{b.clientName}</td>
                        <td className="px-6 py-5 font-bold text-slate-500">{b.eventType} — {b.eventDate ? format(new Date(b.eventDate), 'MMM dd, yyyy') : "N/A"}</td>
                        <td className="px-6 py-5 text-right font-black text-rose-500">₨ {b.supplierCost.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-black text-blue-600">₨ {b.sellingRate.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-black text-emerald-600">₨ {(b.sellingRate - b.supplierCost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-[#0f172a] tracking-tight uppercase">Suppliers</h3>
              {canDo("add") && (
                <Button onClick={() => setShowAddSupplierModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2 h-11 px-6">
                  <Plus className="h-4 w-4"/> Add Supplier
                </Button>
              )}
            </div>
            {suppliers.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-24">
                <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <User className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No suppliers added yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {suppliers.map(s => (
                  <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 flex flex-col gap-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-black text-[#0f172a] text-base">{s.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.service_type}</p>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[9px] uppercase tracking-widest rounded-lg">
                        Active
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-slate-500">{s.contact_number}</p>
                      <p className="font-bold text-slate-400">{s.email}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</p>
                        <p className="font-black text-rose-500 text-base">₨ {(s.current_balance ?? 0).toLocaleString()}</p>
                      </div>
                      {canDo("edit") && (
                        <Button size="sm" variant="outline" className="rounded-xl font-black text-[10px] h-9 px-4 border-slate-200" onClick={() => { setSelectedSupplier(s); setShowSupplierPaymentModal(true); }}>
                          <Wallet className="h-3.5 w-3.5 mr-1.5"/> Pay
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    );
};

export default memo(EventBooking);