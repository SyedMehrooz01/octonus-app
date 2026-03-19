import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, History, Search, Plus, CalendarDays, Wallet2, Star, Printer } from "lucide-react";
import React, { memo } from "react";

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
    <div className="mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={outsideViewMode === "cards" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setOutsideViewMode("cards")}
            className="h-8 gap-2"
          >
            <Users className="h-4 w-4" /> Workers
          </Button>
          <Button 
            variant={outsideViewMode === "history" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setOutsideViewMode("history")}
            className="h-8 gap-2"
          >
            <History className="h-4 w-4" /> History & Payments
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search workers..." 
              className="pl-9 h-9 w-full" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-2">
            {canDo("add") && (
              <Button onClick={() => setShowAddOutsideModal(true)} className="gap-2 flex-1 sm:flex-none h-9">
                <Plus className="h-4 w-4" /> Add Worker
              </Button>
            )}
            {canDo("edit") && (
              <>
                <Button onClick={() => setShowAssignEventModal(true)} variant="outline" className="gap-2 flex-1 sm:flex-none h-9">
                  <CalendarDays className="h-4 w-4" /> Assign
                </Button>
                <Button onClick={() => setShowOutsidePaymentModal(true)} variant="outline" className="gap-2 flex-1 sm:flex-none h-9">
                  <Wallet2 className="h-4 w-4" /> Pay
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {outsideViewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(outsideWorkers ?? []).filter(w => 
            (w?.name ?? "").toLowerCase().includes(search.toLowerCase()) || 
            (w?.skill ?? "").toLowerCase().includes(search.toLowerCase())
          ).map(worker => (
            <div key={worker?.id ?? Math.random()} className="relative group overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary border-2 border-primary/20">
                    {(worker?.name ?? "W")[0]}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-card-foreground leading-tight">{worker?.name ?? "Unknown"}</h4>
                    <p className="text-xs text-primary font-bold uppercase tracking-wider">{worker?.skill ?? "General"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (worker?.rating ?? 5) ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={`capitalize font-bold ${worker?.status === 'available' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                  {worker?.status ?? "available"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-border pt-4 text-[11px]">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Type</p>
                  <p className="font-bold">{worker?.type ?? "Freelancer"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Rate</p>
                  <p className="font-bold">₨ {(worker?.rate ?? 0).toLocaleString()} <span className="text-[9px] text-muted-foreground font-normal">{worker?.rate_type ?? "per event"}</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Contact</p>
                  <p className="font-bold">{worker?.phone ?? "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Location</p>
                  <p className="font-bold truncate">{worker?.area ?? ""}, {worker?.city ?? ""}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Paid</span>
                  <span className="text-sm font-black text-success">₨ {(worker?.totalPaid ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-wider" onClick={() => handlePrintWorkerCard(worker)}>
                    <Printer className="h-3 w-3" /> Worker Card
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Recent Assignments</p>
                <div className="space-y-2">
                  {(outsideAssignments ?? []).filter(a => a?.workerId === worker?.id).slice(0, 2).map(a => (
                    <div key={a?.id ?? Math.random()} className="flex items-center justify-between text-[10px] bg-muted/30 p-1.5 rounded">
                      <span className="font-bold truncate max-w-[120px]">{a?.eventName ?? "Event"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{a?.date ?? "N/A"}</span>
                        <Badge variant="outline" className={`h-4 text-[8px] px-1 ${a?.status === 'paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {a?.status ?? "pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(outsideAssignments ?? []).filter(a => a?.workerId === worker?.id).length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">No past events found</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card">
            <div className="p-4 border-b border-border bg-muted/20">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Worker Assignments & Attendance
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Worker</th>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-center">Hours</th>
                    <th className="px-4 py-3 text-center">Attendance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(outsideAssignments ?? []).filter(a => {
                    const w = (outsideWorkers ?? []).find(x => x?.id === a?.workerId);
                    return (w?.name ?? "").toLowerCase().includes(search.toLowerCase()) || 
                           (a?.eventName ?? "").toLowerCase().includes(search.toLowerCase());
                  }).map(a => (
                    <tr key={a?.id ?? Math.random()} className="text-xs hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-bold">{(outsideWorkers ?? []).find(w => w?.id === a?.workerId)?.name ?? "Unknown"}</td>
                      <td className="px-4 py-3">{a?.eventName ?? "Event"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a?.date ?? "N/A"}</td>
                      <td className="px-4 py-3 text-right font-bold">₨ {(a?.amount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Input 
                          type="number" 
                          className="h-7 w-16 text-center mx-auto" 
                          value={a?.hours ?? 0} 
                          onChange={e => setOutsideAssignments((outsideAssignments ?? []).map(x => x?.id === a?.id ? { ...x, hours: Number(e.target.value) } : x))}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Select value={a?.attendance ?? "pending"} onValueChange={v => setOutsideAssignments((outsideAssignments ?? []).map(x => x?.id === a?.id ? { ...x, attendance: v } : x))}>
                          <SelectTrigger className="h-7 w-24 mx-auto text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`h-5 text-[9px] capitalize ${a?.status === 'paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {a?.status ?? "pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[9px] gap-1"
                          disabled={a?.status === 'paid'}
                          onClick={() => {
                            setOutsidePaymentForm({ workerId: a?.workerId ?? "", amount: a?.amount ?? 0, method: "cash", eventId: a?.eventId ?? "" });
                            setShowOutsidePaymentModal(true);
                          }}
                        >
                          <Wallet2 className="h-3 w-3" /> Pay
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="p-4 border-b border-border bg-muted/20">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Payment History
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Worker</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(outsidePayments ?? []).filter(p => {
                    const w = (outsideWorkers ?? []).find(x => x?.id === p?.workerId);
                    return (w?.name ?? "").toLowerCase().includes(search.toLowerCase()) || 
                           (p?.method ?? "").toLowerCase().includes(search.toLowerCase());
                  }).map(p => (
                    <tr key={p?.id ?? Math.random()} className="text-xs hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{p?.date ?? "N/A"}</td>
                      <td className="px-4 py-3 font-bold">{(outsideWorkers ?? []).find(w => w?.id === p?.workerId)?.name ?? "Unknown"}</td>
                      <td className="px-4 py-3 capitalize">{p?.method ?? "cash"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p?.eventId ?? "General Payment"}</td>
                      <td className="px-4 py-3 text-right font-bold text-success">₨ {(p?.amount ?? 0).toLocaleString()}</td>
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
