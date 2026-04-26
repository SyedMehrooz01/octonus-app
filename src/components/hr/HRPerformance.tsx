import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Star, Plus } from "lucide-react";
import React, { memo } from "react";

interface HRPerformanceProps {
  canDo: (action: string) => boolean;
  setShowPerformanceModal: (show: boolean) => void;
  staff: any[];
  statusColor: (status: string) => string;
  showPerformanceModal: boolean;
  performanceForm: any;
  setPerformanceForm: (form: any) => void;
  handleAddPerformance: () => void;
}

const HRPerformance = memo(({
  canDo,
  setShowPerformanceModal,
  staff,
  statusColor,
  showPerformanceModal,
  performanceForm,
  setPerformanceForm,
  handleAddPerformance
}: HRPerformanceProps) => {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-end bg-white p-6 rounded-2xl border border-border shadow-sm">
        {canDo("add") && (
          <Button onClick={() => setShowPerformanceModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 h-11 px-6 gap-2">
            <Plus className="h-4 w-4" /> Add Performance Review
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-muted/30 text-left border-b border-border">
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Current Rating</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Last Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(staff ?? []).map((s, idx) => {
                const perfRecords = s?.performanceRecords ?? [];
                const latestPerf = perfRecords.length > 0 ? perfRecords[perfRecords.length - 1] : null;
                return (
                  <tr key={s?.id || `performance-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-primary/5 transition-colors group`}>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {(s?.name ?? "U")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-black text-foreground">{s?.name ?? "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">{s?.department ?? "N/A"}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`h-3.5 w-3.5 ${star <= (latestPerf?.rating ?? 0) ? "text-amber-500 fill-current" : "text-muted/50"}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Badge className={`${statusColor(s?.status ?? "active")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                        {s?.status ?? "active"}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">{latestPerf?.month ?? "No review yet"}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Modal */}
      <Dialog open={showPerformanceModal} onOpenChange={setShowPerformanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Performance Rating</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setPerformanceForm({ ...performanceForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rating (1-5 Stars)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Button key={star} variant="ghost" size="icon" onClick={() => setPerformanceForm({ ...performanceForm, rating: star })} className={performanceForm.rating >= star ? "text-warning" : "text-muted-foreground"}>
                    <Star className={`h-6 w-6 ${performanceForm.rating >= star ? "fill-current" : ""}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Performance Notes</Label><Textarea placeholder="Add feedback or notes..." value={performanceForm.notes} onChange={e => setPerformanceForm({ ...performanceForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddPerformance} className="w-full">Save Rating</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

HRPerformance.displayName = "HRPerformance";

export default HRPerformance;
