import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import React, { memo } from "react";

interface HRPerformanceProps {
  canDo: (action: string) => boolean;
  setShowPerformanceModal: (show: boolean) => void;
  staff: any[];
}

const HRPerformance = memo(({
  canDo,
  setShowPerformanceModal,
  staff
}: HRPerformanceProps) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        {canDo("add") && (
          <Button onClick={() => setShowPerformanceModal(true)} className="gap-2">
            <Star className="h-4 w-4" /> Add Rating
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(staff ?? []).map(s => (
          <div key={s?.id ?? Math.random()} className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {(s?.name ?? "U")[0]}
              </div>
              <div>
                <p className="font-bold text-sm">{s?.name ?? "Unknown"}</p>
                <p className="text-[10px] text-muted-foreground">{s?.role ?? "No Role"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star} 
                  className={`h-4 w-4 ${star <= (s?.performance?.[(s?.performance?.length ?? 0) - 1] || 0) ? "fill-warning text-warning" : "text-muted-foreground"}`} 
                />
              ))}
              <span className="ml-2 text-xs font-bold">{(s?.performance?.[(s?.performance?.length ?? 0) - 1] || 0)}.0</span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">History</p>
              <div className="flex gap-1 h-8 items-end">
                {(s?.performance ?? []).map((p: any, i: number) => (
                  <div key={i} className="bg-primary/40 w-full rounded-t-sm" style={{ height: `${(p ?? 0) * 20}%` }} title={`Rating: ${p ?? 0}`} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

HRPerformance.displayName = "HRPerformance";

export default HRPerformance;
