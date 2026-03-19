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
    <div className="mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("list")}
            className="h-8 gap-2"
          >
            <List className="h-4 w-4" /> List
          </Button>
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("grid")}
            className="h-8 gap-2"
          >
            <LayoutGrid className="h-4 w-4" /> Cards
          </Button>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, Name..." 
            className="pl-9 h-9 w-full" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role & Dept</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(filteredStaff ?? []).map(s => (
                  <tr key={s?.id ?? Math.random()} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-4 text-sm font-mono font-medium text-primary">{s?.id ?? "N/A"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-xs">
                          {(s?.name ?? "U").split(" ").map((n:any) => n[0]).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{s?.name ?? "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{s?.email ?? "No Email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{s?.phone ?? "N/A"}</td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-card-foreground">{s?.role ?? "N/A"}</p>
                      <p className="text-[11px] text-muted-foreground">{s?.department ?? "N/A"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className={`capitalize font-medium ${statusColor(s?.status ?? "inactive")}`}>
                        {s?.status ?? "inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintCard(s)}>
                          <Printer className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {canDo("edit") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditStaff(s); setShowEditModal(true); }}>
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLedgerStaff(s); setShowLedgerModal(true); }}>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {user?.role === "admin" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRightsStaff(s); setShowRightsModal(true); }}>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {canDo("delete") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(s?.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(filteredStaff ?? []).map(s => (
            <div key={s?.id ?? Math.random()} className="relative group overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary border-2 border-primary/20">
                    {(s?.name ?? "U").split(' ').map((n:any) => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-card-foreground leading-tight">{s?.name ?? "Unknown"}</h4>
                    <p className="text-xs text-muted-foreground font-medium">{s?.role ?? "No Role"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (s?.performance?.[(s?.performance?.length ?? 0) - 1] || 4) ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                  (s?.status ?? 'active') === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {s?.status ?? "inactive"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-border pt-4 text-[11px]">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Staff ID</p>
                  <p className="font-bold">{s?.id ?? "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Department</p>
                  <p className="font-bold">{s?.department ?? "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Monthly Salary</p>
                  <p className="font-bold text-success">₨ {(s?.salary ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Joining Date</p>
                  <p className="font-bold">{s?.joinDate ?? "N/A"}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Monthly Attendance</span>
                  <span className="text-sm font-black text-primary">{(s?.attendance ?? 100)}%</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}><Eye className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-wider" onClick={() => handlePrintCard(s)}>
                    <Printer className="h-3 w-3" /> ID Card
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
