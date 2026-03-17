import { useState, useEffect } from "react";
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, UtensilsCrossed, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface MenuItem { id?: number | string; item: string; unit: string; rate: number; menu_id?: number | string; }
interface Menu { id: number | string; name: string; items: MenuItem[]; }

const INITIAL_MENUS: Menu[] = [
  { id: 1, name:"Menu A - Desi", items:[{id:1, item:"Biryani",unit:"per plate",rate:250},{id:2, item:"Nihari",unit:"per plate",rate:280},{id:3, item:"Naan",unit:"per piece",rate:30},{id:4, item:"Raita",unit:"per portion",rate:40},{id:5, item:"Dessert",unit:"per plate",rate:80}] },
  { id: 2, name:"Menu B - Continental", items:[{id:6, item:"Grilled Chicken",unit:"per plate",rate:450},{id:7, item:"Pasta",unit:"per plate",rate:350},{id:8, item:"Garlic Bread",unit:"per piece",rate:60},{id:9, item:"Soup",unit:"per bowl",rate:120},{id:10, item:"Ice Cream",unit:"per scoop",rate:100}] },
  { id: 3, name:"Custom", items:[] },
];

const EVENT_TYPES = ["Wedding","Corporate","Birthday","Mehndi","Engagement","Conference","Other"];
const VENUES = ["Main Hall","Banquet Hall","Garden","Lawn Area","Conference Room","Rooftop"];
const PAYMENT_METHODS = ["Cash","Bank Transfer","Cheque","Online"];

const sc = (s: BookingStatus) => s==="confirmed"?"bg-success/10 text-success border-success/20":s==="tentative"?"bg-warning/10 text-warning border-warning/20":s==="postponed"?"bg-secondary/10 text-secondary border-secondary/20":"bg-destructive/10 text-destructive border-destructive/20";
const sd = (s: BookingStatus) => s==="confirmed"?"bg-success":s==="tentative"?"bg-warning":s==="postponed"?"bg-secondary":"bg-destructive";

const EMPTY = { clientName:"",phone:"",eventType:"",eventDate:"",bookingDate:new Date().toISOString().split("T")[0],venue:"",guests:"",totalAmount:"",advance:"",paymentMethod:"Cash",status:"tentative" as BookingStatus,menu:"Menu A - Desi",notes:"",thirdParty:false,supplierCost:"",sellingRate:"" };

const EventBooking = () => {
  const [menus, setMenus] = useState<Menu[]>(INITIAL_MENUS);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | string | null>(null);
  const [itemForm, setItemForm] = useState<MenuItem>({ item: "", unit: "per plate", rate: 0 });
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    fetchMenus();
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

  const handleAdd = () => {
    if (!nb.clientName || !nb.eventDate) return;
    const total = Number(nb.totalAmount), adv = Number(nb.advance);
    setBookings([...bookings,{id:bookings.length+1,...nb,guests:Number(nb.guests),totalAmount:total,advance:adv,balanceRemaining:total-adv,supplierCost:Number(nb.supplierCost),sellingRate:Number(nb.sellingRate)}]);
    setNb(EMPTY); setShowAdd(false);
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
                      <td className="px-3 py-3 text-sm font-medium text-card-foreground whitespace-nowrap">{b.clientName}</td>
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
            <div className="mb-3 flex items-center justify-between">
              <button onClick={()=>setCalMonth(subMonths(calMonth,1))} className="rounded p-1 hover:bg-muted"><ChevronLeft className="h-5 w-5"/></button>
              <h3 className="text-base font-semibold text-card-foreground">{format(calMonth,"MMMM yyyy")}</h3>
              <button onClick={()=>setCalMonth(addMonths(calMonth,1))} className="rounded p-1 hover:bg-muted"><ChevronRight className="h-5 w-5"/></button>
            </div>
            <div className="mb-3 flex flex-wrap gap-3 text-xs">
              {[{l:"Confirmed",c:"bg-success"},{l:"Tentative",c:"bg-warning"},{l:"Postponed",c:"bg-secondary"},{l:"Cancelled",c:"bg-destructive"}].map(l=>(
                <span key={l.l} className="flex items-center gap-1 text-muted-foreground"><span className={`h-2 w-2 rounded-full ${l.c}`}/>{l.l}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
              {Array.from({length:startDow}).map((_,i)=><div key={`e${i}`}/>)}
              {days.map(day=>{
                const db = getDayB(day);
                return <div key={day.toISOString()} className={`min-h-14 rounded-lg border p-1 text-xs ${db.length>0?"border-primary/30 bg-primary/5":"border-border hover:bg-muted/30"}`}>
                  <div className="mb-1 font-medium text-card-foreground">{format(day,"d")}</div>
                  {db.slice(0,2).map((b,i)=><div key={i} className="mb-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium" style={{background:b.status==="confirmed"?"#eaf3de":b.status==="tentative"?"#faeeda":"#fcebeb",color:b.status==="confirmed"?"#3b6d11":b.status==="tentative"?"#854f0b":"#a32d2d"}}>{b.name}</div>)}
                  {db.length>2&&<div className="text-[10px] text-muted-foreground">+{db.length-2} more</div>}
                </div>;
              })}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border pt-4">
              {(["confirmed","tentative","postponed","cancelled"] as BookingStatus[]).map(s=>(
                <div key={s} className="text-center"><p className="text-xs text-muted-foreground capitalize">{s}</p><p className={`text-lg font-bold ${s==="confirmed"?"text-success":s==="tentative"?"text-warning":s==="postponed"?"text-secondary":"text-destructive"}`}>{bookings.filter(b=>b.status===s&&b.eventDate.startsWith(format(calMonth,"yyyy-MM"))).length}</p></div>
              ))}
            </div>
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
                    <Button variant="outline" size="sm" onClick={() => handleAddClick(menu.id)}>+ Add Item</Button>
                  </div>
                  <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-border bg-muted/40"><th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Item</th><th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Unit</th><th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Rate (₨)</th><th className="px-4 py-2 text-xs text-muted-foreground text-center">Edit</th></tr></thead>
                    <tbody>{menu.items.map((item,idx)=><tr key={item.id || idx} className="border-b border-border last:border-0"><td className="px-4 py-2 text-sm font-medium text-card-foreground">{item.item}</td><td className="px-4 py-2 text-sm text-muted-foreground">{item.unit}</td><td className="px-4 py-2 text-sm">₨ {item.rate}</td><td className="px-4 py-2 text-center"><button onClick={() => handleEditClick(item, menu.id)} className="rounded p-1 hover:bg-muted"><Edit className="h-3.5 w-3.5 text-muted-foreground"/></button></td></tr>)}</tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="kitchen">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 font-semibold text-card-foreground">Kitchen Production Sheet</h3>
            <Select onValueChange={v=>{const b=bookings.find(x=>x.id===Number(v));setSelected(b||null);}}>
              <SelectTrigger className="w-72 mb-4"><SelectValue placeholder="Select event..."/></SelectTrigger>
              <SelectContent>{bookings.filter(b=>b.status!=="cancelled").map(b=><SelectItem key={b.id} value={String(b.id)}>{b.clientName} — {b.eventDate}</SelectItem>)}</SelectContent>
            </Select>
            {selected&&(
              <>
                <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Event</p><p className="font-medium">{selected.clientName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{selected.eventDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Guests</p><p className="font-medium">{selected.guests}</p></div>
                </div>
                <table className="w-full min-w-[700px]">
                  <thead><tr className="border-b border-border bg-muted/40">{["Item","Unit","Rate/Unit","Qty","Total Cost"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>{(menus.find(m=>m.name===selected.menu)?.items||[]).map((item,idx)=><tr key={idx} className="border-b border-border last:border-0"><td className="px-4 py-2 text-sm font-medium text-card-foreground">{item.item}</td><td className="px-4 py-2 text-sm text-muted-foreground">{item.unit}</td><td className="px-4 py-2 text-sm">₨ {item.rate}</td><td className="px-4 py-2 text-sm">{selected.guests}</td><td className="px-4 py-2 text-sm font-medium text-primary">₨ {(selected.guests*item.rate).toLocaleString()}</td></tr>)}</tbody>
                  <tfoot><tr className="border-t-2 border-border bg-muted/40"><td colSpan={4} className="px-4 py-2 text-sm font-semibold">Total Kitchen Cost</td><td className="px-4 py-2 text-sm font-bold text-primary">₨ {(menus.find(m=>m.name===selected.menu)?.items.reduce((s,i)=>s+selected.guests*i.rate,0)||0).toLocaleString()}</td></tr></tfoot>
                </table>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm">Print Kitchen Sheet</Button>
                  <Button variant="outline" size="sm">Raw Material List</Button>
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
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button><Button onClick={handleAdd}>Save Booking</Button></DialogFooter>
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
    </div>
  );
};

export default EventBooking;
