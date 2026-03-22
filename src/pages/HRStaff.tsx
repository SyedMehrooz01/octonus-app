import { useState, useRef, useMemo, useEffect, lazy, Suspense, memo } from "react";
import { 
  Users, Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, 
  DollarSign, Camera, FileText, Calendar, Phone, Mail, MapPin, 
  UserPlus, Download, Star, StarOff, Bell, ShieldCheck, ChevronRight, BarChart3, PieChart as PieChartIcon, Receipt,
  TrendingDown, LayoutDashboard, CalendarDays, Landmark, Package, Settings, LogOut,
  LayoutGrid, List, Printer, Briefcase, BriefcaseBusiness, QrCode, Wallet2, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { numberToWords } from "@/lib/numberToWords";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateTax, 
  calculateEOBI, 
  calculatePESSI, 
  calculateOvertime, 
  getHourlyRate 
} from "@/lib/salaryUtils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Lazy load HR components
const HRProfiles = lazy(() => import("@/components/hr/HRProfiles"));
const HRAttendance = lazy(() => import("@/components/hr/HRAttendance"));
const HRPayroll = lazy(() => import("@/components/hr/HRPayroll"));
const HRLeaves = lazy(() => import("@/components/hr/HRLeaves"));
const HRPerformance = lazy(() => import("@/components/hr/HRPerformance"));
const HROvertime = lazy(() => import("@/components/hr/HROvertime"));
const HRAdvances = lazy(() => import("@/components/hr/HRAdvances"));
const HROutsideWorkers = lazy(() => import("@/components/hr/HROutsideWorkers"));
const HRReports = lazy(() => import("@/components/hr/HRReports"));

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "active" || s === "present" || s === "paid" || s === "approved" || s === "confirmed") return "bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  if (s === "inactive" || s === "absent" || s === "rejected" || s === "cancelled") return "bg-rose-500 hover:bg-rose-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  if (s === "late" || s === "pending" || s === "half-day" || s === "tentative") return "bg-blue-500 hover:bg-blue-600 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
  return "bg-gray-400 hover:bg-gray-500 text-white border-none shadow-sm px-3 py-1 rounded-lg font-bold";
};

const HRStaff = () => {
  const { user, canDo, logAction } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [overtime, setOvertime] = useState<any[]>([]);
  const [outsideWorkers, setOutsideWorkers] = useState<any[]>([]);
  const [outsideAssignments, setOutsideAssignments] = useState<any[]>([]);
  const [outsidePayments, setOutsidePayments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showRightsModal, setShowRightsModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showTotalLedgerModal, setShowTotalLedgerModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [editAttendanceId, setEditAttendanceId] = useState<number | null>(null);

  const [overtimeForm, setOvertimeForm] = useState({
    empId: "", hours: "", date: format(new Date(), "yyyy-MM-dd")
  });
  const [advanceForm, setAdvanceForm] = useState({
    empId: "", amount: "", reason: ""
  });

  const [newStaff, setNewStaff] = useState({ 
    name: "", role: "", department: "", salary: "", phone: "", email: "", 
    address: "", emergencyContact: "", status: "active", joinDate: format(new Date(), "yyyy-MM-dd") 
  });

  const [editStaff, setEditStaff] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [attendanceForm, setAttendanceForm] = useState({
    empId: "", status: "present", date: format(new Date(), "yyyy-MM-dd"), checkIn: "09:00", checkOut: "18:00", lateMinutes: 0
  });
  const [bulkStatus, setBulkStatus] = useState("present");
  const [payrollForm, setPayrollForm] = useState({
    empId: "", month: format(new Date(), "MMMM yyyy"), basicSalary: 0, 
    deductions: { tax: 0, loans: 0, absences: 0, eobi: 0, pessi: 0, late: 0 },
    allowances: { houseRent: 0, medical: 0, conveyance: 0, special: 0 },
    overtime: { hours: 0, pay: 0 }
  });
  const [leaveForm, setLeaveForm] = useState({
    empId: "", type: "Annual", start: format(new Date(), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd"), reason: ""
  });
  const [performanceForm, setPerformanceForm] = useState({
    empId: "", rating: 5, notes: ""
  });
  const [ledgerStaff, setLedgerStaff] = useState<any>(null);
  const [rightsStaff, setRightsStaff] = useState<any>(null);

  const [showAddOutsideModal, setShowAddOutsideModal] = useState(false);
  const [showAssignEventModal, setShowAssignEventModal] = useState(false);
  const [showOutsidePaymentModal, setShowOutsidePaymentModal] = useState(false);
  const [outsideViewMode, setOutsideViewMode] = useState<"cards" | "history">("cards");
  const [newOutsideWorker, setNewOutsideWorker] = useState({
    name: "", type: "Freelancer", skill: "Decorator", phone: "", whatsapp: "", 
    city: "Karachi", area: "", rate: "", rateType: "per event", status: "available"
  });
  const [assignmentForm, setAssignmentForm] = useState({
    workerId: "", eventId: "", eventName: "", date: format(new Date(), "yyyy-MM-dd"), amount: 0
  });
  const [outsidePaymentForm, setOutsidePaymentForm] = useState({
    workerId: "", amount: 0, method: "cash", eventId: ""
  });

  const fetchHRData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role, department, salary, phone, email, joining_date, status, avatar, address, emergency_contact')
        .order('name');
      if (staffError) throw staffError;

      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll_history')
        .select('id, employee_id, month, basic_salary, bonus, allowances, deductions, net_pay, status, payment_date')
        .order('month', { ascending: false });
      if (payrollError) throw payrollError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, employee_id, date, check_in, check_out, status')
        .order('date', { ascending: false });
      if (attendanceError) throw attendanceError;

      const { data: leavesData, error: leavesError } = await supabase
        .from('leaves')
        .select('id, employee_id, leave_type, start_date, end_date, reason, status')
        .order('start_date', { ascending: false });
      if (leavesError) throw leavesError;

      const { data: overtimeData, error: overtimeError } = await supabase
        .from('overtime')
        .select('id, employee_id, date, hours, rate, total, status')
        .order('date', { ascending: false });
      if (overtimeError) throw overtimeError;

      const { data: performanceData, error: performanceError } = await supabase
        .from('performance')
        .select('id, employee_id, month, rating, notes');
      if (performanceError) throw performanceError;

      const { data: advanceData, error: advanceError } = await supabase
        .from('advance_salary')
        .select('id, employee_id, amount, reason, status, request_date, deduction_month')
        .order('request_date', { ascending: false });
      if (advanceError) throw advanceError;

      const { data: announceData, error: announceError } = await supabase
        .from('announcements')
        .select('id, title, message, created_by, created_at')
        .order('created_at', { ascending: false });
      if (announceError) throw announceError;

      const { data: outsideData, error: outsideError } = await supabase
        .from('outside_workers')
        .select('id, name, skill, phone, rate, rate_type, status, rating')
        .order('name');
      if (outsideError) throw outsideError;

      const enrichedStaff = (staffData ?? []).map(s => {
        const s_id = s?.id ?? "";
        return {
          ...s,
          id: s_id,
          name: s?.name ?? "Unknown Staff",
          role: s?.role ?? "No Role",
          department: s?.department ?? "Unassigned",
          salary: s?.salary ?? 0,
          status: s?.status ?? "inactive",
          joinDate: s?.joining_date ?? "N/A",
          payrollHistory: (payrollData ?? [])
            .filter(p => p?.employee_id === s_id)
            .map(p => ({
              ...p,
              id: p?.id ?? 0,
              month: p?.month ?? "N/A",
              netPay: p?.net_pay ?? 0,
              basic: p?.basic_salary ?? 0,
              bonuses: p?.bonus ?? 0,
              allowances: p?.allowances ?? 0,
              deductions: p?.deductions ?? 0,
              status: p?.status ?? "pending",
              date: p?.payment_date ?? "N/A"
            })),
          attendanceRecords: (attendanceData ?? [])
            .filter(a => a?.employee_id === s_id)
            .map(a => ({
              ...a,
              id: a?.id ?? 0,
              date: a?.date ?? "N/A",
              status: a?.status ?? "absent",
              check_in: a?.check_in ?? null,
              check_out: a?.check_out ?? null
            })),
          leaves: (leavesData ?? [])
            .filter(l => l?.employee_id === s_id)
            .map(l => ({
              ...l,
              id: l?.id ?? 0,
              leave_type: l?.leave_type ?? "N/A",
              start_date: l?.start_date ?? "N/A",
              end_date: l?.end_date ?? "N/A",
              status: l?.status ?? "pending"
            })),
          performance: (performanceData ?? [])
            .filter(p => p?.employee_id === s_id)
            .map(p => p?.rating ?? 0),
          performanceNotes: (performanceData ?? [])
            .filter(p => p?.employee_id === s_id)
            .map(p => ({ note: p?.notes ?? "", date: p?.month ?? "N/A" })),
          advances: (advanceData ?? [])
            .filter(a => a?.employee_id === s_id)
            .map(a => ({
              ...a,
              id: a?.id ?? 0,
              amount: a?.amount ?? 0,
              status: a?.status ?? "pending",
              request_date: a?.request_date ?? "N/A"
            })),
          overtime: (overtimeData ?? [])
            .filter(o => o?.employee_id === s_id)
            .map(o => ({
              ...o,
              id: o?.id ?? 0,
              hours: o?.hours ?? 0,
              total: o?.total ?? 0,
              status: o?.status ?? "pending"
            }))
        };
      });

      setStaff(enrichedStaff);
      setAttendance((attendanceData ?? []).map(a => {
        const emp = (staffData ?? []).find(s => s?.id === a?.employee_id);
        return {
          ...a,
          id: a?.id ?? 0,
          name: emp?.name ?? "Unknown",
          empId: a?.employee_id ?? "",
          date: a?.date ?? "N/A",
          status: a?.status ?? "absent",
          checkIn: a?.check_in ?? null,
          checkOut: a?.check_out ?? null
        };
      }));
      setLeaves((leavesData ?? []).map(l => {
        const emp = (staffData ?? []).find(s => s?.id === l?.employee_id);
        return {
          ...l,
          id: l?.id ?? 0,
          name: emp?.name ?? "Unknown",
          type: l?.leave_type ?? "N/A",
          start: l?.start_date ?? "N/A",
          end: l?.end_date ?? "N/A",
          status: l?.status ?? "pending"
        };
      }));
      setAnnouncements((announceData ?? []).map(an => ({
        id: an?.id ?? 0,
        title: an?.title ?? "No Title",
        message: an?.message ?? "No Content",
        created_by: an?.created_by ?? "Admin",
        created_at: an?.created_at ?? new Date().toISOString()
      })));
      setAdvances((advanceData ?? []).map(a => {
        const emp = (staffData ?? []).find(s => s?.id === a?.employee_id);
        return {
          ...a,
          id: a?.id ?? 0,
          name: emp?.name ?? "Unknown",
          empId: a?.employee_id ?? "",
          amount: a?.amount ?? 0,
          reason: a?.reason ?? "No Reason",
          status: a?.status ?? "pending",
          date: a?.request_date ?? "N/A"
        };
      }));
      setOvertime((overtimeData ?? []).map(o => {
        const emp = (staffData ?? []).find(s => s?.id === o?.employee_id);
        return {
          ...o,
          id: o?.id ?? 0,
          name: emp?.name ?? "Unknown",
          empId: o?.employee_id ?? "",
          date: o?.date ?? "N/A",
          hours: o?.hours ?? 0,
          status: o?.status ?? "pending"
        };
      }));
      setOutsideWorkers((outsideData ?? []).map(w => ({
        id: w?.id ?? 0,
        name: w?.name ?? "Unknown",
        skill: w?.skill ?? "General",
        phone: w?.phone ?? "N/A",
        rate: w?.rate ?? 0,
        rate_type: w?.rate_type ?? "per event",
        status: w?.status ?? "available",
        rating: w?.rating ?? 5,
        totalPaid: 0
      })));
    } catch (err: any) {
      setError(err?.message || "Failed to load HR data");
      toast.error("Failed to load HR data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHRData();
    }
  }, [user]);

  const generateEmpId = () => `EMP-${String(staff.length + 1).padStart(3, '0')}`;

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.role || !newStaff.email) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    const id = generateEmpId();
    const emp = {
      id,
      name: newStaff.name,
      role: newStaff.role,
      department: newStaff.department,
      salary: Number(newStaff.salary ?? 0),
      phone: newStaff.phone,
      email: newStaff.email,
      address: newStaff.address,
      emergency_contact: newStaff.emergencyContact,
      status: newStaff.status,
      joining_date: newStaff.joinDate
    };
    try {
      const { error } = await supabase.from('staff').insert([emp]);
      if (error) throw error;
      await fetchHRData();
      setNewStaff({ 
        name: "", role: "", department: "", salary: "", phone: "", email: "", 
        address: "", emergencyContact: "", status: "active", joinDate: format(new Date(), "yyyy-MM-dd") 
      });
      setShowAddModal(false);
      logAction(`Added new staff member: ${emp.name}`, "HR & Staff");
      toast.success("Staff member added successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStaff = async () => {
    if (!editStaff?.name || !editStaff?.role || !editStaff?.email) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('staff').update({
        name: editStaff.name,
        role: editStaff.role,
        department: editStaff.department,
        salary: Number(editStaff.salary ?? 0),
        phone: editStaff.phone,
        email: editStaff.email,
        address: editStaff.address,
        emergency_contact: editStaff.emergency_contact || editStaff.emergencyContact,
        joining_date: editStaff.joining_date || editStaff.joinDate,
        status: editStaff.status,
        avatar: editStaff.avatar
      }).eq('id', editStaff.id);
      if (error) throw error;
      await fetchHRData();
      setShowEditModal(false);
      logAction(`Updated staff member: ${editStaff.name}`, "HR & Staff");
      toast.success("Staff member updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      await fetchHRData();
      setShowDeleteConfirm(null);
      logAction(`Deleted staff member ID: ${id}`, "HR & Staff");
      toast.success("Staff member deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error("Please fill all fields");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('announcements').insert([{
        title: newAnnouncement.title,
        message: newAnnouncement.content,
        created_by: user?.email ?? 'Admin',
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      await fetchHRData();
      setNewAnnouncement({ title: "", content: "" });
      setShowAnnounceModal(false);
      toast.success("Announcement posted");
    } catch (err: any) {
      toast.error("Failed to post announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!attendanceForm.empId) return;
    setSaving(true);
    try {
      const record = {
        employee_id: attendanceForm.empId,
        date: attendanceForm.date,
        check_in: attendanceForm.status === 'present' ? attendanceForm.checkIn : null,
        check_out: attendanceForm.status === 'present' ? attendanceForm.checkOut : null,
        status: attendanceForm.status
      };
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', attendanceForm.empId)
        .eq('date', attendanceForm.date)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from('attendance').update(record).eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance').insert([record]);
        if (error) throw error;
      }
      await fetchHRData();
      setShowAttendanceModal(false);
      toast.success("Attendance updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSaving(true);
    try {
      const records = (staff ?? []).map(s => ({
        employee_id: s?.id ?? "",
        date: today,
        status: 'present',
        check_in: '09:00',
        check_out: '18:00'
      })).filter(r => r.employee_id !== "");
      if (records.length === 0) return;
      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'employee_id,date' });
      if (error) throw error;
      await fetchHRData();
      toast.success(`Bulk marked all as present`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark bulk attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAbsent = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSaving(true);
    try {
      // Find staff who don't have attendance for today
      const { data: todayAttendance, error: fetchError } = await supabase
        .from('attendance')
        .select('employee_id')
        .eq('date', today);
      
      if (fetchError) throw fetchError;

      const markedEmpIds = new Set((todayAttendance ?? []).map(a => a.employee_id));
      
      // Filter staff: active, has id, and NOT marked today
      const absentRecords = (staff ?? [])
        .filter(s => s?.id && !markedEmpIds.has(s.id) && s.status?.toLowerCase() === 'active')
        .map(s => ({
          employee_id: s.id,
          date: today,
          status: 'absent',
          check_in: null,
          check_out: null
        }));

      if (absentRecords.length === 0) {
        toast.info("All active staff already have attendance records for today");
        return;
      }

      const { error: insertError } = await supabase.from('attendance').insert(absentRecords);
      if (insertError) throw insertError;
      
      await fetchHRData();
      toast.success(`Successfully marked ${absentRecords.length} staff members as absent`);
      logAction(`Auto-marked ${absentRecords.length} staff as absent for ${today}`, "HR & Staff");
    } catch (err: any) {
      toast.error(err?.message || "Failed to run auto-absent process");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAttendance = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSaving(true);
    try {
      const records = (staff ?? []).map(s => ({
        employee_id: s?.id ?? "",
        date: today,
        status: bulkStatus,
        check_in: bulkStatus === 'present' ? '09:00' : null,
        check_out: bulkStatus === 'present' ? '18:00' : null
      })).filter(r => r.employee_id !== "");
      if (records.length === 0) return;
      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'employee_id,date' });
      if (error) throw error;
      await fetchHRData();
      setShowBulkAttendanceModal(false);
      toast.success(`Bulk marked all as ${bulkStatus}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark bulk attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestLeave = async () => {
    if (!leaveForm.empId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('leaves').insert([{
        employee_id: leaveForm.empId,
        leave_type: leaveForm.type,
        start_date: leaveForm.start,
        end_date: leaveForm.end,
        reason: leaveForm.reason,
        status: 'pending'
      }]);
      if (error) throw error;
      await fetchHRData();
      setShowLeaveRequestModal(false);
      toast.success("Leave request submitted");
    } catch (err: any) {
      toast.error("Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveAction = async (id: number, status: string) => {
    if (!confirm(`Are you sure you want to ${status} this leave request?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('leaves').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchHRData();
      toast.success(`Leave request ${status}`);
    } catch (err: any) {
      toast.error("Failed to update leave status");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPerformance = async () => {
    if (!performanceForm.empId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('performance').insert([{
        employee_id: performanceForm.empId,
        month: format(new Date(), "MMMM yyyy"),
        rating: performanceForm.rating,
        notes: performanceForm.notes
      }]);
      if (error) throw error;
      await fetchHRData();
      setShowPerformanceModal(false);
      toast.success("Performance rating added");
    } catch (err: any) {
      toast.error("Failed to add performance record");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    const gross = (payrollForm.basicSalary ?? 0) + (payrollForm.allowances.houseRent ?? 0) + (payrollForm.allowances.medical ?? 0) + (payrollForm.allowances.conveyance ?? 0) + (payrollForm.allowances.special ?? 0) + (payrollForm.overtime.pay ?? 0);
    const deductions = (payrollForm.deductions.tax ?? 0) + (payrollForm.deductions.eobi ?? 0) + (payrollForm.deductions.pessi ?? 0) + (payrollForm.deductions.loans ?? 0) + (payrollForm.deductions.late ?? 0) + (payrollForm.deductions.absences ?? 0);
    const netSalary = gross - deductions;
    setSaving(true);
    try {
      const { error } = await supabase.from('payroll_history').insert([{
        employee_id: payrollForm.empId,
        month: payrollForm.month,
        basic_salary: payrollForm.basicSalary,
        bonus: 0,
        allowances: (payrollForm.allowances.houseRent ?? 0) + (payrollForm.allowances.medical ?? 0) + (payrollForm.allowances.conveyance ?? 0) + (payrollForm.allowances.special ?? 0) + (payrollForm.overtime.pay ?? 0),
        deductions: deductions,
        net_pay: netSalary,
        status: 'paid',
        payment_date: format(new Date(), "yyyy-MM-dd")
      }]);
      if (error) throw error;
      await fetchHRData();
      setShowPayrollModal(false);
      toast.success(`Payroll processed for ${payrollForm.month}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to process payroll");
    } finally {
      setSaving(false);
    }
  };

  const prefillPayrollForm = (emp: any) => {
    const month = format(new Date(), "MMMM yyyy");
    const basic = emp.salary ?? 0;
    const hra = Math.round(basic * 0.45);
    const medical = Math.round(basic * 0.10);
    const conveyance = Math.round(basic * 0.10);
    const tax = calculateTax(basic * 12);
    const eobi = calculateEOBI(basic);
    const pessi = calculatePESSI(basic);
    const empOvertime = (emp.overtime ?? []).filter((o: any) => o.status === 'pending');
    const otHours = empOvertime.reduce((sum: number, o: any) => sum + (o.hours ?? 0), 0);
    const otPay = calculateOvertime(getHourlyRate(basic), otHours);
    const empAdvances = (emp.advances ?? []).filter((a: any) => a.status === 'approved');
    const advanceDeduction = empAdvances.reduce((sum: number, a: any) => sum + (a.amount ?? 0), 0);
    const monthAttendance = (emp.attendanceRecords ?? []).filter((a: any) => a.date?.startsWith(format(new Date(), "yyyy-MM")));
    const absences = monthAttendance.filter((a: any) => a.status === 'absent').length;
    const lateDays = monthAttendance.filter((a: any) => a.status === 'late').length;
    const dayRate = basic / 22;
    const absenceDeduction = absences * dayRate;
    const lateDeduction = lateDays > 3 ? (lateDays - 3) * (dayRate / 4) : 0;
    setPayrollForm({
      empId: emp.id,
      month,
      basicSalary: basic,
      allowances: { houseRent: hra, medical, conveyance, special: 0 },
      overtime: { hours: otHours, pay: Math.round(otPay) },
      deductions: { 
        tax: Math.round(tax), 
        eobi: Math.round(eobi), 
        pessi, 
        loans: advanceDeduction, 
        late: Math.round(lateDeduction), 
        absences: Math.round(absenceDeduction) 
      }
    });
  };

  const handleUpdateAttendance = async (id: number, status: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('attendance').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchHRData();
      setEditAttendanceId(null);
      toast.success("Attendance updated");
    } catch (err: any) {
      toast.error("Failed to update attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleLogOvertime = async () => {
    if (!overtimeForm.empId || !overtimeForm.hours) {
      toast.error("Please fill all fields");
      return;
    }
    setSaving(true);
    try {
      const emp = staff.find(s => s.id === overtimeForm.empId);
      const hourlyRate = getHourlyRate(emp?.salary ?? 0);
      const total = calculateOvertime(hourlyRate, Number(overtimeForm.hours));
      const { error } = await supabase.from('overtime').insert([{
        employee_id: overtimeForm.empId,
        date: overtimeForm.date,
        hours: Number(overtimeForm.hours),
        rate: 1.5,
        total: total,
        status: 'pending'
      }]);
      if (error) throw error;
      await fetchHRData();
      setShowOvertimeModal(false);
      setOvertimeForm({ empId: "", hours: "", date: format(new Date(), "yyyy-MM-dd") });
      toast.success("Overtime logged successfully");
    } catch (err: any) {
      toast.error("Failed to log overtime");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAdvance = async () => {
    if (!advanceForm.empId || !advanceForm.amount) {
      toast.error("Please fill all fields");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('advance_salary').insert([{
        employee_id: advanceForm.empId,
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason,
        status: 'pending',
        request_date: format(new Date(), "yyyy-MM-dd")
      }]);
      if (error) throw error;
      await fetchHRData();
      setShowAdvanceModal(false);
      setAdvanceForm({ empId: "", amount: "", reason: "" });
      toast.success("Advance request submitted");
    } catch (err: any) {
      toast.error("Failed to submit advance request");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRights = async (id: string, rights: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('staff').update({ rights }).eq('id', id);
      if (error && error.code !== 'PGRST204' && !error.message.includes('column "rights" of relation "staff" does not exist')) {
        throw error;
      }
      await fetchHRData();
      setShowRightsModal(false);
      toast.success("Permissions updated");
    } catch (err: any) {
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOutsideWorker = async () => {
    if (!newOutsideWorker?.name || !newOutsideWorker?.phone) {
      toast.error("Please fill name and phone");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('outside_workers').insert([{
        name: newOutsideWorker.name,
        skill: newOutsideWorker.skill,
        phone: newOutsideWorker.phone,
        rate: Number(newOutsideWorker.rate ?? 0),
        rate_type: newOutsideWorker.rateType,
        status: 'active',
        rating: 5
      }]);
      if (error) throw error;
      await fetchHRData();
      setShowAddOutsideModal(false);
      toast.success("Outside worker added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add worker");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignToEvent = async () => {
    if (!assignmentForm.eventId || !assignmentForm.workerId) {
      toast.error("Please select worker and event");
      return;
    }
    setSaving(true);
    try {
      // In a real app, this would save to an 'outside_assignments' table
      // For now, we simulate success as requested
      setOutsideAssignments([...outsideAssignments, {
        id: outsideAssignments.length + 1,
        ...assignmentForm,
        status: "unpaid",
        hours: 0,
        attendance: "pending"
      }]);
      setShowAssignEventModal(false);
      toast.success("Worker assigned to event");
    } finally {
      setSaving(false);
    }
  };

  const handleOutsidePayment = async () => {
    if (!outsidePaymentForm.amount || !outsidePaymentForm.workerId) {
      toast.error("Please fill amount and select worker");
      return;
    }
    setSaving(true);
    try {
      // In a real app, this would save to an 'outside_payments' table
      setOutsidePayments([...outsidePayments, {
        id: outsidePayments.length + 1,
        ...outsidePaymentForm,
        date: format(new Date(), "yyyy-MM-dd")
      }]);
      setShowOutsidePaymentModal(false);
      toast.success("Payment recorded");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintWorkerCard = (worker: any) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>Worker ID Card - ${worker.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .card { width: 350px; height: 220px; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; display: flex; border: 2px solid #e2e8f0; position: relative; }
            .left { width: 120px; background: #1e293b; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 10px; }
            .avatar { width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; border: 2px solid white; margin-bottom: 10px; }
            .right { flex: 1; padding: 15px; display: flex; flex-direction: column; justify-content: center; }
            .name { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; margin-bottom: 2px; }
            .skill { font-size: 12px; color: #4f46e5; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
            .field { margin-bottom: 8px; }
            .label { font-size: 8px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin: 0; }
            .value { font-size: 11px; color: #334155; font-weight: 600; margin: 0; }
            .emp-id { font-family: monospace; font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; margin-top: 5px; }
            @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #ddd; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="left">
              <div class="avatar">${worker.name[0]}</div>
              <div class="emp-id">${worker.id}</div>
            </div>
            <div class="right">
              <h1 class="name">${worker.name}</h1>
              <p class="skill">${worker.skill}</p>
              <div class="field"><p class="label">Worker Type</p><p class="value">${worker.type}</p></div>
              <div class="field"><p class="label">Contact</p><p class="value">${worker.phone}</p></div>
              <div class="field"><p class="label">City/Area</p><p class="value">${worker.city}, ${worker.area}</p></div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportPayroll = () => {
    try {
      const data = (staff ?? []).map((s) => {
        const latestPayroll = (s?.payrollHistory ?? [])[0];
        const netSalary = latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0);
        const status = latestPayroll ? (latestPayroll?.status ?? "Paid") : "Pending";
        const basicSalary = latestPayroll ? (latestPayroll?.basic ?? 0) : (s?.salary ?? 0);
        const bonus = latestPayroll ? (latestPayroll?.bonuses ?? 0) : 0;
        const deductions = latestPayroll ? (latestPayroll?.deductions ?? 0) : 0;
        return {
          'Employee ID': s?.id ?? "N/A",
          'Staff Name': s?.name ?? "Unknown",
          'Month': latestPayroll ? (latestPayroll?.month ?? "N/A") : format(new Date(), 'MMMM yyyy'),
          'Basic Salary': basicSalary,
          'Bonus': bonus,
          'Deductions': deductions,
          'Net Salary': netSalary,
          'Status': status,
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `Payroll_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success("Payroll exported successfully to Excel");
    } catch (err: any) {
      toast.error("Failed to export payroll");
    }
  };

  const handleExportAttendance = () => {
    try {
      const data = (attendance ?? []).map((a) => ({
        'Staff Name': a?.name ?? "Unknown",
        'Employee ID': a?.empId ?? "N/A",
        'Date': a?.date ?? "N/A",
        'Check In': a?.checkIn ?? "-",
        'Check Out': a?.checkOut ?? "-",
        'Status': a?.status ?? "N/A",
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `Attendance_${format(new Date(), 'MMM_yyyy')}.xlsx`);
      toast.success("Attendance exported successfully to Excel");
    } catch (err: any) {
      toast.error("Failed to export attendance");
    }
  };

  const handleExportLedger = () => {
    if (!ledgerStaff) return;
    try {
      let runningBalance = 0;
      const data = (ledgerStaff?.payrollHistory ?? []).map((h: any) => {
        const netPay = h?.netPay ?? 0;
        runningBalance += netPay;
        return {
          'Date': h?.payment_date ?? h?.date ?? "N/A",
          'Month': h?.month ?? "N/A",
          'Basic Salary': h?.basic ?? 0,
          'Bonuses': h?.bonuses ?? 0,
          'Allowances': h?.allowances ?? 0,
          'Deductions': h?.deductions ?? 0,
          'Net Paid': netPay,
          'Running Total': runningBalance
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff_Ledger');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `Ledger_${(ledgerStaff?.name ?? 'Staff').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success("Ledger exported to Excel");
    } catch (err: any) {
      toast.error("Failed to export ledger");
    }
  };

  const handleExportLedgerPDF = () => {
    if (!ledgerStaff) return;
    try {
      toast.success("Downloading ledger as PDF...");
      let content = `STAFF PAYROLL LEDGER\n`;
      content += `Employee: ${ledgerStaff?.name ?? "Unknown"} (${ledgerStaff?.id ?? "N/A"})\n`;
      content += `Date Generated: ${format(new Date(), 'PPP')}\n\n`;
      content += `Date | Month | Net Paid | Running Total\n`;
      content += `------------------------------------------\n`;
      let runningBalance = 0;
      (ledgerStaff?.payrollHistory ?? []).forEach((h: any) => {
        const netPay = h?.netPay ?? 0;
        runningBalance += netPay;
        content += `${h?.payment_date ?? h?.date ?? "N/A"} | ${h?.month ?? "N/A"} | Rs ${(netPay ?? 0).toLocaleString()} | Rs ${(runningBalance ?? 0).toLocaleString()}\n`;
      });
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Ledger_${ledgerStaff?.id ?? "N/A"}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
      link.click();
    } catch (err: any) {
      toast.error("Failed to export ledger PDF");
    }
  };

  const handleExportTotalLedgerExcel = () => {
    try {
      const data: any[] = [];
      let grandTotal = 0;
      (staff ?? []).forEach(s => {
        const latestPayroll = (s?.payrollHistory ?? [])[0];
        const status = latestPayroll ? (latestPayroll?.status ?? "Paid") : "Pending";
        const basic = latestPayroll ? (latestPayroll?.basic ?? 0) : (s?.salary ?? 0);
        const bonus = latestPayroll ? (latestPayroll?.bonuses ?? 0) : 0;
        const allowances = latestPayroll ? (latestPayroll?.allowances ?? 0) : 0;
        const deductions = latestPayroll ? (latestPayroll?.deductions ?? 0) : 0;
        const netPay = latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0);
        grandTotal += (netPay ?? 0);
        data.push({
          'Employee ID': s?.id ?? "N/A",
          'Name': s?.name ?? "Unknown",
          'Department': s?.department ?? "N/A",
          'Basic Salary': basic,
          'Bonus': bonus,
          'Allowances': allowances,
          'Deductions': deductions,
          'Net Pay': netPay,
          'Status': status,
          'Date': latestPayroll ? (latestPayroll?.payment_date ?? latestPayroll?.date ?? "N/A") : '-'
        });
      });
      data.push({});
      data.push({ 'Name': 'GRAND TOTAL', 'Net Pay': grandTotal });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Total_Payroll_Ledger');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `Total_Payroll_Ledger_${format(new Date(), 'MMM_yyyy')}.xlsx`);
      toast.success("Total payroll ledger exported to Excel");
    } catch (err: any) {
      toast.error("Failed to export total ledger");
    }
  };

  const handleAdvanceAction = async (id: number, status: string) => {
    if (!confirm(`Are you sure you want to ${status} this advance request?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('advance_salary').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchHRData();
      toast.success(`Advance request ${status}`);
    } catch (err: any) {
      toast.error("Failed to update advance status");
    } finally {
      setSaving(false);
    }
  };

  const handleOvertimeAction = async (id: number, status: string) => {
    if (!confirm(`Are you sure you want to ${status} this overtime record?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('overtime').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchHRData();
      toast.success(`Overtime record ${status}`);
    } catch (err: any) {
      toast.error("Failed to update overtime status");
    } finally {
      setSaving(false);
    }
  };

  const handleAnnounceAction = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await fetchHRData();
      toast.success("Announcement deleted");
    } catch (err: any) {
      toast.error("Failed to delete announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePayslip = (staff: any, payroll: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74);
    doc.text("Octonus Solutions", 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("Salary Payslip", 105, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Employee Name: ${staff?.name ?? "Unknown"}`, 14, 45);
    doc.text(`Employee ID: ${staff?.id ?? "N/A"}`, 14, 52);
    doc.text(`Designation: ${staff?.role ?? "Staff"}`, 14, 59);
    doc.text(`Month & Year: ${payroll?.month ?? format(new Date(), "MMMM yyyy")}`, 14, 66);
    const earnings = [
      ["Basic Salary", `Rs ${(payroll?.basic ?? 0).toLocaleString()}`],
      ["Allowances", `Rs ${(payroll?.allowances ?? 0).toLocaleString()}`],
      ["Bonus", `Rs ${(payroll?.bonus ?? 0).toLocaleString()}`],
    ];
    const deductions = [ ["Deductions", `Rs ${(payroll?.deductions ?? 0).toLocaleString()}`] ];
    autoTable(doc, {
      startY: 75,
      head: [['Earnings', 'Amount']],
      body: earnings,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Deductions', 'Amount']],
      body: deductions,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Salary: Rs ${(payroll?.netPay ?? 0).toLocaleString()}`, 14, finalY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Net Salary in Words:", 14, finalY + 10);
    doc.setFont("helvetica", "bold");
    doc.text(numberToWords(payroll?.netPay ?? 0).toUpperCase(), 14, finalY + 16);
    doc.save(`Payslip_${staff?.name ?? "Staff"}_${payroll?.month ?? "Month"}.pdf`);
  };

  const handleExportEOBIReport = () => {
    const data = (staff ?? []).map(s => {
      const latestPayroll = (s?.payrollHistory ?? [])[0];
      return {
        "Employee ID": s?.id ?? "N/A",
        "Name": s?.name ?? "Unknown",
        "Department": s?.department ?? "N/A",
        "Basic Salary": s?.salary ?? 0,
        "EOBI Contribution": (s?.salary ?? 0) * 0.01,
        "Month": latestPayroll ? (latestPayroll?.month ?? "N/A") : format(new Date(), "MMMM yyyy")
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EOBI Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `EOBI_Report_${format(new Date(), "MMM_yyyy")}.xlsx`);
    toast.success("EOBI report exported to Excel");
  };

  const handleExportTaxReport = () => {
    const data = (staff ?? []).map(s => {
      const latestPayroll = (s?.payrollHistory ?? [])[0];
      return {
        "Employee ID": s?.id ?? "N/A",
        "Name": s?.name ?? "Unknown",
        "Department": s?.department ?? "N/A",
        "Annual Salary": (s?.salary ?? 0) * 12,
        "Monthly Tax Deduction": calculateTax((s?.salary ?? 0) * 12),
        "Month": latestPayroll ? (latestPayroll?.month ?? "N/A") : format(new Date(), "MMMM yyyy")
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tax Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Tax_Report_${format(new Date(), "MMM_yyyy")}.xlsx`);
    toast.success("Tax report exported to Excel");
  };

  const handlePrintCard = (staff: any) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;
    const initials = (staff?.name ?? "U").split(' ').map((n:any) => n[0]).join('').toUpperCase();
    const html = `
      <html>
        <head>
          <title>ID Card - ${staff?.name ?? "Staff"}</title>
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .card { width: 350px; height: 220px; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; display: flex; border: 2px solid #e2e8f0; }
            .left { width: 120px; background: #4f46e5; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 10px; }
            .avatar { width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; border: 2px solid white; margin-bottom: 10px; }
            .right { flex: 1; padding: 15px; display: flex; flex-direction: column; justify-content: center; }
            .name { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; margin-bottom: 2px; }
            .role { font-size: 12px; color: #64748b; font-weight: 600; margin: 0; margin-bottom: 15px; }
            .field { margin-bottom: 8px; }
            .label { font-size: 8px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; margin: 0; }
            .value { font-size: 11px; color: #334155; font-weight: 600; margin: 0; }
            .emp-id { font-family: monospace; font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; margin-top: 5px; }
            @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #ddd; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="left"><div class="avatar">${initials}</div><div class="emp-id">${staff?.id ?? "N/A"}</div></div>
            <div class="right">
              <h1 class="name">${staff?.name ?? "Unknown"}</h1>
              <p class="role">${staff?.role ?? "Staff"}</p>
              <div class="field"><p class="label">Department</p><p class="value">${staff?.department ?? "N/A"}</p></div>
              <div class="field"><p class="label">Email</p><p class="value">${staff?.email ?? "N/A"}</p></div>
              <div class="field"><p class="label">Joining Date</p><p class="value">${staff?.joinDate ?? "N/A"}</p></div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportTotalLedgerPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text('Total Payroll Ledger', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 30);
    const tableData = (staff ?? []).map(s => {
      const history = s?.payrollHistory ?? [];
      const latestPayroll = history[history.length - 1];
      const allowances = latestPayroll ? (latestPayroll?.allowances ?? 0) : 0;
      const deductions = latestPayroll ? (latestPayroll?.deductions ?? 0) : 0;
      const netPay = latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0);
      const basic = latestPayroll ? (latestPayroll?.basic ?? 0) : (s?.salary ?? 0);
      const bonus = latestPayroll ? (latestPayroll?.bonuses ?? 0) : 0;
      return [
        s?.id ?? "N/A", s?.name ?? "Unknown", s?.department ?? "N/A",
        `Rs ${(basic ?? 0).toLocaleString()}`, `Rs ${(bonus ?? 0).toLocaleString()}`,
        `Rs ${(allowances ?? 0).toLocaleString()}`, `Rs ${(deductions ?? 0).toLocaleString()}`,
        `Rs ${(netPay ?? 0).toLocaleString()}`, latestPayroll ? (latestPayroll?.status ?? "Paid") : "Pending",
        latestPayroll ? (latestPayroll?.date ?? "N/A") : '-'
      ];
    });
    const grandTotal = (staff ?? []).reduce((acc, s) => {
      const history = s?.payrollHistory ?? [];
      const latestPayroll = history[history.length - 1];
      return acc + ((latestPayroll ? (latestPayroll?.netPay ?? 0) : (s?.salary ?? 0)) || 0);
    }, 0);
    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Name', 'Dept', 'Basic', 'Bonus', 'Allow.', 'Deduct.', 'Net Pay', 'Status', 'Date']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'GRAND TOTAL', `Rs ${(grandTotal || 0).toLocaleString()}`, '', '']],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    });
    doc.save(`Total_Payroll_Ledger_${format(new Date(), 'MMM_yyyy')}.pdf`);
    toast.success("Total payroll ledger exported to PDF");
  };

  const filteredStaff = useMemo(() => (staff ?? []).filter(s =>
    (s?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s?.id ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s?.department ?? "").toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);

  const monthlyPayrollTotal = useMemo(() => {
    return (staff ?? []).reduce((acc, s) => {
      return acc + (s?.payrollHistory ?? []).reduce((sum: number, p: any) => sum + (p?.netPay ?? 0), 0);
    }, 0);
  }, [staff]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Fetching HR data securely...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 border border-destructive rounded-lg">
        <p className="text-destructive font-bold">Error loading data</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={fetchHRData} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Workforce Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground text-balance">Comprehensive HR portal for staff, attendance, and payroll</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button onClick={() => setShowTotalLedgerModal(true)} variant="outline" className="gap-2 flex-shrink-0 border-primary/20 hover:bg-primary/5 text-primary">
            <BarChart3 className="h-4 w-4" /> Total Ledger
          </Button>
          <Button onClick={() => setShowAnnounceModal(true)} variant="outline" className="gap-2 flex-shrink-0">
            <Bell className="h-4 w-4" /> Announce
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2 flex-shrink-0">
            <UserPlus className="h-4 w-4" /> Add Staff
          </Button>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "Total Workforce", value: staff?.length, icon: Users, color: "from-blue-500 to-blue-700" },
          { label: "Active Staff", value: (staff ?? []).filter(s => s?.status === 'active').length, icon: CheckCircle, color: "from-emerald-500 to-emerald-700" },
          { label: "Leaves Today", value: (leaves ?? []).filter(l => l?.status === 'approved').length, icon: XCircle, color: "from-rose-500 to-rose-700" },
          { label: "Monthly Payroll", value: `₨ ${(monthlyPayrollTotal ?? 0).toLocaleString()}`, icon: DollarSign, color: "from-violet-500 to-violet-700" },
        ].map((card, i) => (
          <div key={card.label} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{card.label}</p>
                <p className="text-2xl font-black truncate tracking-tight">{card.value}</p>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <card.icon size={120} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="profiles" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="overflow-x-auto pb-1 w-full sm:w-auto">
            <TabsList className="w-full justify-start sm:w-auto inline-flex">
              <TabsTrigger value="profiles" className="text-xs sm:text-sm">Profiles</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm">Attendance</TabsTrigger>
              <TabsTrigger value="payroll" className="text-xs sm:text-sm">Payroll</TabsTrigger>
              <TabsTrigger value="advances" className="text-xs sm:text-sm">Advances</TabsTrigger>
              <TabsTrigger value="overtime" className="text-xs sm:text-sm">Overtime</TabsTrigger>
              <TabsTrigger value="outside" className="text-xs sm:text-sm">Outside Workers</TabsTrigger>
              <TabsTrigger value="leaves" className="text-xs sm:text-sm">Leaves</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
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
            />
          </TabsContent>
          <TabsContent value="attendance">
            <HRAttendance 
              canDo={canDo} setShowAttendanceModal={setShowAttendanceModal} handleMarkAllPresent={handleMarkAllPresent}
              handleAutoAbsent={handleAutoAbsent} handleExportAttendance={handleExportAttendance}
              attendance={attendance} editAttendanceId={editAttendanceId} setEditAttendanceId={setEditAttendanceId}
              handleUpdateAttendance={handleUpdateAttendance} statusColor={statusColor}
            />
          </TabsContent>
          <TabsContent value="payroll">
            <HRPayroll 
              canDo={canDo} handleExportPayroll={handleExportPayroll} staff={staff}
              prefillPayrollForm={prefillPayrollForm} setShowPayrollModal={setShowPayrollModal}
              handleGeneratePayslip={handleGeneratePayslip} statusColor={statusColor}
            />
          </TabsContent>
          <TabsContent value="leaves">
            <HRLeaves 
              leaves={leaves} canDo={canDo} setShowLeaveRequestModal={setShowLeaveRequestModal}
              handleLeaveAction={handleLeaveAction} statusColor={statusColor}
            />
          </TabsContent>
          <TabsContent value="performance">
            <HRPerformance canDo={canDo} setShowPerformanceModal={setShowPerformanceModal} staff={staff} />
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

      {/* Announcements Modal */}
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
            <Button onClick={handleAddAnnouncement}>Post Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Attendance Modal */}
      <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mark Manual Attendance</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setAttendanceForm({ ...attendanceForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"} ({s?.id ?? "N/A"})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={attendanceForm.status} onValueChange={v => setAttendanceForm({ ...attendanceForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleMarkAttendance} className="w-full">Save Attendance</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Attendance Modal */}
      <Dialog open={showBulkAttendanceModal} onOpenChange={setShowBulkAttendanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Mark Attendance</DialogTitle>
            <DialogDescription>Mark all staff members with a single status for today.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Select Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 font-bold" onClick={handleBulkAttendance}>Mark All as {bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1)}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Modal */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Process Payroll - {payrollForm.month}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Earnings & Allowances</p>
                <div className="space-y-2">
                  <Label className="text-xs">Basic Salary: ₨ {(payrollForm.basicSalary || 0).toLocaleString()}</Label>
                  <div className="space-y-1.5">
                    <Label>House Rent Allowance</Label>
                    <Input type="number" value={payrollForm.allowances.houseRent} onChange={e => setPayrollForm({ ...payrollForm, allowances: { ...payrollForm.allowances, houseRent: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Medical Allowance</Label>
                    <Input type="number" value={payrollForm.allowances.medical} onChange={e => setPayrollForm({ ...payrollForm, allowances: { ...payrollForm.allowances, medical: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Conveyance Allowance</Label>
                    <Input type="number" value={payrollForm.allowances.conveyance} onChange={e => setPayrollForm({ ...payrollForm, allowances: { ...payrollForm.allowances, conveyance: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Special Allowance</Label>
                    <Input type="number" value={payrollForm.allowances.special} onChange={e => setPayrollForm({ ...payrollForm, allowances: { ...payrollForm.allowances, special: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Overtime Pay</Label>
                    <Input type="number" value={payrollForm.overtime.pay} onChange={e => setPayrollForm({ ...payrollForm, overtime: { ...payrollForm.overtime, pay: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-destructive">Deductions</p>
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label>Income Tax</Label>
                    <Input type="number" value={payrollForm.deductions.tax} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, tax: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>EOBI (1%)</Label>
                    <Input type="number" value={payrollForm.deductions.eobi} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, eobi: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>PESSI/SESSI</Label>
                    <Input type="number" value={payrollForm.deductions.pessi} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, pessi: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Loan/Advance</Label>
                    <Input type="number" value={payrollForm.deductions.loans} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, loans: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Late Arrival Deduction</Label>
                    <Input type="number" value={payrollForm.deductions.late} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, late: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Absence Deduction</Label>
                    <Input type="number" value={payrollForm.deductions.absences} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, absences: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
              <span className="font-bold">Net Payable:</span>
              <span className="text-xl font-bold text-success">
                ₨ {((payrollForm.basicSalary || 0) + (payrollForm.allowances.houseRent || 0) + (payrollForm.allowances.medical || 0) + (payrollForm.allowances.conveyance || 0) + (payrollForm.allowances.special || 0) + (payrollForm.overtime.pay || 0) - (payrollForm.deductions.tax || 0) - (payrollForm.deductions.eobi || 0) - (payrollForm.deductions.pessi || 0) - (payrollForm.deductions.loans || 0) - (payrollForm.deductions.late || 0) - (payrollForm.deductions.absences || 0)).toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
            <Button className="bg-success hover:bg-success/90" onClick={handleMarkAsPaid}>Mark as Paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Modal */}
      <Dialog open={showLeaveRequestModal} onOpenChange={setShowLeaveRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setLeaveForm({ ...leaveForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual Leave</SelectItem>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Casual">Casual Leave</SelectItem>
                  <SelectItem value="Maternity">Maternity Leave</SelectItem>
                  <SelectItem value="Paternity">Paternity Leave</SelectItem>
                  <SelectItem value="Hajj">Hajj Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={leaveForm.start} onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={leaveForm.end} onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Reason</Label><Textarea placeholder="Brief reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleRequestLeave} className="w-full">Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Edit Staff Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Update Staff Profile</DialogTitle></DialogHeader>
          {editStaff && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Full Name *</Label><Input value={editStaff.name} onChange={e => setEditStaff({ ...editStaff, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email Address *</Label><Input type="email" value={editStaff.email} onChange={e => setEditStaff({ ...editStaff, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Position / Role *</Label><Input value={editStaff.role} onChange={e => setEditStaff({ ...editStaff, role: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={editStaff.department} onValueChange={v => setEditStaff({ ...editStaff, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Monthly Salary (₨) *</Label><Input type="number" value={editStaff.salary} onChange={e => setEditStaff({ ...editStaff, salary: Number(e.target.value) })} /></div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStaff.status} onValueChange={v => setEditStaff({ ...editStaff, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Phone Number</Label><Input value={editStaff.phone} onChange={e => setEditStaff({ ...editStaff, phone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={editStaff.emergency_contact || editStaff.emergencyContact || ""} onChange={e => setEditStaff({ ...editStaff, emergency_contact: e.target.value })} /></div>
                <div className="col-span-full space-y-1.5"><Label>Residential Address</Label><Textarea value={editStaff.address} onChange={e => setEditStaff({ ...editStaff, address: e.target.value })} className="resize-none" /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button><Button onClick={handleUpdateStaff}>Update Profile</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Ledger Modal */}
      <Dialog open={showLedgerModal} onOpenChange={setShowLedgerModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Staff Ledger - {ledgerStaff?.name}</DialogTitle><DialogDescription>Complete history of payments, advances, and deductions.</DialogDescription></DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-success">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.netPay || 0), 0) || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Advances</p>
                <p className="text-lg font-bold text-destructive">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.deductions.loans || 0), 0) || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-bold text-destructive">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + ((h.deductions.tax || 0) + (h.deductions.absences || 0)), 0) || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Running Balance</p>
                <p className="text-lg font-bold text-primary">₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.netPay || 0), 0) || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border"><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[800px]"><thead><tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Month</th><th className="px-4 py-3 text-right">Basic</th><th className="px-4 py-3 text-right">Allowances</th><th className="px-4 py-3 text-right">Bonuses</th><th className="px-4 py-3 text-right text-destructive">Advances</th><th className="px-4 py-3 text-right text-destructive">Deductions</th><th className="px-4 py-3 text-right font-bold text-success">Net Paid</th><th className="px-4 py-3 text-right font-bold text-primary">Running Bal</th></tr></thead><tbody className="divide-y divide-border">
              {ledgerStaff?.payrollHistory?.length > 0 ? (() => {
                let runningBalance = 0;
                return ledgerStaff.payrollHistory.map((h: any) => {
                  runningBalance += (h.netPay || 0);
                  return (
                    <tr key={h.id} className="text-sm hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{h.date}</td><td className="px-4 py-3 font-medium">{h.month}</td><td className="px-4 py-3 text-right">₨ {(h.basic || 0).toLocaleString()}</td><td className="px-4 py-3 text-right">₨ {((h.allowances.houseRent || 0) + (h.allowances.medical || 0) + (h.allowances.conveyance || 0)).toLocaleString()}</td><td className="px-4 py-3 text-right">₨ {(h.bonuses || 0).toLocaleString()}</td><td className="px-4 py-3 text-right text-destructive">₨ {(h.deductions.loans || 0).toLocaleString()}</td><td className="px-4 py-3 text-right text-destructive">₨ {((h.deductions.tax || 0) + (h.deductions.absences || 0)).toLocaleString()}</td><td className="px-4 py-3 text-right font-bold text-success">₨ {(h.netPay || 0).toLocaleString()}</td><td className="px-4 py-3 text-right font-bold text-primary">₨ {(runningBalance || 0).toLocaleString()}</td>
                    </tr>
                  );
                });
              })() : (<tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No payment history found.</td></tr>)}
            </tbody></table></div></div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2"><Button variant="outline" onClick={() => setShowLedgerModal(false)}>Close Ledger</Button><div className="flex gap-2"><Button variant="outline" className="gap-2" onClick={handleExportLedger}><Download className="h-4 w-4" /> Excel</Button><Button className="gap-2" onClick={handleExportLedgerPDF}><Download className="h-4 w-4" /> PDF</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Rights Modal */}
      <Dialog open={showRightsModal} onOpenChange={setShowRightsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>User Access Rights - {rightsStaff?.name}</DialogTitle><DialogDescription>Select which modules this staff member can access.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            {[ { id: 'dashboard', label: 'Dashboard View' }, { id: 'events', label: 'Event Booking' }, { id: 'inventory', label: 'Inventory Management' }, { id: 'expenses', label: 'Expense Tracking' }, { id: 'hr', label: 'HR & Staff Management' }, { id: 'finance', label: 'Finance & Accounts' } ].map(module => (
              <div key={module.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <Label htmlFor={`right-${module.id}`} className="flex-1 cursor-pointer">{module.label}</Label>
                <input type="checkbox" id={`right-${module.id}`} checked={rightsStaff?.rights?.includes(module.id)} onChange={(e) => {
                  const currentRights = rightsStaff?.rights || [];
                  const newRights = e.target.checked ? [...currentRights, module.id] : currentRights.filter((r: string) => r !== module.id);
                  setRightsStaff({ ...rightsStaff, rights: newRights });
                }} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRightsModal(false)}>Cancel</Button><Button onClick={() => handleUpdateRights(rightsStaff.id, rightsStaff.rights)}>Save Permissions</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Modal */}
      <Dialog open={showPayslipModal} onOpenChange={setShowPayslipModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Employee Payslip</DialogTitle><DialogDescription>Monthly salary details for {selectedPayslip?.staff.name}</DialogDescription></DialogHeader>
          {selectedPayslip && (
            <div className="space-y-6 py-4 border-t border-border mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Employee Name</Label><p className="font-medium">{selectedPayslip.staff.name}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Employee ID</Label><p className="font-medium">{selectedPayslip.staff.id}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pay Month</Label><p className="font-medium">{selectedPayslip.payroll.month}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Status</Label><Badge variant="outline" className={`capitalize ${statusColor(selectedPayslip.payroll.status)}`}>{selectedPayslip.payroll.status}</Badge></div>
              </div>
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="flex justify-between text-sm"><span>Basic Salary</span><span>₨ {(selectedPayslip.payroll.basic || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>Allowances</span><span>₨ {(selectedPayslip.payroll.allowances || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>Bonuses</span><span>₨ {(selectedPayslip.payroll.bonuses || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm text-destructive"><span>Deductions</span><span>-₨ {(selectedPayslip.payroll.deductions || 0).toLocaleString()}</span></div>
                <div className="h-[1px] bg-border my-2" /><div className="flex justify-between font-bold text-lg"><span>Net Payable</span><span className="text-success">₨ {(selectedPayslip.payroll.netPay || 0).toLocaleString()}</span></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowPayslipModal(false)}>Close</Button><Button className="gap-2" onClick={() => { toast.success("Downloading payslip as PDF..."); const content = `Payslip for ${selectedPayslip?.staff.name} - ${selectedPayslip?.payroll.month}\nNet Pay: Rs ${ (selectedPayslip?.payroll.netPay || 0).toLocaleString()}`; const blob = new Blob([content], { type: 'text/plain' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `payslip_${selectedPayslip?.staff.id}_${selectedPayslip?.payroll.month}.txt`; link.click(); }}><Download className="h-4 w-4" /> Download PDF</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Staff Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl border-none">
          {selectedStaff && (
            <div className="flex flex-col h-[80vh] sm:h-auto">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20">{selectedStaff.name.split(" ").map((n:any) => n[0]).join("").toUpperCase()}</div>
                    <div className="min-w-0"><h2 className="text-xl font-bold text-foreground truncate">{selectedStaff.name}</h2><p className="text-sm font-medium text-primary/80">{selectedStaff.role}</p><Badge variant="outline" className="mt-2 text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 h-5 bg-white">{selectedStaff.id}</Badge></div>
                  </div>
                  <Badge className={`capitalize py-1 px-3 ${statusColor(selectedStaff.status)}`}>{selectedStaff.status}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Department</Label><p className="text-sm font-medium">{selectedStaff.department}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Salary</Label><p className="text-sm font-bold text-success">₨ {(selectedStaff.salary || 0)?.toLocaleString()}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label><p className="text-sm font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.email}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phone Number</Label><p className="text-sm font-medium flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.phone}</p></div>
                  <div className="col-span-full space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Residential Address</Label><p className="text-sm font-medium flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /> {selectedStaff.address}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Joining Date</Label><p className="text-sm font-medium flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.joinDate}</p></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Emergency Contact</Label><p className="text-sm font-medium text-destructive">{selectedStaff.emergencyContact}</p></div>
                </div>
              </div>
              <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-3"><Button variant="outline" onClick={() => setShowViewModal(false)}>Close Profile</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Outside Worker Modal */}
      <Dialog open={showAddOutsideModal} onOpenChange={setShowAddOutsideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Outside Worker</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-1.5"><Label>Full Name</Label><Input value={newOutsideWorker.name} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Worker Type</Label><Select value={newOutsideWorker.type} onValueChange={v => setNewOutsideWorker({ ...newOutsideWorker, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Freelancer">Freelancer</SelectItem><SelectItem value="Contractor">Contractor</SelectItem><SelectItem value="Daily Wage">Daily Wage</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Skill / Service</Label><Select value={newOutsideWorker.skill} onValueChange={v => setNewOutsideWorker({ ...newOutsideWorker, skill: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Decorator", "Caterer", "DJ", "Photographer", "Driver", "Security", "Waiter", "Cleaner"].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Phone Number</Label><Input value={newOutsideWorker.phone} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Rate</Label><Input type="number" value={newOutsideWorker.rate} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, rate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Rate Type</Label><Select value={newOutsideWorker.rateType} onValueChange={v => setNewOutsideWorker({ ...newOutsideWorker, rateType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per hour">Per Hour</SelectItem><SelectItem value="per day">Per Day</SelectItem><SelectItem value="per event">Per Event</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddOutsideModal(false)}>Cancel</Button><Button onClick={handleAddOutsideWorker}>Add Worker</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Worker Modal */}
      <Dialog open={showAssignEventModal} onOpenChange={setShowAssignEventModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Worker to Event</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Select Worker</Label><Select onValueChange={v => setAssignmentForm({ ...assignmentForm, workerId: v })}><SelectTrigger><SelectValue placeholder="Choose Worker" /></SelectTrigger><SelectContent>{(outsideWorkers ?? []).map(w => <SelectItem key={w?.id ?? Math.random()} value={w?.id ?? ""}>{w?.name ?? "Unknown"}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Event Name</Label><Input value={assignmentForm.eventName} onChange={e => setAssignmentForm({ ...assignmentForm, eventName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Event Date</Label><Input type="date" value={assignmentForm.date} onChange={e => setAssignmentForm({ ...assignmentForm, date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Payment Amount (₨)</Label><Input type="number" value={assignmentForm.amount} onChange={e => setAssignmentForm({ ...assignmentForm, amount: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAssignEventModal(false)}>Cancel</Button><Button onClick={handleAssignToEvent}>Assign Worker</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outside Payment Modal */}
      <Dialog open={showOutsidePaymentModal} onOpenChange={setShowOutsidePaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Worker Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Select Worker</Label><Select onValueChange={v => setOutsidePaymentForm({ ...outsidePaymentForm, workerId: v })}><SelectTrigger><SelectValue placeholder="Choose Worker" /></SelectTrigger><SelectContent>{(outsideWorkers ?? []).map(w => <SelectItem key={w?.id ?? Math.random()} value={w?.id ?? ""}>{w?.name ?? "Unknown"}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Payment Amount (₨)</Label><Input type="number" value={outsidePaymentForm.amount} onChange={e => setOutsidePaymentForm({ ...outsidePaymentForm, amount: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Payment Method</Label><Select value={outsidePaymentForm.method} onValueChange={v => setOutsidePaymentForm({ ...outsidePaymentForm, method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank transfer">Bank Transfer</SelectItem><SelectItem value="easypaisa">EasyPaisa</SelectItem><SelectItem value="jazzcash">JazzCash</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowOutsidePaymentModal(false)}>Cancel</Button><Button onClick={handleOutsidePayment}>Record Payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overtime Modal */}
      <Dialog open={showOvertimeModal} onOpenChange={setShowOvertimeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Overtime</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Employee</Label><Select onValueChange={v => setOvertimeForm({ ...overtimeForm, empId: v })}><SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger><SelectContent>{(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Overtime Hours</Label><Input type="number" value={overtimeForm.hours} onChange={e => setOvertimeForm({ ...overtimeForm, hours: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={overtimeForm.date} onChange={e => setOvertimeForm({ ...overtimeForm, date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleLogOvertime} className="w-full">Log Overtime</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Modal */}
      <Dialog open={showAdvanceModal} onOpenChange={setShowAdvanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request Advance Salary</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Employee</Label><Select onValueChange={v => setAdvanceForm({ ...advanceForm, empId: v })}><SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger><SelectContent>{(staff ?? []).map(s => <SelectItem key={s?.id ?? Math.random()} value={s?.id ?? ""}>{s?.name ?? "Unknown"}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Amount (₨)</Label><Input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reason</Label><Textarea value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleRequestAdvance} className="w-full">Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Staff Record?</DialogTitle></DialogHeader>
           <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Keep Record</Button><Button variant="destructive" onClick={() => showDeleteConfirm && handleDeleteStaff(showDeleteConfirm)}>Yes, Delete Staff</Button></DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Total Ledger Modal */}
      <Dialog open={showTotalLedgerModal} onOpenChange={setShowTotalLedgerModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div><DialogTitle className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Total Payroll Ledger Dashboard</DialogTitle></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleExportTotalLedgerExcel}><Download className="h-4 w-4" /> Excel</Button><Button variant="outline" size="sm" onClick={handleExportTotalLedgerPDF}><FileText className="h-4 w-4" /> PDF</Button></div>
            </div>
          </DialogHeader>
          <div className="py-6 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[ 
                { label: "Total Paid (Month)", value: `₨ ${((staff ?? []).reduce((acc, s) => { const latestPayroll = (s?.payrollHistory ?? []).find(h => h?.month === format(new Date(), 'MMMM yyyy')); return acc + ((latestPayroll?.status === 'paid' ? (latestPayroll?.netPay ?? 0) : 0) || 0); }, 0) || 0).toLocaleString()}`, icon: DollarSign, color: "text-success", bg: "bg-success/10" }, 
                { label: "Total Payments", value: (staff ?? []).reduce((acc, s) => acc + (s?.payrollHistory ?? []).length, 0), icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" }, 
                { label: "Pending Payments", value: (staff ?? []).filter(s => !(s?.payrollHistory ?? []).some(h => h?.month === format(new Date(), 'MMMM yyyy'))).length, icon: Clock, color: "text-warning", bg: "bg-warning/10" }, 
                { label: "Total Advances", value: `₨ ${((staff ?? []).reduce((acc, s) => acc + (((s?.payrollHistory ?? [])?.reduce((sum, h) => sum + (h?.deductions?.loans ?? 0), 0) || 0)), 0) || 0).toLocaleString()}`, icon: Receipt, color: "text-destructive", bg: "bg-destructive/10" }, 
                { label: "Total Deductions", value: `₨ ${((staff ?? []).reduce((acc, s) => acc + (((s?.payrollHistory ?? [])?.reduce((sum, h) => sum + ((h?.deductions?.tax ?? 0) + (h?.deductions?.absences ?? 0)), 0) || 0)), 0) || 0).toLocaleString()}`, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" } 
              ].map((card, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center gap-3 mb-2"><div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`h-4 w-4 ${card.color}`} /></div><p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{card.label}</p></div><p className={`text-xl font-bold ${card.color}`}>{card.value}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm"><h4 className="text-sm font-bold mb-6 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Monthly Payroll Trend</h4><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={ Array.from({ length: 6 }).map((_, i) => { const date = subMonths(new Date(), 5 - i); const total = (staff ?? []).reduce((acc, s) => { const payroll = (s?.payrollHistory ?? []).find(h => h?.month === format(date, 'MMMM yyyy')); return acc + (payroll?.netPay ?? 0); }, 0); return { month: format(date, 'MMM yyyy'), total }; }) }><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₨${v/1000}k`} /><Tooltip formatter={(v: any) => [`₨ ${(v || 0).toLocaleString()}`, 'Total Payroll']} /><Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm"><h4 className="text-sm font-bold mb-6 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> Salary Distribution</h4><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ ["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(dept => ({ name: dept, value: (staff ?? []).filter(s => s?.department === dept).reduce((acc, s) => acc + (s?.salary ?? 0), 0) })).filter(d => d.value > 0) } cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"].map((color, index) => (<Cell key={`cell-${index}`} fill={color} />))}</Pie><Tooltip formatter={(v: any) => [`₨ ${(v || 0).toLocaleString()}`, 'Salary']} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></div></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowTotalLedgerModal(false)} className="w-full sm:w-auto">Close Dashboard</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register New Staff</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Full Name *</Label><Input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email Address *</Label><Input type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Position / Role *</Label><Input value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Department</Label><Select value={newStaff.department} onValueChange={v => setNewStaff({ ...newStaff, department: v })}><SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger><SelectContent>{["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Monthly Salary (₨) *</Label><Input type="number" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone Number</Label><Input value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} /></div>
              <div className="col-span-full space-y-1.5"><Label>Residential Address</Label><Textarea value={newStaff.address} onChange={e => setNewStaff({ ...newStaff, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={newStaff.emergencyContact} onChange={e => setNewStaff({ ...newStaff, emergencyContact: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Joining Date</Label><Input type="date" value={newStaff.joinDate} onChange={e => setNewStaff({ ...newStaff, joinDate: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button><Button onClick={handleAddStaff} className="bg-primary">Complete Registration</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(HRStaff);
