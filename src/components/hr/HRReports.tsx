import { Button } from "@/components/ui/button";
import React, { memo } from "react";

interface HRReportsProps {
  handleExportEOBIReport: () => void;
  handleExportTaxReport: () => void;
}

const HRReports = memo(({
  handleExportEOBIReport,
  handleExportTaxReport
}: HRReportsProps) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">EOBI Report</h3>
          <p className="text-sm text-muted-foreground">Monthly EOBI contribution report.</p>
          <Button onClick={handleExportEOBIReport} className="mt-4">Export EOBI Report</Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">Tax Deduction Report</h3>
          <p className="text-sm text-muted-foreground">Monthly tax deduction report.</p>
          <Button onClick={handleExportTaxReport} className="mt-4">Export Tax Report</Button>
        </div>
      </div>
    </div>
  );
});

HRReports.displayName = "HRReports";

export default HRReports;
