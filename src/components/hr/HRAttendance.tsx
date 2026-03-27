import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, Users, Clock, Download, Edit } from "lucide-react";
import { format } from "date-fns";
import React, { memo } from "react";

interface HRAttendanceProps {
  canDo: (action: string) => boolean;
  showAttendanceModal: boolean;
  setShowAttendanceModal: (show: boolean) => void;
  attendanceForm: any;
  setAttendanceForm: (form: any) => void;
  staff: any[];
  handleMarkAttendance: () => void;
  showBulkAttendanceModal: boolean;
  setShowBulkAttendanceModal: (show: boolean) => void;
  bulkStatus: string;
  setBulkStatus: (status: string) => void;
  handleBulkAttendance: () => void;
  handleMarkAllPresent: () => void;
  handleAutoAbsent: () => void;
  handleExportAttendance: () => void;
  attendance: any[];
  editAttendanceId: string | null;
  setEditAttendanceId: (id: string | null) => void;
  handleUpdateAttendance: (id: string, status: string) => void;
  statusColor: (status: string) => string;
}


const HRAttendance = memo(({
  canDo,
  showAttendanceModal,
  setShowAttendanceModal,
  attendanceForm,
  setAttendanceForm,
  staff,
  handleMarkAttendance,
  showBulkAttendanceModal,
  setShowBulkAttendanceModal,
  bulkStatus,
  setBulkStatus,
  handleBulkAttendance,
  handleMarkAllPresent,
  handleAutoAbsent,
  handleExportAttendance,
  attendance,
  editAttendanceId,
  setEditAttendanceId,
  handleUpdateAttendance,
  statusColor
}: HRAttendanceProps) => {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {canDo("add") && (
            <Button onClick={() => setShowAttendanceModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 h-11 px-6 gap-2 flex-1 sm:flex-none">
              <CheckCircle className="h-4 w-4" /> Mark Attendance
            </Button>
          )}
          {canDo("edit") && (
            <Button onClick={handleMarkAllPresent} variant="outline" className="rounded-xl font-bold border-border h-11 px-6 gap-2 flex-1 sm:flex-none hover:bg-muted">
              <Users className="h-4 w-4 text-primary" /> Mark All Present
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {canDo("edit") && (
            <Button variant="outline" className="rounded-xl font-bold border-border h-11 px-6 gap-2 w-full sm:w-auto hover:bg-muted" onClick={handleAutoAbsent}>
              <Clock className="h-4 w-4 text-amber-500" /> Auto Absent
            </Button>
          )}
          {canDo("export") && (
            <Button variant="outline" className="rounded-xl font-bold border-border h-11 px-6 gap-2 w-full sm:w-auto hover:bg-muted" onClick={handleExportAttendance}>
              <Download className="h-4 w-4 text-blue-500" /> Export List
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-muted/30 text-left border-b border-border">
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Marked Date</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Current Status</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Time Logs (In/Out)</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Edit Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(attendance ?? []).map((a, idx) => (
                <tr key={a?.id || `attendance-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-primary/5 transition-colors group`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                        {(a?.name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-black text-foreground">{a?.name ?? "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">
                      {a?.date ? format(new Date(a.date), 'MMMM dd, yyyy') : "N/A"}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {editAttendanceId === a?.id ? (
                      <div className="flex justify-center">
                        <Select defaultValue={a?.status ?? "present"} onValueChange={(v) => handleUpdateAttendance(a?.id, v)}>

                          <SelectTrigger className="h-9 w-[130px] rounded-xl border-border bg-white font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="present" className="font-bold">Present</SelectItem>
                            <SelectItem value="absent" className="font-bold text-rose-500">Absent</SelectItem>
                            <SelectItem value="late" className="font-bold text-amber-500">Late</SelectItem>
                            <SelectItem value="half-day" className="font-bold text-blue-500">Half Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge className={`${statusColor(a?.status ?? "absent")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                        {a?.status ?? "absent"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-black text-foreground/70">
                        {a?.checkIn || "--:--"} <span className="text-muted-foreground mx-1">→</span> {a?.checkOut || "--:--"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Button variant="ghost" size="icon" className={`h-9 w-9 rounded-xl transition-all ${editAttendanceId === a?.id ? "bg-primary text-white" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`} onClick={() => setEditAttendanceId(editAttendanceId === a?.id ? null : a?.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Modal */}
      <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mark Staff Attendance</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Employee</Label>
              <Select onValueChange={v => setAttendanceForm({ ...attendanceForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff Member" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={attendanceForm.status} onValueChange={v => setAttendanceForm({ ...attendanceForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleMarkAttendance} className="w-full">Save Attendance</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Attendance Modal */}
      <Dialog open={showBulkAttendanceModal} onOpenChange={setShowBulkAttendanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Mark Attendance</DialogTitle>
            <DialogDescription>Mark all staff members with a single status for today.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Select Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 font-bold" onClick={handleBulkAttendance}>Mark All as {bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1)}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

HRAttendance.displayName = "HRAttendance";

export default HRAttendance;
