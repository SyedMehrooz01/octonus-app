import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import React, { memo } from "react";

interface HRLeavesProps {
  leaves: any[];
  canDo: (action: string) => boolean;
  setShowLeaveRequestModal: (show: boolean) => void;
  handleLeaveAction: (id: number, status: string) => void;
  statusColor: (status: string) => string;
}

const HRLeaves = memo(({
  leaves,
  canDo,
  setShowLeaveRequestModal,
  handleLeaveAction,
  statusColor
}: HRLeavesProps) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 flex-1 mr-4">
          {['Pending', 'Approved', 'Rejected'].map(status => (
            <div key={status} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{status} Requests</p>
              <p className="mt-1 text-2xl font-bold">{leaves.filter(l => (l.status ?? "").toLowerCase() === status.toLowerCase()).length}</p>
            </div>
          ))}
        </div>
        {canDo("add") && (
          <Button onClick={() => setShowLeaveRequestModal(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Request Leave
          </Button>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Staff</th>
                <th className="px-4 py-3 text-left">Leave Type</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(leaves ?? []).map(l => (
                <tr key={l?.id ?? Math.random()} className="text-sm hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{l?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">{l?.type ?? "N/A"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {l?.start ? format(new Date(l.start), 'MMM dd') : "N/A"} - {l?.end ? format(new Date(l.end), 'MMM dd') : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColor(l?.status ?? "pending")}>{l?.status ?? "pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDo("edit") && (l?.status ?? "pending") === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-success text-success hover:bg-success/10" onClick={() => handleLeaveAction(l?.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleLeaveAction(l?.id, 'rejected')}>Reject</Button>
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

HRLeaves.displayName = "HRLeaves";

export default HRLeaves;
