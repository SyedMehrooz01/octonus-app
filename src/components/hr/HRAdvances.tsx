import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import React, { memo } from "react";

interface HRAdvancesProps {
  canDo: (action: string) => boolean;
  setShowAdvanceModal: (show: boolean) => void;
  advances: any[];
  handleAdvanceAction: (id: string, status: string) => void;
  statusColor: (status: string) => string;
}


const HRAdvances = memo(({
  canDo,
  setShowAdvanceModal,
  advances,
  handleAdvanceAction,
  statusColor
}: HRAdvancesProps) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        {canDo("add") && (
          <Button onClick={() => setShowAdvanceModal(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Request Advance
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
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(advances ?? []).map((a, idx) => (
                <tr key={a?.id || `advance-${idx}`} className="text-sm hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{a?.name ?? "Unknown"}</td>

                  <td className="px-4 py-3 text-muted-foreground">{a?.date ?? "N/A"}</td>
                  <td className="px-4 py-3">₨ {(a?.amount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{a?.reason ?? "No Reason"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColor(a?.status ?? "pending")}>{a?.status ?? "pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(a?.status ?? "pending") === 'pending' && canDo("edit") && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-success text-success hover:bg-success/10" onClick={() => handleAdvanceAction(a?.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleAdvanceAction(a?.id, 'rejected')}>Reject</Button>
                      </div>
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

HRAdvances.displayName = "HRAdvances";

export default HRAdvances;
