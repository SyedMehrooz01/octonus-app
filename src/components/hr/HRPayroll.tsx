import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import React, { memo } from "react";

interface HRPayrollProps {
  canDo: (action: string) => boolean;
  handleExportPayroll: () => void;
  staff: any[];
  prefillPayrollForm: (staff: any) => void;
  setShowPayrollModal: (show: boolean) => void;
  handleGeneratePayslip: (staff: any, payroll: any) => void;
  statusColor: (status: string) => string;
}

const HRPayroll = memo(({
  canDo,
  handleExportPayroll,
  staff,
  prefillPayrollForm,
  setShowPayrollModal,
  handleGeneratePayslip,
  statusColor
}: HRPayrollProps) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        {canDo("export") && (
          <Button variant="outline" className="gap-2" onClick={handleExportPayroll}>
            <Download className="h-4 w-4" /> Export Payroll
          </Button>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Staff</th>
                <th className="px-4 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-left">Net Salary</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(staff ?? []).map(s => {
                const latestPayroll = s?.payrollHistory?.[(s?.payrollHistory?.length ?? 0) - 1];
                const netSalary = latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0);
                return (
                  <tr key={s?.id ?? Math.random()} className="text-sm hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s?.name ?? "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{s?.id ?? "N/A"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{latestPayroll ? (latestPayroll?.month ?? "N/A") : format(new Date(), 'MMMM yyyy')}</td>
                    <td className="px-4 py-3 font-bold text-success">₨ {(netSalary || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColor(latestPayroll ? (latestPayroll?.status ?? "paid") : "pending")}>
                        {latestPayroll ? (latestPayroll?.status ?? "Paid") : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canDo("edit") && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            prefillPayrollForm(s);
                            setShowPayrollModal(true);
                          }}>Process</Button>
                        )}
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0" 
                            disabled={!latestPayroll}
                            onClick={() => handleGeneratePayslip(s, latestPayroll)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/20 font-bold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm uppercase tracking-wider text-right">Total Monthly Payroll:</td>
                <td className="px-4 py-3 text-success text-lg">
                  ₨ {((staff ?? []).reduce((acc, s) => {
                    const latestPayroll = s?.payrollHistory?.[(s?.payrollHistory?.length ?? 0) - 1];
                    return acc + ((latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0)) || 0);
                  }, 0) || 0).toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
});

HRPayroll.displayName = "HRPayroll";

export default HRPayroll;
