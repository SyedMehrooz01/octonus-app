import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, History, Search, Plus, CalendarDays, Wallet2, Star, Printer } from "lucide-react";
import React, { memo } from "react";
import { format } from "date-fns";

interface HROutsideWorkersProps {
  outsideViewMode: "cards" | "history";
  setOutsideViewMode: (mode: "cards" | "history") => void;
  search: string;
  setSearch: (search: string) => void;
  canDo: (action: string) => boolean;
  setShowAddOutsideModal: (show: boolean) => void;
  setShowAssignEventModal: (show: boolean) => void;
  setShowOutsidePaymentModal: (show: boolean) => void;
  outsideWorkers: any[];
  handlePrintWorkerCard: (worker: any) => void;
  outsideAssignments: any[];
  setOutsideAssignments: (assignments: any[]) => void;
  setOutsidePaymentForm: (form: any) => void;
  outsidePayments: any[];
}

const HROutsideWorkers = memo(({
  outsideViewMode,
  setOutsideViewMode,
  search,
  setSearch,
  canDo,
  setShowAddOutsideModal,
  setShowAssignEventModal,
  setShowOutsidePaymentModal,
  outsideWorkers,
  handlePrintWorkerCard,
  outsideAssignments,
  setOutsideAssignments,
  setOutsidePaymentForm,
  outsidePayments
}: HROutsideWorkersProps) => {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/50">
          <Button 
            variant={outsideViewMode === "cards" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setOutsideViewMode("cards")}
            className={`h-9 px-4 rounded-lg font-bold gap-2 transition-all ${outsideViewMode === "cards" ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="h-4 w-4" /> Workers Directory
          </Button>
          <Button 
            variant={outsideViewMode === "history" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setOutsideViewMode("history")}
            className={`h-9 px-4 rounded-lg font-bold gap-2 transition-all ${outsideViewMode === "history" ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <History className="h-4 w-4" /> Activity & Ledger
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by name or skill..." 
              className="pl-10 h-11 w-full bg-white border-border rounded-xl focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-2">
            {canDo("add") && (
              <Button onClick={() => setShowAddOutsideModal(true)} className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 h-11 px-6 gap-2 flex-1 sm:flex-none">
                <Plus className="h-4 w-4" /> Add Worker
              </Button>
            )}
            {canDo("edit") && (
              <>
                <Button onClick={() => setShowAssignEventModal(true)} variant="outline" className="rounded-xl font-bold border-border h-11 px-6 gap-2 flex-1 sm:flex-none hover:bg-muted">
                  <CalendarDays className="h-4 w-4 text-emerald-500" /> Assign Event
                </Button>
                <Button onClick={() => setShowOutsidePaymentModal(true)} variant="outline" className="rounded-xl font-bold border-border h-11 px-6 gap-2 flex-1 sm:flex-none hover:bg-muted">
                  <Wallet2 className="h-4 w-4 text-blue-500" /> Record Pay
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {outsideViewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(outsideWorkers ?? []).filter(w => 
            (w?.name ?? "").toLowerCase().includes((search ?? "").toLowerCase()) || 
            (w?.skill ?? "").toLowerCase().includes((search ?? "").toLowerCase())
          ).map((worker, idx) => (
            <div key={worker?.id || `worker-${idx}`} className="relative group overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-400 text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
                      {(worker?.name ?? "W")[0].toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-sm ${worker?.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-foreground leading-tight truncate max-w-[150px]">{worker?.name ?? "Unknown"}</h4>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1 truncate max-w-[150px]">{worker?.skill ?? "General Service"}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (worker?.rating ?? 5) ? "text-amber-400 fill-amber-400" : "text-muted/30"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <Badge className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none ${worker?.status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {worker?.status ?? "available"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-3 border-t border-border pt-6 mb-6">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Worker Type</p>
                  <p className="text-sm font-black text-foreground/80">{worker?.type ?? "Freelancer"}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Base Rate</p>
                  <p className="text-sm font-black text-foreground/80">₨ {(worker?.rate ?? 0).toLocaleString()} <span className="text-[9px] text-muted-foreground font-bold">{worker?.rate_type ?? "per event"}</span></p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Contact No.</p>
                  <p className="text-sm font-black text-foreground/80">{worker?.phone ?? "N/A"}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">City / Area</p>
                  <p className="text-sm font-black text-foreground/80 truncate">{worker?.area || worker?.city || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-6 mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aggregate Earnings</span>
                  <span className="text-lg font-black text-emerald-600">₨ {(worker?.totalPaid ?? 0).toLocaleString()}</span>
                </div>
                <Button variant="default" className="h-10 rounded-xl font-bold px-4 gap-2 shadow-lg shadow-primary/20" onClick={() => handlePrintWorkerCard(worker)}>
                  <Printer className="h-4 w-4" /> <span className="text-[11px] uppercase tracking-widest">Print ID</span>
                </Button>
              </div>

              <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                  <CalendarDays className="h-3 w-3 text-primary" /> Recent Assignments
                </p>
                <div className="space-y-2">
                  {(outsideAssignments ?? []).filter(a => a?.workerId === worker?.id).slice(0, 2).map((a, idx) => (
                    <div key={a?.id || `assignment-${idx}`} className="flex items-center justify-between text-[10px] bg-white/50 p-2 rounded-lg border border-border/30">
                      <span className="font-black text-foreground/80 truncate max-w-[110px]">{a?.eventName ?? "Event"}</span>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-bold">{a?.date ? format(new Date(a.date), 'MMM d') : "N/A"}</span>
                        <Badge className={`h-4 text-[8px] px-1 border-none ${a?.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                          {a?.status ?? "pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(outsideAssignments ?? []).filter(a => a?.workerId === worker?.id).length === 0 && (
                    <div className="py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-tighter italic border border-dashed border-border/50 rounded-lg">
                      No past events found
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/5">
              <h4 className="text-lg font-black text-foreground flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Active Assignments & Attendance
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 text-left border-b border-border">
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Worker Member</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Event Detail</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Scheduled Date</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Agreed Rate</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(outsideAssignments ?? []).filter(a => {
                    const w = (outsideWorkers ?? []).find(x => x?.id === a?.workerId);
                    return (w?.name ?? "").toLowerCase().includes((search ?? "").toLowerCase()) || 
                           (a?.eventName ?? "").toLowerCase().includes((search ?? "").toLowerCase());
                  }).map((a, idx) => (
                    <tr key={a?.id || `assignment-row-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-primary/5 transition-colors group`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">
                            {((outsideWorkers ?? []).find(w => w?.id === a?.workerId)?.name ?? "U")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-black text-foreground">{(outsideWorkers ?? []).find(w => w?.id === a?.workerId)?.name ?? "Unknown Worker"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-foreground/80">{a?.eventName ?? "Event Detail"}</span>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-muted-foreground uppercase tracking-tighter">{a?.date ? format(new Date(a.date), 'MMM d, yyyy') : "N/A"}</td>
                      <td className="px-6 py-5 text-right font-black text-emerald-600 text-sm">₨ {(a?.amount ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-5 text-center">
                        <Badge className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none ${a?.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                          {a?.status ?? "pending"}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-9 rounded-xl font-bold border-border gap-2 hover:bg-muted"
                          disabled={a?.status === 'paid'}
                          onClick={() => {
                            setOutsidePaymentForm({ workerId: a?.workerId ?? "", amount: a?.amount ?? 0, method: "cash", eventId: a?.eventId ?? "" });
                            setShowOutsidePaymentModal(true);
                          }}
                        >
                          <Wallet2 className="h-3.5 w-3.5 text-blue-500" /> Pay
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/5">
              <h4 className="text-lg font-black text-foreground flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Historical Payment Records
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 text-left border-b border-border">
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Payment Date</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Recipient Worker</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Method</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Event / Reference</th>
                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Amount Disbursed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(outsidePayments ?? []).filter(p => {
                    const w = (outsideWorkers ?? []).find(x => x?.id === p?.workerId);
                    return (w?.name ?? "").toLowerCase().includes((search ?? "").toLowerCase()) || 
                           (p?.method ?? "").toLowerCase().includes((search ?? "").toLowerCase());
                  }).map((p, idx) => (
                    <tr key={p?.id || `payment-row-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-emerald-50 transition-colors group`}>
                      <td className="px-6 py-5 text-sm font-bold text-muted-foreground uppercase tracking-tighter">{p?.date ? format(new Date(p.date), 'MMMM dd, yyyy') : "N/A"}</td>
                      <td className="px-6 py-5 font-black text-foreground">{(outsideWorkers ?? []).find(w => w?.id === p?.workerId)?.name ?? "Unknown"}</td>

                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${p?.method === "cash" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                          {p?.method ?? "cash"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-foreground/60">{p?.eventId || "General Ledger Disbursement"}</td>
                      <td className="px-6 py-5 text-right font-black text-emerald-600 text-base">₨ {(p?.amount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

HROutsideWorkers.displayName = "HROutsideWorkers";

export default HROutsideWorkers;
