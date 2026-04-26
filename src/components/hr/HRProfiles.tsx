import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Printer, Edit, FileText, ShieldCheck, Trash2, List, LayoutGrid, Search, Star, Download, Mail, Phone, MapPin, Calendar } from "lucide-react";
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
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  newStaff: any;
  setNewStaff: (staff: any) => void;
  handleAddStaff: () => void;
  showEditModal: boolean;
  editStaff: any;
  handleUpdateStaff: () => void;
  showViewModal: boolean;
  selectedStaff: any;
  showLedgerModal: boolean;
  ledgerStaff: any;
  handleExportLedger: () => void;
  handleExportLedgerPDF: () => void;
  showRightsModal: boolean;
  rightsStaff: any;
  handleUpdateRights: (id: string, rights: string[]) => void;
  showDeleteConfirm: string | null;
  handleDeleteStaff: (id: string) => void;
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
  statusColor,
  showAddModal,
  setShowAddModal,
  newStaff,
  setNewStaff,
  handleAddStaff,
  showEditModal,
  editStaff,
  handleUpdateStaff,
  showViewModal,
  selectedStaff,
  showLedgerModal,
  ledgerStaff,
  handleExportLedger,
  handleExportLedgerPDF,
  showRightsModal,
  rightsStaff,
  handleUpdateRights,
  showDeleteConfirm,
  handleDeleteStaff
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
                    <td className="px-6 py-5 text-center">
                      <Badge className={`${statusColor(s?.status ?? "inactive")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                        {s?.status ?? "inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/5" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}>
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
                  <p className="text-sm font-black text-foreground/80">{s?.joining_date || s?.joinDate || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-6 mb-6">
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

      {/* Modals from HRStaff.tsx */}
      
      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register New Staff</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Full Name *</Label><Input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email Address *</Label><Input type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Position / Role *</Label><Input value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Department</Label><Select value={newStaff.department} onValueChange={v => setNewStaff({ ...newStaff, department: v })}><SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger><SelectContent>{["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Monthly Salary (₨) *</Label><Input type="number" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone Number</Label><Input value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} /></div>
              <div className="col-span-full space-y-1.5"><Label>Residential Address</Label><Textarea value={newStaff.address} onChange={e => setNewStaff({ ...newStaff, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={newStaff.emergencyContact} onChange={e => setNewStaff({ ...newStaff, emergencyContact: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Joining Date</Label><Input type="date" value={newStaff.joinDate} onChange={e => setNewStaff({ ...newStaff, joinDate: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button><Button onClick={handleAddStaff} className="bg-primary">Complete Registration</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Update Staff Profile</DialogTitle></DialogHeader>
          {editStaff && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Full Name *</Label><Input value={editStaff.name} onChange={e => setEditStaff({ ...editStaff, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email Address *</Label><Input type="email" value={editStaff.email} onChange={e => setEditStaff({ ...editStaff, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Position / Role *</Label><Input value={editStaff.role} onChange={e => setEditStaff({ ...editStaff, role: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={editStaff.department} onValueChange={v => setEditStaff({ ...editStaff, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Monthly Salary (₨) *</Label><Input type="number" value={editStaff.salary} onChange={e => setEditStaff({ ...editStaff, salary: Number(e.target.value) })} /></div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStaff.status} onValueChange={v => setEditStaff({ ...editStaff, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Phone Number</Label><Input value={editStaff.phone} onChange={e => setEditStaff({ ...editStaff, phone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={editStaff.emergency_contact || editStaff.emergencyContact || ""} onChange={e => setEditStaff({ ...editStaff, emergency_contact: e.target.value })} /></div>
                <div className="col-span-full space-y-1.5"><Label>Residential Address</Label><Textarea value={editStaff.address} onChange={e => setEditStaff({ ...editStaff, address: e.target.value })} className="resize-none" /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button><Button onClick={handleUpdateStaff}>Update Profile</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Staff Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl border-none">
          {selectedStaff && (
            <div className="flex flex-col h-[80vh] sm:h-auto">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20">{selectedStaff.name.split(" ").map((n:any) => n[0]).join("").toUpperCase()}</div>
                    <div className="min-w-0"><h2 className="text-xl font-bold text-foreground truncate">{selectedStaff.name}</h2><p className="text-sm font-medium text-primary/80">{selectedStaff.role}</p><Badge variant="outline" className="mt-2 text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 h-5 bg-white">{selectedStaff.id}</Badge></div>
                  </div>
                  <Badge className={`capitalize py-1 px-3 ${statusColor(selectedStaff.status)}`}>{selectedStaff.status}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Department</Label><p className="text-sm font-medium">{selectedStaff.department}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Salary</Label><p className="text-sm font-bold text-success">₨ {(selectedStaff.salary || 0)?.toLocaleString()}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label><p className="text-sm font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.email}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phone Number</Label><p className="text-sm font-medium flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.phone}</p></div>
                  <div className="col-span-full space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Residential Address</Label><p className="text-sm font-medium flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /> {selectedStaff.address}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Joining Date</Label><p className="text-sm font-medium flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.joinDate}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Emergency Contact</Label><p className="text-sm font-medium text-destructive">{selectedStaff.emergencyContact}</p></div>
                </div>
              </div>
              <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-3"><Button variant="outline" onClick={() => setShowViewModal(false)}>Close Profile</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Staff Ledger Modal */}
      <Dialog open={showLedgerModal} onOpenChange={setShowLedgerModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Staff Ledger - {ledgerStaff?.name}</DialogTitle><DialogDescription>Complete history of payments, advances, and deductions.</DialogDescription></DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-success">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.netPay || 0), 0) || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Advances</p>
                <p className="text-lg font-bold text-destructive">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.deductions.loans || 0), 0) || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-bold text-destructive">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + ((h.deductions.tax || 0) + (h.deductions.absences || 0)), 0) || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Running Balance</p>
                <p className="text-lg font-bold text-primary">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.netPay || 0), 0) || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border"><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[800px]"><thead><tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Month</th><th className="px-4 py-3 text-right">Basic</th><th className="px-4 py-3 text-right">Allowances</th><th className="px-4 py-3 text-right">Bonuses</th><th className="px-4 py-3 text-right text-destructive">Advances</th><th className="px-4 py-3 text-right text-destructive">Deductions</th><th className="px-4 py-3 text-right font-bold text-success">Net Paid</th><th className="px-4 py-3 text-right font-bold text-primary">Running Bal</th></tr></thead><tbody className="divide-y divide-border">
              {ledgerStaff?.payrollHistory?.length > 0 ? (() => {
                let runningBalance = 0;
                return ledgerStaff.payrollHistory.map((h: any) => {
                  runningBalance += (h.netPay || 0);
                  return (
                    <tr key={h.id} className="text-sm hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{h.date}</td><td className="px-4 py-3 font-medium">{h.month}</td><td className="px-4 py-3 text-right">₨ {(h.basic || 0).toLocaleString()}</td><td className="px-4 py-3 text-right">₨ {((h.allowances.houseRent || 0) + (h.allowances.medical || 0) + (h.allowances.conveyance || 0)).toLocaleString()}</td><td className="px-4 py-3 text-right">₨ {(h.bonuses || 0).toLocaleString()}</td><td className="px-4 py-3 text-right text-destructive">₨ {(h.deductions.loans || 0).toLocaleString()}</td><td className="px-4 py-3 text-right text-destructive">₨ {((h.deductions.tax || 0) + (h.deductions.absences || 0)).toLocaleString()}</td><td className="px-4 py-3 text-right font-bold text-success">₨ {(h.netPay || 0).toLocaleString()}</td><td className="px-4 py-3 text-right font-bold text-primary">₨ {(runningBalance || 0).toLocaleString()}</td>
                    </tr>
                  );
                });
              })() : (<tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No payment history found.</td></tr>)}
            </tbody></table></div></div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2"><Button variant="outline" onClick={() => setShowLedgerModal(false)}>Close Ledger</Button><div className="flex gap-2"><Button variant="outline" className="gap-2" onClick={handleExportLedger}><Download className="h-4 w-4" /> Excel</Button><Button className="gap-2" onClick={handleExportLedgerPDF}><Download className="h-4 w-4" /> PDF</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Rights Modal */}
      <Dialog open={showRightsModal} onOpenChange={setShowRightsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>User Access Rights - {rightsStaff?.name}</DialogTitle><DialogDescription>Select which modules this staff member can access.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            {[ { id: 'dashboard', label: 'Dashboard View' }, { id: 'events', label: 'Event Booking' }, { id: 'inventory', label: 'Inventory Management' }, { id: 'expenses', label: 'Expense Tracking' }, { id: 'hr', label: 'HR & Staff Management' }, { id: 'finance', label: 'Finance & Accounts' } ].map(module => (
              <div key={module.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <Label htmlFor={`right-${module.id}`} className="flex-1 cursor-pointer">{module.label}</Label>
                <input type="checkbox" id={`right-${module.id}`} checked={rightsStaff?.rights?.includes(module.id)} onChange={(e) => {
                  const currentRights = rightsStaff?.rights || [];
                  const newRights = e.target.checked ? [...currentRights, module.id] : currentRights.filter((r: string) => r !== module.id);
                  setRightsStaff({ ...rightsStaff, rights: newRights });
                }} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRightsModal(false)}>Cancel</Button><Button onClick={() => handleUpdateRights(rightsStaff.id, rightsStaff.rights)}>Save Permissions</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Staff Record?</DialogTitle></DialogHeader>
           <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Keep Record</Button><Button variant="destructive" onClick={() => showDeleteConfirm && handleDeleteStaff(showDeleteConfirm)}>Yes, Delete Staff</Button></DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  );
});

HRProfiles.displayName = "HRProfiles";

export default HRProfiles;
