import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Check, X } from "lucide-react";
import { format } from "date-fns";
import React, { memo } from "react";

interface HRLeavesProps {
  canDo: (action: string) => boolean;
  setShowLeaveRequestModal: (show: boolean) => void;
  leaves: any[];
  handleLeaveAction: (id: string, status: string) => void;
  statusColor: (status: string) => string;
  showLeaveRequestModal: boolean;
  leaveForm: any;
  setLeaveForm: (form: any) => void;
  staff: any[];
  handleRequestLeave: () => void;
}


const HRLeaves = memo(({
  canDo,
  setShowLeaveRequestModal,
  leaves,
  handleLeaveAction,
  statusColor,
  showLeaveRequestModal,
  leaveForm,
  setLeaveForm,
  staff,
  handleRequestLeave
}: HRLeavesProps) => {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-end bg-white p-6 rounded-2xl border border-border shadow-sm">
        {canDo("add") && (
          <Button onClick={() => setShowLeaveRequestModal(true)} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 h-11 px-6 gap-2">
            <Plus className="h-4 w-4" /> Request Leave
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-muted/30 text-left border-b border-border">
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Leave Type</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(leaves ?? []).map((l, idx) => (
                <tr key={l?.id || `leave-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-primary/5 transition-colors group`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                        {(l?.name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-black text-foreground">{l?.name ?? "Unknown"}</span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <Badge variant="outline" className="rounded-lg font-bold text-[10px] uppercase tracking-tighter bg-white border-border px-2.5 py-1">
                      {l?.type ?? "Annual"}
                    </Badge>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-foreground">
                        {l?.start ? format(new Date(l.start), 'MMM dd') : "N/A"} - {l?.end ? format(new Date(l.end), 'MMM dd') : "N/A"}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        {l?.reason ?? "No reason provided"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <Badge className={`${statusColor(l?.status ?? "pending")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                      {l?.status ?? "pending"}
                    </Badge>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      {l?.status === "pending" && canDo("edit") && (
                        <>
                          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => handleLeaveAction(l.id, "approved")}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleLeaveAction(l.id, "rejected")}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Request Modal */}
      <Dialog open={showLeaveRequestModal} onOpenChange={setShowLeaveRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setLeaveForm({ ...leaveForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual Leave</SelectItem>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Casual">Casual Leave</SelectItem>
                  <SelectItem value="Maternity">Maternity Leave</SelectItem>
                  <SelectItem value="Paternity">Paternity Leave</SelectItem>
                  <SelectItem value="Hajj">Hajj Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={leaveForm.start} onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={leaveForm.end} onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Reason</Label><Textarea placeholder="Brief reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleRequestLeave} className="w-full">Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

HRLeaves.displayName = "HRLeaves";

export default HRLeaves;
