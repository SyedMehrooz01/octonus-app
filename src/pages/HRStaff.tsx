import React, { useState, useEffect, useMemo, memo, Suspense, lazy, useCallback } from "react";
import { format, subMonths, isWithinInterval, parseISO } from "date-fns";
import {
  Users, CheckCircle, XCircle, DollarSign, Plus, Download,
  Search, Edit, Trash2, Mail, Phone, MapPin, Calendar,
  Clock, BarChart3, Bell, UserPlus, FileText,
  PieChart as PieChartIcon, Receipt, TrendingDown, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import * as hrService from "@/services/hrService";
import * as financeService from "@/services/financeService";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from "recharts";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Lazy load HR sub-components
const HRProfiles = lazy(() => import("@/components/hr/HRProfiles"));
const HRAttendance = lazy(() => import("@/components/hr/HRAttendance"));
const HRPayroll = lazy(() => import("@/components/hr/HRPayroll"));
const HRLeaves = lazy(() => import("@/components/hr/HRLeaves"));
const HRPerformance = lazy(() => import("@/components/hr/HRPerformance"));
const HROvertime = lazy(() => import("@/components/hr/HROvertime"));
const HRAdvances = lazy(() => import("@/components/hr/HRAdvances"));
const HROutsideWorkers = lazy(() => import("@/components/hr/HROutsideWorkers"));
const HRReports = lazy(() => import("@/components/hr/HRReports"));

const HRStaff = () => {
  const { user, canDo: authCanDo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [overtime, setOvertime] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [outsideWorkers, setOutsideWorkers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [outsideAssignments, setOutsideAssignments] = useState<any[]>([]);
  const [outsidePayments, setOutsidePayments] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [outsideViewMode, setOutsideViewMode] = useState<"list" | "grid">("list");
  
  // Modals visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTotalLedgerModal, setShowTotalLedgerModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showRightsModal, setShowRightsModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAddOutsideModal, setShowAddOutsideModal] = useState(false);
  const [showAssignEventModal, setShowAssignEventModal] = useState(false);
  const [showOutsidePaymentModal, setShowOutsidePaymentModal] = useState(false);

  // Selected entities for modals
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [editStaff, setEditStaff] = useState<any>(null);
  const [ledgerStaff, setLedgerStaff] = useState<any>(null);
  const [rightsStaff, setRightsStaff] = useState<any>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [editAttendanceId, setEditAttendanceId] = useState<string | null>(null);

  // Form states

  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "", department: "Operations", salary: "", phone: "", address: "", emergencyContact: "", joinDate: format(new Date(), 'yyyy-MM-dd') });
  const [attendanceForm, setAttendanceForm] = useState({ empId: "", date: format(new Date(), 'yyyy-MM-dd'), status: "present", checkIn: "09:00", checkOut: "18:00" });
  const [bulkStatus, setBulkStatus] = useState("present");
  const [payrollForm, setPayrollForm] = useState({ staffId: "", month: format(new Date(), 'MMMM yyyy'), basicSalary: 0, allowances: { houseRent: 0, medical: 0, conveyance: 0, special: 0 }, overtime: { hours: 0, pay: 0 }, deductions: { tax: 0, eobi: 0, pessi: 0, loans: 0, late: 0, absences: 0 }, netPay: 0 });
  const [leaveForm, setLeaveForm] = useState({ empId: "", type: "Annual", start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd'), reason: "" });
  const [performanceForm, setPerformanceForm] = useState({ empId: "", rating: 5, notes: "" });
  const [overtimeForm, setOvertimeForm] = useState({ empId: "", hours: "", date: format(new Date(), 'yyyy-MM-dd') });
  const [advanceForm, setAdvanceForm] = useState({ empId: "", amount: "", reason: "" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [newOutsideWorker, setNewOutsideWorker] = useState({ name: "", type: "Freelancer", skill: "Decorator", phone: "", rate: "", rateType: "per event" });
  const [assignmentForm, setAssignmentForm] = useState({ workerId: "", eventName: "", date: format(new Date(), 'yyyy-MM-dd'), amount: 0 });
  const [outsidePaymentForm, setOutsidePaymentForm] = useState({ workerId: "", amount: 0, date: format(new Date(), 'yyyy-MM-dd'), method: "cash" });

  const fetchHRData = useCallback(async (isMounted = true, retry = true) => {
    if (isMounted) {
      setLoading(true);
      setError(null);
    }
    try {
      const [
        staffDataRaw,
        attendDataRaw,
        leaveDataRaw,
        announceDataRaw,
        overtimeDataRaw,
        advanceDataRaw,
        outsideDataRaw,
        assignDataRaw,
        payDataRaw
      ] = await Promise.all([
        hrService.getStaff().catch(err => { console.error("Staff fetch error:", err); return []; }),
        hrService.getAttendance().catch(err => { console.error("Attendance fetch error:", err); return []; }),
        hrService.getLeaves().catch(err => { console.error("Leaves fetch error:", err); return []; }),
        hrService.getAnnouncements().catch(err => { console.error("Announcements fetch error:", err); return []; }),
        hrService.getOvertime().catch(err => { console.error("Overtime fetch error:", err); return []; }),
        hrService.getAdvanceSalary().catch(err => { console.error("AdvanceSalary fetch error:", err); return []; }),
        hrService.getOutsideWorkers().catch(err => { console.error("OutsideWorkers fetch error:", err); return []; }),
        hrService.getWorkerAssignments().catch(err => { console.error("WorkerAssignments fetch error:", err); return []; }),
        hrService.getWorkerPayments().catch(err => { console.error("WorkerPayments fetch error:", err); return []; })
      ]);

      if (!isMounted) return;

      const staffData = staffDataRaw ?? [];
      const attendData = attendDataRaw ?? [];
      const leaveData = leaveDataRaw ?? [];
      const announceData = announceDataRaw ?? [];
      const overtimeData = overtimeDataRaw ?? [];
      const advanceData = advanceDataRaw ?? [];
      const outsideData = outsideDataRaw ?? [];
      const assignData = assignDataRaw ?? [];
      const payData = payDataRaw ?? [];

      const staffWithDetails = (staffData ?? []).map(s => ({
        ...s,
        attendance: 95, 
        performance: [4, 5, 4, 5, 5],
        payrollHistory: [],
        performanceRecords: []
      }));

      setStaff(staffWithDetails ?? []);
      setAttendance((attendData ?? []).map(a => ({
        ...a,
        name: (staffData ?? []).find(s => s.id === a.employee_id)?.name || "Unknown",
        checkIn: a.check_in,
        checkOut: a.check_out
      })) ?? []);
      setLeaves((leaveData ?? []).map(l => ({
        ...l,
        type: l.leave_type,
        name: (staffData ?? []).find(s => s.id === l.employee_id)?.name || "Unknown",
        start: l.start_date,
        end: l.end_date
      })) ?? []);

      setAnnouncements(announceData ?? []);
      setOvertime((overtimeData ?? []).map(o => ({
        ...o,
        name: (staffData ?? []).find(s => s.id === o.employee_id)?.name || "Unknown"
      })) ?? []);
      setAdvances((advanceData ?? []).map(a => ({
        ...a,
        name: (staffData ?? []).find(s => s.id === a.employee_id)?.name || "Unknown"
      })) ?? []);
      setOutsideWorkers(outsideData ?? []);
      setOutsideAssignments((assignData ?? []).map(a => ({
        ...a,
        eventName: a.event_name,
        workerId: a.worker_id
      })) ?? []);
      setOutsidePayments((payData ?? []).map(p => ({
        ...p,
        workerId: p.worker_id
      })) ?? []);
      setPayroll(payData ?? []);
      setError(null);
    } catch (err: any) {
      console.error("HRStaff fetchHRData unexpected error:", err);
      if (retry) {
        setTimeout(() => fetchHRData(isMounted, false), 2000);
        return;
      }
      if (isMounted) {
        // We don't set error here to avoid showing the blank error screen, 
        // as per instructions: "If ANY error occurs show the data that loaded successfully, not a blank error screen"
        console.warn("Failed to fetch some HR data, showing partial/empty results");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchHRData(isMounted);
    return () => { isMounted = false; };
  }, [fetchHRData]);

  const canDo = useCallback((action: any) => {
    return authCanDo(action);
  }, [authCanDo]);

  const statusColor = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': case 'present': case 'approved': case 'paid': return 'bg-emerald-500 text-white';
      case 'absent': case 'rejected': case 'inactive': return 'bg-rose-500 text-white';
      case 'late': case 'pending': return 'bg-amber-500 text-white';
      case 'half-day': return 'bg-blue-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  }, []);

  const numberToWords = useCallback((num: number) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
    return str;
  }, []);

  const calculateTax = useCallback((annualSalary: number) => {
    if (annualSalary <= 600000) return 0;
    if (annualSalary <= 1200000) return (annualSalary - 600000) * 0.05 / 12;
    return (annualSalary - 1200000) * 0.15 / 12 + 2500;
  }, []);

  // Handler functions
  const handleAddStaff = useCallback(async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.salary) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      await hrService.addStaff({
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        department: newStaff.department,
        salary: Number(newStaff.salary),
        phone: newStaff.phone,
        address: newStaff.address,
        emergency_contact: newStaff.emergencyContact,
        join_date: newStaff.joinDate,
        status: 'active'
      });
      await fetchHRData(true);
      setShowAddModal(false);
      setNewStaff({ name: "", email: "", role: "", department: "Operations", salary: "", phone: "", address: "", emergencyContact: "", joinDate: format(new Date(), 'yyyy-MM-dd') });
      toast.success("New staff member registered");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [newStaff, fetchHRData]);

  const handleUpdateStaff = useCallback(async () => {
    if (!editStaff) return;
    setSaving(true);
    try {
      await hrService.updateStaff(editStaff.id, {
        name: editStaff.name,
        email: editStaff.email,
        role: editStaff.role,
        department: editStaff.department,
        salary: editStaff.salary,
        status: editStaff.status,
        phone: editStaff.phone,
        address: editStaff.address,
        emergency_contact: editStaff.emergency_contact || editStaff.emergencyContact
      });
      await fetchHRData(true);
      setShowEditModal(false);
      toast.success("Staff profile updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [editStaff, fetchHRData]);

  const handleDeleteStaff = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await hrService.deleteStaff(id);
      await fetchHRData(true);
      setShowDeleteConfirm(null);
      toast.success("Staff record removed");
    } catch (err: any) {
      toast.error("Failed to delete staff record");
    } finally {
      setSaving(false);
    }
  }, [fetchHRData]);

  const handleMarkAttendance = useCallback(async () => {
    if (!attendanceForm.empId) return;
    setSaving(true);
    try {
      await hrService.upsertAttendance({
        employee_id: attendanceForm.empId,
        date: attendanceForm.date,
        status: attendanceForm.status,
        check_in: attendanceForm.checkIn,
        check_out: attendanceForm.checkOut
      });
      await fetchHRData(true);
      setShowAttendanceModal(false);
      toast.success("Attendance marked");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [attendanceForm, fetchHRData]);

  const handleBulkAttendance = useCallback(async () => {
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const records = (staff ?? []).map(s => ({
        employee_id: s.id,
        date: today,
        status: bulkStatus,
        check_in: '09:00',
        check_out: '18:00'
      }));
      await hrService.upsertAttendance(records);

      await fetchHRData(true);
      setShowBulkAttendanceModal(false);
      toast.success(`All staff marked as ${bulkStatus}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [staff, bulkStatus, fetchHRData]);

  const handleMarkAllPresent = useCallback(async () => {
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const records = (staff ?? []).map(s => ({
        employee_id: s.id,
        date: today,
        status: 'present',
        check_in: '09:00',
        check_out: '18:00'
      }));
      await hrService.upsertAttendance(records);

      await fetchHRData(true);
      toast.success("All staff marked as present for today");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [staff, fetchHRData]);

  const handleUpdateAttendance = useCallback(async (id: string, status: string) => {
    try {
      await hrService.updateAttendance(id, status);
      await fetchHRData(true);
      setEditAttendanceId(null);
      toast.success("Attendance updated");
    } catch (err: any) {
      toast.error("Failed to update attendance");
    }
  }, [fetchHRData]);

  const handleAutoAbsent = useCallback(async () => {
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const markedEmpIds = (attendance ?? []).filter(a => a.date === today).map(a => a.employee_id);
      const unmarkedStaff = (staff ?? []).filter(s => !markedEmpIds.includes(s.id));
      if ((unmarkedStaff ?? []).length === 0) {
        toast.info("No unmarked staff found for today");
        return;
      }
      const records = (unmarkedStaff ?? []).map(s => ({
        employee_id: s.id,
        date: today,
        status: 'absent'
      }));
      await hrService.upsertAttendance(records);
      await fetchHRData(true);
      toast.success(`${(unmarkedStaff ?? []).length} staff members marked as absent`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [attendance, staff, fetchHRData]);



  const handleMarkAsPaid = useCallback(async () => {
    setSaving(true);
    try {
      await financeService.addLedgerEntry({
        category: 'Payroll',
        description: `Salary Payment - ${payrollForm.month}`,
        amount: payrollForm.netPay,
        type: 'expense',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'completed'
      });
      toast.success("Payroll processed and ledger updated");
      setShowPayrollModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [payrollForm]);

  const handleRequestLeave = useCallback(async () => {
    if (!leaveForm.empId || !leaveForm.reason) return;
    setSaving(true);
    try {
      await hrService.addLeave({
        employee_id: leaveForm.empId,
        leave_type: leaveForm.type,
        start_date: leaveForm.start,
        end_date: leaveForm.end,
        reason: leaveForm.reason,
        status: 'pending'
      });
      await fetchHRData(true);
      setShowLeaveRequestModal(false);
      setLeaveForm({ empId: "", type: "Annual", start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd'), reason: "" });
      toast.success("Leave request submitted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [leaveForm, fetchHRData]);

  const handleLeaveAction = useCallback(async (id: string, status: string) => {
    setSaving(true);
    try {
      await hrService.updateLeaveStatus(id, status);
      await fetchHRData(true);
      toast.success(`Leave request ${status}`);
    } catch (err: any) {
      toast.error("Failed to update leave request");
    } finally {
      setSaving(false);
    }
  }, [fetchHRData]);


  const handleAddPerformance = useCallback(async () => {
    if (!performanceForm.empId) return;
    setSaving(true);
    try {
      await hrService.addPerformance({
        employee_id: performanceForm.empId,
        rating: performanceForm.rating,
        notes: performanceForm.notes,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      await fetchHRData(true);
      setShowPerformanceModal(false);
      toast.success("Performance rating saved");
    } catch (err: any) {
      toast.error("Failed to save performance");
    } finally {
      setSaving(false);
    }
  }, [performanceForm, fetchHRData]);

  const handleLogOvertime = useCallback(async () => {
    if (!overtimeForm.empId || !overtimeForm.hours) return;
    setSaving(true);
    try {
      await hrService.addOvertime({
        employee_id: overtimeForm.empId,
        hours: Number(overtimeForm.hours),
        date: overtimeForm.date,
        status: 'pending'
      });
      await fetchHRData(true);
      setShowOvertimeModal(false);
      toast.success("Overtime logged for approval");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [overtimeForm, fetchHRData]);

  const handleRequestAdvance = useCallback(async () => {
    if (!advanceForm.empId || !advanceForm.amount) return;
    setSaving(true);
    try {
      await hrService.addAdvanceSalary({
        employee_id: advanceForm.empId,
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason,
        status: 'pending'
      });
      await fetchHRData(true);
      setShowAdvanceModal(false);
      toast.success("Advance request submitted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [advanceForm, fetchHRData]);

  const handleAddAnnouncement = useCallback(async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    setSaving(true);
    try {
      await hrService.addAnnouncement({
        title: newAnnouncement.title,
        message: newAnnouncement.content
      });
      await fetchHRData(true);
      setShowAnnounceModal(false);
      setNewAnnouncement({ title: "", content: "" });
      toast.success("Announcement posted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [newAnnouncement, fetchHRData]);

  const handleUpdateRights = useCallback(async (id: string, newRights: string[]) => {
    setSaving(true);
    try {
      await hrService.updateStaff(id, { rights: newRights });
      await fetchHRData(true);
      setShowRightsModal(false);
      toast.success("Permissions updated");
    } catch (err: any) {
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }, [fetchHRData]);

  const handleAddOutsideWorker = useCallback(async () => {
    if (!newOutsideWorker.name || !newOutsideWorker.phone) return;
    setSaving(true);
    try {
      await hrService.addOutsideWorker({
        name: newOutsideWorker.name,
        type: newOutsideWorker.type,
        skill: newOutsideWorker.skill,
        phone: newOutsideWorker.phone,
        rate: Number(newOutsideWorker.rate),
        rate_type: newOutsideWorker.rateType
      });
      await fetchHRData(true);
      setShowAddOutsideModal(false);
      toast.success("Outside worker added");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [newOutsideWorker, fetchHRData]);

  const handleAssignToEvent = useCallback(async () => {
    if (!assignmentForm.workerId || !assignmentForm.eventName) return;
    setSaving(true);
    try {
      await hrService.addWorkerAssignment({
        worker_id: assignmentForm.workerId,
        event_name: assignmentForm.eventName,
        date: assignmentForm.date,
        amount: assignmentForm.amount,
        status: 'assigned'
      });
      await fetchHRData(true);
      setShowAssignEventModal(false);
      toast.success("Worker assigned to event");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [assignmentForm, fetchHRData]);

  const handleOutsidePayment = useCallback(async () => {
    if (!outsidePaymentForm.workerId || !outsidePaymentForm.amount) return;
    setSaving(true);
    try {
      await hrService.addWorkerPayment({
        worker_id: outsidePaymentForm.workerId,
        amount: outsidePaymentForm.amount,
        date: outsidePaymentForm.date,
        method: outsidePaymentForm.method
      });
      await fetchHRData(true);
      setShowOutsidePaymentModal(false);
      toast.success("Payment recorded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [outsidePaymentForm, fetchHRData]);

  const prefillPayrollForm = useCallback((staffMember: any) => {
    const basic = staffMember?.salary || 0;
    const tax = calculateTax(basic * 12);
    setPayrollForm({
      ...payrollForm,
      staffId: staffMember.id,
      basicSalary: basic,
      deductions: { ...payrollForm.deductions, tax, eobi: basic * 0.01 }
    });
  }, [calculateTax, payrollForm]);

  const handleExportAttendance = useCallback(() => {
    const data = attendance.map(a => ({
      "Name": a.name,
      "Date": a.date,
      "Status": a.status,
      "In": a.checkIn || "-",
      "Out": a.checkOut || "-"
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `Attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Attendance report exported");
  }, [attendance]);

  const handleExportPayroll = useCallback(() => {
    const data = staff.map(s => ({
      "Name": s.name,
      "Basic Salary": s.salary,
      "Month": format(new Date(), 'MMMM yyyy')
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    XLSX.writeFile(workbook, `Payroll_${format(new Date(), 'MMM_yyyy')}.xlsx`);
    toast.success("Payroll report exported");
  }, [staff]);

  const handleExportLedger = useCallback(() => {
    if (!ledgerStaff) return;
    const data = (ledgerStaff.payrollHistory || []).map((h: any) => ({
      "Date": h.date,
      "Month": h.month,
      "Net Paid": h.netPay
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    XLSX.writeFile(workbook, `Ledger_${ledgerStaff.name}.xlsx`);
    toast.success("Staff ledger exported");
  }, [ledgerStaff]);

  const handleExportLedgerPDF = useCallback(() => {
    if (!ledgerStaff) return;
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text(`Staff Ledger - ${ledgerStaff.name}`, 14, 20);
    pdf.setFontSize(10);
    pdf.text(`Department: ${ledgerStaff.department} | Role: ${ledgerStaff.role}`, 14, 28);
    const tableData = (ledgerStaff.payrollHistory || []).map((h: any) => [
      h.date, h.month, `Rs. ${(h.netPay || 0).toLocaleString()}`
    ]);
    autoTable(pdf, {
      startY: 35,
      head: [['Date', 'Month', 'Net Paid']],
      body: tableData.length > 0 ? tableData : [['No records', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [45, 106, 79] }
    });
    pdf.save(`Ledger_${ledgerStaff.name}.pdf`);
    toast.success("Ledger PDF exported");
  }, [ledgerStaff]);

  const handleGeneratePayslip = useCallback((staff: any, payroll: any) => {
    setSelectedPayslip({ staff, payroll });
    setShowPayslipModal(true);
  }, []);

  const handlePrintCard = useCallback((staffMember: any) => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 54] });
    pdf.setFillColor(45, 106, 79);
    pdf.rect(0, 0, 85, 18, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OCTONUS SOLUTIONS', 42.5, 7, { align: 'center' });
    pdf.setFontSize(6);
    pdf.text('EMPLOYEE ID CARD', 42.5, 12, { align: 'center' });
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(staffMember.name || 'N/A', 42.5, 26, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(staffMember.role || 'Staff', 42.5, 32, { align: 'center' });
    pdf.text(`Dept: ${staffMember.department || 'N/A'}`, 42.5, 38, { align: 'center' });
    pdf.text(`ID: ${staffMember.id?.slice(0, 8).toUpperCase() || 'N/A'}`, 42.5, 44, { align: 'center' });
    pdf.setFillColor(45, 106, 79);
    pdf.rect(0, 49, 85, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(5);
    pdf.text('octonussolutions.com.pk | +92-331-3195292', 42.5, 52, { align: 'center' });
    pdf.save(`ID_Card_${staffMember.name?.replace(/\s+/g, '_')}.pdf`);
    toast.success(`ID Card generated for ${staffMember.name}`);
  }, []);

  const handlePrintWorkerCard = useCallback((worker: any) => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 54] });
    pdf.setFillColor(45, 106, 79);
    pdf.rect(0, 0, 85, 18, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OCTONUS SOLUTIONS', 42.5, 7, { align: 'center' });
    pdf.setFontSize(6);
    pdf.text('WORKER ID CARD', 42.5, 12, { align: 'center' });
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(worker.name || 'N/A', 42.5, 26, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(worker.skill || 'Worker', 42.5, 32, { align: 'center' });
    pdf.text(`Type: ${worker.type || 'N/A'}`, 42.5, 38, { align: 'center' });
    pdf.text(`ID: ${worker.id?.slice(0, 8).toUpperCase() || 'N/A'}`, 42.5, 44, { align: 'center' });
    pdf.setFillColor(45, 106, 79);
    pdf.rect(0, 49, 85, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(5);
    pdf.text('octonussolutions.com.pk | +92-331-3195292', 42.5, 52, { align: 'center' });
    pdf.save(`ID_Card_Worker_${worker.name?.replace(/\s+/g, '_')}.pdf`);
    toast.success(`ID Card generated for ${worker.name}`);
  }, []);

  const handleOvertimeAction = useCallback(async (id: string, status: string) => {
    try {
      await hrService.updateOvertimeStatus(id, status);
      await fetchHRData(true);
      toast.success(`Overtime ${status}`);
    } catch (err: any) {
      toast.error("Failed to update overtime status");
    }
  }, [fetchHRData]);

  const handleAdvanceAction = useCallback(async (id: string, status: string) => {
    try {
      await hrService.updateAdvanceSalaryStatus(id, status);
      await fetchHRData(true);
      toast.success(`Advance ${status}`);
    } catch (err: any) {
      toast.error("Failed to update advance status");
    }
  }, [fetchHRData]);


  const filteredStaff = useMemo(() => (staff ?? []).filter(s =>
    (s?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s?.id ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s?.department ?? "").toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);

  const monthlyPayrollTotal = useMemo(() => {
    return (staff ?? []).reduce((sum, s) => sum + (Number(s?.salary ?? 0)), 0);
  }, [staff]);

  const leaveRequestsCount = useMemo(() => {
    return (leaves ?? []).filter(l => l.status === 'pending').length;
  }, [leaves]);

  const presentCount = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return (attendance ?? []).filter(a => a.date === today && a.status === 'present').length;
  }, [attendance]);

  const handleExportTotalLedgerExcel = useCallback(() => {
    const data = staff.map(s => ({
      "ID": s.id,
      "Name": s.name,
      "Salary": s.salary
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Total Payroll");
    XLSX.writeFile(workbook, "Total_Payroll_Ledger.xlsx");
  }, [staff]);

  const handleExportTotalLedgerPDF = useCallback(() => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('Total Payroll Ledger - Octonus Solutions', 14, 20);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 28);
    const tableData = staff.map(s => [
      s.name, s.department, s.role, `Rs. ${(s.salary || 0).toLocaleString()}`
    ]);
    autoTable(pdf, {
      startY: 35,
      head: [['Name', 'Department', 'Role', 'Monthly Salary']],
      body: tableData.length > 0 ? tableData : [['No staff found', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [45, 106, 79] },
      foot: [['', '', 'TOTAL', `Rs. ${monthlyPayrollTotal.toLocaleString()}`]],
      footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] }
    });
    pdf.save(`Total_Payroll_Ledger_${format(new Date(), 'MMM_yyyy')}.pdf`);
    toast.success("Total Ledger PDF exported");
  }, [staff, monthlyPayrollTotal]);

  const handleExportEOBIReport = useCallback(() => {
    const data = staff.map(s => ({
      'Employee Name': s.name,
      'CNIC': 'N/A',
      'Department': s.department,
      'Basic Salary': s.salary,
      'EOBI Contribution (1%)': Math.round((s.salary || 0) * 0.01),
      'Month': format(new Date(), 'MMMM yyyy')
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EOBI Report');
    XLSX.writeFile(workbook, `EOBI_Report_${format(new Date(), 'MMM_yyyy')}.xlsx`);
    toast.success("EOBI Report exported");
  }, [staff]);

  const handleExportTaxReport = useCallback(() => {
    const data = staff.map(s => ({
      'Employee Name': s.name,
      'Department': s.department,
      'Monthly Salary': s.salary,
      'Annual Salary': (s.salary || 0) * 12,
      'Monthly Tax': Math.round(calculateTax((s.salary || 0) * 12)),
      'Month': format(new Date(), 'MMMM yyyy')
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Report');
    XLSX.writeFile(workbook, `Tax_Report_${format(new Date(), 'MMM_yyyy')}.xlsx`);
    toast.success("Tax Report exported");
  }, [staff, calculateTax]);

  if (loading && staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Fetching HR data securely...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-24 max-w-full overflow-hidden">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="font-bold text-xs sm:text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchHRData(true)} className="ml-auto text-rose-600 hover:bg-rose-100 font-black uppercase text-[10px] tracking-widest">Retry</Button>
        </div>
      )}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-xl sm:text-3xl font-black text-[#0f172a] tracking-tight uppercase italic">Workforce Management</h1>
          <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Human Resources Portal</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button onClick={() => setShowTotalLedgerModal(true)} variant="outline" className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Total Ledger</span>
          </Button>
          <Button onClick={() => setShowAnnounceModal(true)} variant="outline" className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm gap-2 text-xs sm:text-sm">
            <Bell className="h-4 w-4" /> <span className="hidden sm:inline">Announce</span>
          </Button>
          {canDo("add") && (
            <Button onClick={() => setShowAddModal(true)} className="h-9 sm:h-11 px-4 sm:px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 gap-2 text-xs sm:text-sm">
              <UserPlus className="h-4 w-4" /> Add Staff
            </Button>
          )}
        </div>
      </div>

        {(announcements ?? []).length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 text-primary animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{(announcements ?? [])[0]?.title ?? "No Title"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{(announcements ?? [])[0]?.message ?? ""}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          {[
            { label: "Active Workforce", value: (staff ?? []).filter(s => s.status === 'active').length.toString(), icon: Users, color: "from-blue-500 to-blue-700", shadow: "shadow-blue-500/20", sub: "Registered Staff" },
            { label: "Present Today", value: presentCount.toString(), icon: Clock, color: "from-emerald-500 to-emerald-700", shadow: "shadow-emerald-500/20", sub: "Attendance Recorded" },
            { label: "Monthly Payroll", value: `₨ ${monthlyPayrollTotal.toLocaleString()}`, icon: Wallet, color: "from-rose-500 to-rose-700", shadow: "shadow-rose-500/20", sub: "Estimated Total" },
            { label: "Leave Requests", value: leaveRequestsCount.toString(), icon: FileText, color: "from-amber-500 to-amber-700", shadow: "shadow-amber-500/20", sub: "Pending Approval" },
          ].map((card, i) => (
            <div key={card.label} className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${card.color} p-4 sm:p-6 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
              <div className="relative z-10 flex flex-col gap-2 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                  <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-80 truncate">{card.label}</p>
                  <p className="text-base sm:text-2xl font-black truncate tracking-tight">{card.value}</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <card.icon size={80} className="text-white sm:size-[120px]" />
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="profiles" className="w-full space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 w-full">
              <TabsList className="inline-flex h-12 sm:h-14 items-center justify-start rounded-xl sm:rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200 min-w-max">
                <TabsTrigger value="profiles" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Profiles</TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Attendance</TabsTrigger>
                <TabsTrigger value="payroll" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Payroll</TabsTrigger>
                <TabsTrigger value="advances" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Advances</TabsTrigger>
                <TabsTrigger value="overtime" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Overtime</TabsTrigger>
                <TabsTrigger value="outside" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Outside</TabsTrigger>
                <TabsTrigger value="leaves" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Leaves</TabsTrigger>
                <TabsTrigger value="performance" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Ratings</TabsTrigger>
                <TabsTrigger value="reports" className="rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">Reports</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
            <TabsContent value="profiles">
              <HRProfiles 
                viewMode={viewMode} setViewMode={setViewMode} search={search} setSearch={setSearch}
                filteredStaff={filteredStaff} setSelectedStaff={setSelectedStaff} setShowViewModal={setShowViewModal}
                handlePrintCard={handlePrintCard} canDo={canDo} setEditStaff={setEditStaff}
                setShowEditModal={setShowEditModal} setLedgerStaff={setLedgerStaff} setShowLedgerModal={setShowLedgerModal}
                user={user} setRightsStaff={setRightsStaff} setShowRightsModal={setShowRightsModal}
                setShowDeleteConfirm={setShowDeleteConfirm} statusColor={statusColor}
                showAddModal={showAddModal} setShowAddModal={setShowAddModal}
                newStaff={newStaff} setNewStaff={setNewStaff} handleAddStaff={handleAddStaff}
                showEditModal={showEditModal} editStaff={editStaff} handleUpdateStaff={handleUpdateStaff}
                showViewModal={showViewModal} selectedStaff={selectedStaff}
                showLedgerModal={showLedgerModal} ledgerStaff={ledgerStaff}
                handleExportLedger={handleExportLedger} handleExportLedgerPDF={handleExportLedgerPDF}
                showRightsModal={showRightsModal} rightsStaff={rightsStaff} handleUpdateRights={handleUpdateRights}
                showDeleteConfirm={showDeleteConfirm} handleDeleteStaff={handleDeleteStaff}
              />
            </TabsContent>
            <TabsContent value="attendance">
              <HRAttendance 
                canDo={canDo} showAttendanceModal={showAttendanceModal} setShowAttendanceModal={setShowAttendanceModal}
                attendanceForm={attendanceForm} setAttendanceForm={setAttendanceForm} staff={staff}
                handleMarkAttendance={handleMarkAttendance} showBulkAttendanceModal={showBulkAttendanceModal}
                setShowBulkAttendanceModal={setShowBulkAttendanceModal} bulkStatus={bulkStatus}
                setBulkStatus={setBulkStatus} handleBulkAttendance={handleBulkAttendance}
                handleMarkAllPresent={handleMarkAllPresent} handleAutoAbsent={handleAutoAbsent}
                handleExportAttendance={handleExportAttendance} attendance={attendance}
                editAttendanceId={editAttendanceId} setEditAttendanceId={setEditAttendanceId}
                handleUpdateAttendance={handleUpdateAttendance} statusColor={statusColor}
              />
            </TabsContent>
            <TabsContent value="payroll">
              <HRPayroll 
                canDo={canDo} handleExportPayroll={handleExportPayroll} staff={staff}
                prefillPayrollForm={prefillPayrollForm} showPayrollModal={showPayrollModal} 
                setShowPayrollModal={setShowPayrollModal} payrollForm={payrollForm} 
                setPayrollForm={setPayrollForm} handleMarkAsPaid={handleMarkAsPaid}
                handleGeneratePayslip={handleGeneratePayslip} statusColor={statusColor}
              />
            </TabsContent>
            <TabsContent value="leaves">
              <HRLeaves 
                leaves={leaves} canDo={canDo} showLeaveRequestModal={showLeaveRequestModal}
                setShowLeaveRequestModal={setShowLeaveRequestModal} leaveForm={leaveForm}
                setLeaveForm={setLeaveForm} staff={staff} handleRequestLeave={handleRequestLeave}
                handleLeaveAction={handleLeaveAction} statusColor={statusColor}
              />
            </TabsContent>
            <TabsContent value="performance">
              <HRPerformance 
                canDo={canDo} showPerformanceModal={showPerformanceModal} 
                setShowPerformanceModal={setShowPerformanceModal} staff={staff} 
                statusColor={statusColor} performanceForm={performanceForm}
                setPerformanceForm={setPerformanceForm} handleAddPerformance={handleAddPerformance}
              />
            </TabsContent>
            <TabsContent value="overtime">
              <HROvertime 
                canDo={canDo} setShowOvertimeModal={setShowOvertimeModal} overtime={overtime}
                handleOvertimeAction={handleOvertimeAction} statusColor={statusColor}
              />
            </TabsContent>
            <TabsContent value="advances">
              <HRAdvances 
                canDo={canDo} setShowAdvanceModal={setShowAdvanceModal} advances={advances}
                handleAdvanceAction={handleAdvanceAction} statusColor={statusColor}
              />
            </TabsContent>
            <TabsContent value="outside">
              <HROutsideWorkers 
                outsideViewMode={outsideViewMode} setOutsideViewMode={setOutsideViewMode} search={search} setSearch={setSearch}
                canDo={canDo} setShowAddOutsideModal={setShowAddOutsideModal} setShowAssignEventModal={setShowAssignEventModal}
                setShowOutsidePaymentModal={setShowOutsidePaymentModal} outsideWorkers={outsideWorkers}
                handlePrintWorkerCard={handlePrintWorkerCard} outsideAssignments={outsideAssignments}
                setOutsideAssignments={setOutsideAssignments} setOutsidePaymentForm={setOutsidePaymentForm}
                outsidePayments={outsidePayments}
              />
            </TabsContent>
            <TabsContent value="reports">
              <HRReports handleExportEOBIReport={handleExportEOBIReport} handleExportTaxReport={handleExportTaxReport} />
            </TabsContent>
          </Suspense>
        </Tabs>

        {/* Announcements Modal (Keep here as it's global to HR) */}
        <Dialog open={showAnnounceModal} onOpenChange={setShowAnnounceModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Post Company Announcement</DialogTitle>
              <DialogDescription>This will be visible to all logged-in staff members.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="e.g. Ramadan Office Hours" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea placeholder="Write your announcement here..." value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAnnounceModal(false)}>Cancel</Button>
              <Button onClick={() => handleAddAnnouncement()}>Post Announcement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Total Ledger Modal (Keep here as it's global to HR) */}
        <Dialog open={showTotalLedgerModal} onOpenChange={setShowTotalLedgerModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div><DialogTitle className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Total Payroll Ledger Dashboard</DialogTitle></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => handleExportTotalLedgerExcel()}><Download className="h-4 w-4" /> Excel</Button><Button variant="outline" size="sm" onClick={() => handleExportTotalLedgerPDF()}><FileText className="h-4 w-4" /> PDF</Button></div>
              </div>
            </DialogHeader>
            <div className="py-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[ 
                  { label: "Total Paid (Month)", value: `₨ ${monthlyPayrollTotal.toLocaleString()}`, icon: DollarSign, color: "text-success", bg: "bg-success/10" }, 
                  { label: "Total Payments", value: (staff ?? []).reduce((acc, s) => acc + (s?.payrollHistory ?? []).length, 0), icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" }, 
                  { label: "Pending Payments", value: (staff ?? []).filter(s => !(s?.payrollHistory ?? []).some(h => h?.month === format(new Date(), 'MMMM yyyy'))).length, icon: Clock, color: "text-warning", bg: "bg-warning/10" }, 
                  { label: "Total Advances", value: `₨ ${advances.reduce((acc, a) => acc + (a.status === 'approved' ? a.amount : 0), 0).toLocaleString()}`, icon: Receipt, color: "text-destructive", bg: "bg-destructive/10" }, 
                  { label: "Total Deductions", value: `₨ 0`, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" } 
                ].map((card, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center gap-3 mb-2"><div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`h-4 w-4 ${card.color}`} /></div><p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{card.label}</p></div><p className={`text-xl font-bold ${card.color}`}>{card.value}</p></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm"><h4 className="text-sm font-bold mb-6 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Monthly Payroll Trend</h4><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={ Array.from({ length: 6 }).map((_, i) => { const date = subMonths(new Date(), 5 - i); const total = (staff ?? []).reduce((acc, s) => acc + (s.salary || 0), 0); return { month: format(date, 'MMM yyyy'), total }; }) }><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₨${v/1000}k`} /><Tooltip formatter={(v: any) => [`₨ ${(v || 0).toLocaleString()}`, 'Total Payroll']} /><Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm"><h4 className="text-sm font-bold mb-6 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> Salary Distribution</h4><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ ["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(dept => ({ name: dept, value: (staff ?? []).filter(s => s?.department === dept).reduce((acc, s) => acc + (s?.salary ?? 0), 0) })).filter(d => d.value > 0) } cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"].map((color, index) => (<Cell key={`cell-${index}`} fill={color} />))}</Pie><Tooltip formatter={(v: any) => [`₨ ${(v || 0).toLocaleString()}`, 'Salary']} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></div></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowTotalLedgerModal(false)} className="w-full sm:w-auto">Close Dashboard</Button></DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default memo(HRStaff);
