import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Printer, Edit, FileText, ShieldCheck, Trash2, List, LayoutGrid, Search, Star } from "lucide-react";
import React, { memo } from "react";

interface HRProfilesProps {
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  search: string;
  setSearch: (search: string) => void;
  filteredStaff: any[];
  setSelectedStaff: (staff: any) => void;
  setShowViewModal: (show: boolean) => void;
  handlePrintCard: (staff: any) => void;
  canDo: (action: string) => boolean;
  setEditStaff: (staff: any) => void;
  setShowEditModal: (show: boolean) => void;
  setLedgerStaff: (staff: any) => void;
  setShowLedgerModal: (show: boolean) => void;
  user: any;
  setRightsStaff: (staff: any) => void;
  setShowRightsModal: (show: boolean) => void;
  setShowDeleteConfirm: (id: string | null) => void;
  statusColor: (status: string) => string;
}

const HRProfiles = memo(({
  viewMode,
  setViewMode,
  search,
  setSearch,
  filteredStaff,
  setSelectedStaff,
  setShowViewModal,
  handlePrintCard,
  canDo,
  setEditStaff,
  setShowEditModal,
  setLedgerStaff,
  setShowLedgerModal,
  user,
  setRightsStaff,
  setShowRightsModal,
  setShowDeleteConfirm,
  statusColor
}: HRProfilesProps) => {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/50">
          <Button 
            variant={viewMode === "list" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("list")}
            className={`h-9 px-4 rounded-lg font-bold gap-2 transition-all ${viewMode === "list" ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" /> List View
          </Button>
          <Button 
            variant={viewMode === "grid" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("grid")}
            className={`h-9 px-4 rounded-lg font-bold gap-2 transition-all ${viewMode === "grid" ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" /> Grid View
          </Button>
        </div>
        <div className="relative w-full sm:max-w-md group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search by ID, Name, Role or Department..." 
            className="pl-10 h-11 w-full bg-white border-border rounded-xl focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-muted/30 text-left border-b border-border">
                  <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Employee ID</th>
                  <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Staff Member</th>
                  <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Designation & Dept</th>
                  <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(filteredStaff ?? []).map((s, idx) => (
                  <tr key={s?.id ?? Math.random()} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-primary/5 transition-colors group`}>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-primary/5 text-primary font-black text-xs border border-primary/10">
                        {s?.id ?? "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
                          {(s?.name ?? "U").split(" ").map((n:any) => n[0]).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-black text-foreground leading-tight group-hover:text-primary transition-colors">{s?.name ?? "Unknown"}</p>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">{s?.email ?? "No Email Address"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-foreground/80 leading-tight">{s?.role ?? "N/A"}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{s?.department ?? "Unassigned"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground/70">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {s?.phone ?? "No Contact"}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Badge className={`${statusColor(s?.status ?? "inactive")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                        {s?.status ?? "inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50 hover:text-blue-700 shadow-sm" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 shadow-sm" onClick={() => handlePrintCard(s)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canDo("edit") && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 shadow-sm" onClick={() => { setEditStaff(s); setShowEditModal(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-violet-600 hover:text-violet-700 hover:bg-violet-100/50 shadow-sm" onClick={() => { setLedgerStaff(s); setShowLedgerModal(true); }}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        {user?.role === "admin" && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-100/50 shadow-sm" onClick={() => { setRightsStaff(s); setShowRightsModal(true); }}>
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {canDo("delete") && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-100/50 shadow-sm" onClick={() => setShowDeleteConfirm(s?.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(filteredStaff ?? []).map(s => (
            <div key={s?.id ?? Math.random()} className="relative group overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-400 text-2xl font-black text-white shadow-lg shadow-primary/20">
                      {(s?.name ?? "U").split(' ').map((n:any) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-foreground leading-tight truncate max-w-[150px]">{s?.name ?? "Unknown"}</h4>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 truncate max-w-[150px]">{s?.role ?? "No Role"}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (s?.performance?.[(s?.performance?.length ?? 0) - 1] || 4) ? "text-amber-400 fill-amber-400" : "text-muted/30"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <Badge className={`${statusColor(s?.status ?? "inactive")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                  {s?.status ?? "inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-3 border-t border-border pt-6 mb-6">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Employee ID</p>
                  <p className="text-sm font-black text-foreground/80">{s?.id ?? "N/A"}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Department</p>
                  <p className="text-sm font-black text-foreground/80">{s?.department ?? "N/A"}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Base Salary</p>
                  <p className="text-sm font-black text-emerald-600">₨ {(s?.salary ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Join Date</p>
                  <p className="text-sm font-black text-foreground/80">{s?.joinDate ?? "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Attendance</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-primary">{(s?.attendance ?? 100)}%</span>
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${s?.attendance ?? 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border hover:bg-muted hover:text-primary transition-colors" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}>
                    <Eye className="h-5 w-5" />
                  </Button>
                  <Button variant="default" className="h-10 rounded-xl font-bold px-4 gap-2 shadow-lg shadow-primary/20" onClick={() => handlePrintCard(s)}>
                    <Printer className="h-4 w-4" /> <span className="text-[11px] uppercase tracking-widest">ID Card</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

HRProfiles.displayName = "HRProfiles";

export default HRProfiles;
