import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Users, Clock, Download, Edit } from "lucide-react";
import { format } from "date-fns";
import React, { memo } from "react";

interface HRAttendanceProps {
  canDo: (action: string) => boolean;
  setShowAttendanceModal: (show: boolean) => void;
  handleMarkAllPresent: () => void;
  handleAutoAbsent: () => void;
  handleExportAttendance: () => void;
  attendance: any[];
  editAttendanceId: number | null;
  setEditAttendanceId: (id: number | null) => void;
  handleUpdateAttendance: (id: number, status: string) => void;
  statusColor: (status: string) => string;
}

const HRAttendance = memo(({
  canDo,
  setShowAttendanceModal,
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
    <div className="mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          {canDo("add") && (
            <Button onClick={() => setShowAttendanceModal(true)} className="gap-2 flex-1 sm:flex-none">
              <CheckCircle className="h-4 w-4" /> Mark Attendance
            </Button>
          )}
          {canDo("edit") && (
            <Button onClick={handleMarkAllPresent} variant="outline" className="gap-2 flex-1 sm:flex-none">
              <Users className="h-4 w-4" /> Mark All Present
            </Button>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {canDo("edit") && (
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleAutoAbsent}>
              <Clock className="h-4 w-4" /> Run Auto Absent
            </Button>
          )}
          {canDo("export") && (
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportAttendance}>
              <Download className="h-4 w-4" /> Export Report
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">In/Out</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(attendance ?? []).map(a => (
                <tr key={a?.id ?? Math.random()} className="text-sm hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{a?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a?.date ? format(new Date(a.date), 'MMM dd, yyyy') : "N/A"}</td>
                  <td className="px-4 py-3">
                    {editAttendanceId === a?.id ? (
                      <Select defaultValue={a?.status ?? "present"} onValueChange={(v) => handleUpdateAttendance(a?.id, v)}>
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="half-day">Half Day</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={statusColor(a?.status ?? "absent")}>{a?.status ?? "absent"}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a?.checkIn ?? "-"} - {a?.checkOut ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditAttendanceId(editAttendanceId === a?.id ? null : a?.id)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

HRAttendance.displayName = "HRAttendance";

export default HRAttendance;
