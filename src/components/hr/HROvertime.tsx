import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import React, { memo } from "react";

interface HROvertimeProps {
  canDo: (action: string) => boolean;
  setShowOvertimeModal: (show: boolean) => void;
  overtime: any[];
  handleOvertimeAction: (id: string, status: string) => void;
  statusColor: (status: string) => string;
}


const HROvertime = memo(({
  canDo,
  setShowOvertimeModal,
  overtime,
  handleOvertimeAction,
  statusColor
}: HROvertimeProps) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        {canDo("add") && (
          <Button onClick={() => setShowOvertimeModal(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Log Overtime
          </Button>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Staff</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(overtime ?? []).map((o, idx) => (
                <tr key={o?.id || `overtime-${idx}`} className="text-sm hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{o?.name ?? "Unknown"}</td>

                  <td className="px-4 py-3 text-muted-foreground">{o?.date ?? "N/A"}</td>
                  <td className="px-4 py-3">{o?.hours ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColor(o?.status ?? "pending")}>{o?.status ?? "pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(o?.status ?? "pending") === 'pending' && canDo("edit") && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-success text-success hover:bg-success/10" onClick={() => handleOvertimeAction(o?.id, 'paid')}>Mark as Paid</Button>
                    )}
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

HROvertime.displayName = "HROvertime";

export default HROvertime;
