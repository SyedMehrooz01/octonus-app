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
    <div className="mt-8 space-y-6">
      <div className="flex justify-end bg-white p-6 rounded-2xl border border-border shadow-sm">
        {canDo("export") && (
          <Button variant="outline" className="rounded-xl font-bold border-border h-11 px-6 gap-2 hover:bg-muted" onClick={handleExportPayroll}>
            <Download className="h-4 w-4 text-emerald-500" /> Export Monthly Payroll
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-muted/30 text-left border-b border-border">
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Payroll Month</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Calculated Net Pay</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(staff ?? []).map((s, idx) => {
                const latestPayroll = s?.payrollHistory?.[(s?.payrollHistory?.length ?? 0) - 1];
                const netSalary = latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0);
                return (
                  <tr key={s?.id ?? Math.random()} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-muted/5'} hover:bg-primary/5 transition-colors group`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {(s?.name ?? "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground">{s?.name ?? "Unknown"}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">{s?.id ?? "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">
                        {latestPayroll ? (latestPayroll?.month ?? "N/A") : format(new Date(), 'MMMM yyyy')}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base font-black text-emerald-600">₨ {(netSalary || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Badge className={`${statusColor(latestPayroll ? (latestPayroll?.status ?? "paid") : "pending")} rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none`}>
                        {latestPayroll ? (latestPayroll?.status ?? "Paid") : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        {canDo("edit") && (
                          <Button size="sm" variant="outline" className="h-9 rounded-xl font-bold border-primary/20 text-primary hover:bg-primary hover:text-white transition-all px-4" onClick={() => {
                            prefillPayrollForm(s);
                            setShowPayrollModal(true);
                          }}>Process Salary</Button>
                        )}
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-9 w-9 rounded-xl text-blue-500 hover:text-blue-600 hover:bg-blue-50" 
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
            <tfoot className="bg-muted/40 border-t-2 border-border">
              <tr>
                <td colSpan={2} className="px-6 py-6 text-xs font-black text-muted-foreground uppercase tracking-widest">Aggregate Monthly Payout:</td>
                <td className="px-6 py-6">
                  <span className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg shadow-emerald-500/20">
                    ₨ {((staff ?? []).reduce((acc, s) => {
                      const latestPayroll = s?.payrollHistory?.[(s?.payrollHistory?.length ?? 0) - 1];
                      return acc + ((latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0)) || 0);
                    }, 0) || 0).toLocaleString()}
                  </span>
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
