import { useState, useRef, useMemo, useEffect } from "react";
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
import { format, subMonths, startOfMonth as dateFnsStartOfMonth } from "date-fns";
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
  getHourlyRate, 
  calculateNetSalary 
} from "@/lib/salaryUtils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const NAV_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  hr: Users,
  events: CalendarDays,
  finance: Landmark,
  inventory: Package,
  expenses: Receipt,
  settings: Settings
};

const DUMMY_STAFF = [
  { 
    id: "EMP-001", 
    name: "Ahmed Raza", 
    role: "Event Manager", 
    department: "Operations", 
    salary: 45000, 
    status: "active", 
    phone: "0300-1234567", 
    email: "ahmed@octonus.com",
    address: "Street 5, Gulshan, Karachi",
    emergencyContact: "Fatima - 0321-9876543",
    joinDate: "2022-03-15", 
    attendance: 96,
    avatar: null,
    performance: [4, 5, 4, 5], // Monthly ratings
    leaveBalance: { annual: 14, sick: 8, casual: 7, maternity: 12, paternity: 5, hajj: 1 },
    advances: [{ amount: 5000, date: "2024-02-15", status: "paid" }],
    overtime: [{ hours: 5, date: "2024-03-10", rate: 1.5 }]
  },
  { 
    id: "EMP-002", 
    name: "Sara Khan", 
    role: "Chef", 
    department: "Kitchen", 
    salary: 38000, 
    status: "active", 
    phone: "0301-2345678", 
    email: "sara@octonus.com",
    address: "Block B, North Nazimabad, Karachi",
    emergencyContact: "Ali - 0333-1122334",
    joinDate: "2021-07-01", 
    attendance: 92,
    avatar: null,
    performance: [5, 5, 5],
    leaveBalance: { annual: 14, sick: 10, casual: 10, maternity: 12, paternity: 5, hajj: 0 },
    advances: [],
    overtime: []
  },
];

const DUMMY_ADVANCES = [
  { id: 1, empId: "EMP-001", name: "Ahmed Raza", amount: 5000, date: "2024-03-01", reason: "Urgent family need", status: "approved" },
];

const DUMMY_OVERTIME = [
  { id: 1, empId: "EMP-001", name: "Ahmed Raza", hours: 5, date: "2024-03-10", rate: 1.5, status: "paid" },
];

const DUMMY_ATTENDANCE = [
  { id: 1, empId: "EMP-001", name: "Ahmed Raza", date: "2024-03-14", status: "present", checkIn: "09:00", checkOut: "18:00" },
  { id: 2, empId: "EMP-002", name: "Sara Khan", date: "2024-03-14", status: "present", checkIn: "08:45", checkOut: "17:30" },
];

const DUMMY_LEAVES = [
  { id: 1, empId: "EMP-001", name: "Ahmed Raza", type: "Annual", start: "2024-03-20", end: "2024-03-22", reason: "Family event", status: "pending" },
  { id: 2, empId: "EMP-002", name: "Sara Khan", type: "Sick", start: "2024-03-10", end: "2024-03-11", reason: "Fever", status: "approved" },
];

const DUMMY_ANNOUNCEMENTS = [
  { id: 1, title: "Ramadan Office Hours", content: "Working hours will be 9 AM to 3 PM during Ramadan.", date: "2024-03-10", author: "Admin" },
];

const DUMMY_OUTSIDE_WORKERS = [
  {
    id: "W-001",
    name: "Zahid Ali",
    type: "Freelancer",
    skill: "Decorator",
    phone: "0321-1122334",
    whatsapp: "0321-1122334",
    city: "Karachi",
    area: "Gulshan",
    rate: 5000,
    rateType: "per event",
    status: "available",
    rating: 5,
    totalPaid: 15000,
    pastEvents: ["E-001", "E-002"],
    avatar: null
  },
  {
    id: "W-002",
    name: "Imran Khan",
    type: "Contractor",
    skill: "Caterer",
    phone: "0333-5566778",
    whatsapp: "0333-5566778",
    city: "Karachi",
    area: "DHA",
    rate: 1500,
    rateType: "per day",
    status: "busy",
    rating: 4,
    totalPaid: 3000,
    pastEvents: ["E-003"],
    avatar: null
  }
];

const DUMMY_OUTSIDE_ASSIGNMENTS = [
  { id: 1, workerId: "W-001", eventId: "E-001", eventName: "Wedding Ceremony", date: "2024-03-10", amount: 5000, status: "paid", hours: 8, attendance: "present" },
  { id: 2, workerId: "W-001", eventId: "E-002", eventName: "Corporate Meetup", date: "2024-03-15", amount: 5000, status: "unpaid", hours: 6, attendance: "present" },
];

const DUMMY_OUTSIDE_PAYMENTS = [
  { id: 1, workerId: "W-001", amount: 5000, method: "cash", date: "2024-03-11", eventId: "E-001" },
];

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "active" || s === "present" || s === "paid" || s === "approved") return "bg-success/10 text-success border-success/20";
  if (s === "inactive" || s === "absent" || s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "late" || s === "pending" || s === "half-day") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

const HRStaff = () => {
  const { user, canDo, logAction } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [markedAllPresent, setMarkedAllPresent] = useState(false);
  const [announcements, setAnnouncements] = useState(DUMMY_ANNOUNCEMENTS);
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
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [editAttendanceId, setEditAttendanceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHRData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: staffData } = await supabase.from('staff').select('*').order('name');
      
      const { data: payrollData } = await supabase.from('payroll_history').select('*').order('month', { ascending: false });

      if (staffData) setStaff(staffData.map(s => ({
        ...s,
        leaveBalance: s.leave_balance,
        payrollHistory: payrollData?.filter(p => p.employee_id === s.id).map(p => ({
          ...p,
          netPay: p.net_pay || p.net_salary // Support both naming conventions
        })) || []
      })));

      const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*, staff(name)').order('date', { ascending: false });
      if (attendanceError) throw new Error(`Supabase error (attendance): ${attendanceError.message}`);
      if (attendanceData) setAttendance(attendanceData.map(a => ({
        ...a,
        empId: a.employee_id,
        name: (a as any).staff?.name,
        lateMinutes: a.late_minutes,
        isAuto: a.is_auto,
        checkIn: a.check_in,
        checkOut: a.check_out
      })));

      const { data: leavesData, error: leavesError } = await supabase.from('leaves').select('*, staff(name)').order('created_at', { ascending: false });
      if (leavesError) throw new Error(`Supabase error (leaves): ${leavesError.message}`);
      if (leavesData) setLeaves(leavesData.map(l => ({
        ...l,
        empId: l.employee_id,
        name: (l as any).staff?.name,
        start: l.start_date,
        end: l.end_date
      })));

      const { data: advanceData, error: advanceError } = await supabase.from('advance_salary').select('*, staff(name)').order('created_at', { ascending: false });
      if (advanceError) throw new Error(`Supabase error (advance_salary): ${advanceError.message}`);
      if (advanceData) setAdvances(advanceData.map(a => ({
        ...a,
        empId: a.employee_id,
        name: (a as any).staff?.name,
        date: a.request_date
      })));

      const { data: overtimeData, error: overtimeError } = await supabase.from('overtime').select('*, staff(name)').order('created_at', { ascending: false });
      if (overtimeError) throw new Error(`Supabase error (overtime): ${overtimeError.message}`);
      if (overtimeData) setOvertime(overtimeData.map(o => ({
        ...o,
        empId: o.employee_id,
        name: (o as any).staff?.name
      })));
    } catch (err) {
      console.error("Error fetching HR data:", err);
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

  // Outside Workers State
  const [outsideWorkers, setOutsideWorkers] = useState(DUMMY_OUTSIDE_WORKERS);
  const [outsideAssignments, setOutsideAssignments] = useState(DUMMY_OUTSIDE_ASSIGNMENTS);
  const [outsidePayments, setOutsidePayments] = useState(DUMMY_OUTSIDE_PAYMENTS);
  const [showAddOutsideModal, setShowAddOutsideModal] = useState(false);
  const [showAssignEventModal, setShowAssignEventModal] = useState(false);
  const [showOutsidePaymentModal, setShowOutsidePaymentModal] = useState(false);
  const [selectedOutsideWorker, setSelectedOutsideWorker] = useState<any>(null);
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [printRef, setPrintRef] = useState<any>(null);

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

  const generateEmpId = () => `EMP-${String(staff.length + 1).padStart(3, '0')}`;

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.role || !newStaff.email) {
      toast.error("Please fill all required fields");
      return;
    }
    const id = generateEmpId();
    const emp = {
      id,
      name: newStaff.name,
      role: newStaff.role,
      department: newStaff.department,
      salary: Number(newStaff.salary),
      phone: newStaff.phone,
      email: newStaff.email,
      address: newStaff.address,
      emergency_contact: newStaff.emergencyContact,
      status: newStaff.status,
      join_date: newStaff.joinDate,
      leave_balance: { annual: 14, sick: 10, casual: 10, maternity: 12, paternity: 5, hajj: 1 }
    };
    
    try {
      const { error } = await supabase.from('staff').insert([emp]);
      if (error) throw error;
      
      fetchHRData();
      setNewStaff({ 
        name: "", role: "", department: "", salary: "", phone: "", email: "", 
        address: "", emergencyContact: "", status: "active", joinDate: format(new Date(), "yyyy-MM-dd") 
      });
      setShowAddModal(false);
      logAction(`Added new staff member: ${emp.name}`, "HR & Staff");
      toast.success("Staff member added successfully");
    } catch (err: any) {
      console.error("Error adding staff:", err);
      toast.error(err.message || "Failed to add staff member");
    }
  };

  const handleUpdateStaff = async () => {
    if (!editStaff.name || !editStaff.role || !editStaff.email) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const { error } = await supabase.from('staff').update({
        name: editStaff.name,
        role: editStaff.role,
        department: editStaff.department,
        salary: Number(editStaff.salary),
        phone: editStaff.phone,
        email: editStaff.email,
        address: editStaff.address,
        emergency_contact: editStaff.emergency_contact || editStaff.emergencyContact,
        status: editStaff.status,
        join_date: editStaff.join_date || editStaff.joinDate
      }).eq('id', editStaff.id);
      
      if (error) throw error;
      
      fetchHRData();
      setShowEditModal(false);
      logAction(`Updated staff member: ${editStaff.name}`, "HR & Staff");
      toast.success("Staff member updated successfully");
    } catch (err: any) {
      console.error("Error updating staff:", err);
      toast.error(err.message || "Failed to update staff member");
    }
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error("Please fill all fields");
      return;
    }
    const announce = {
      id: announcements.length + 1,
      ...newAnnouncement,
      date: format(new Date(), "yyyy-MM-dd"),
      author: "Admin"
    };
    setAnnouncements([announce, ...announcements]);
    setNewAnnouncement({ title: "", content: "" });
    setShowAnnounceModal(false);
    toast.success("Announcement posted");
  };

  const handleMarkAttendance = async () => {
    const emp = staff.find(s => s.id === attendanceForm.empId);
    if (!emp) return;
    
    const record = {
      employee_id: attendanceForm.empId,
      date: attendanceForm.date,
      status: attendanceForm.status,
      check_in: attendanceForm.status === 'present' ? attendanceForm.checkIn : null,
      check_out: attendanceForm.status === 'present' ? attendanceForm.checkOut : null,
      late_minutes: attendanceForm.status === "late" ? Number(attendanceForm.lateMinutes) : 0,
      is_auto: false
    };
    
    try {
      // Check if attendance already exists for this employee on this date
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', attendanceForm.empId)
        .eq('date', attendanceForm.date)
        .single();
      
      if (existing) {
        const { error } = await supabase.from('attendance').update(record).eq('id', existing.id);
        if (error) throw error;
        toast.success("Attendance updated (override)");
      } else {
        const { error } = await supabase.from('attendance').insert([record]);
        if (error) throw error;
        toast.success("Attendance marked");
      }
      
      fetchHRData();
      setShowAttendanceModal(false);
    } catch (err: any) {
      console.error("Error marking attendance:", err);
      toast.error("Failed to mark attendance");
    }
  };

  const handleMarkAllPresent = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const markedIds = new Set(attendance.filter(a => a.date === today).map(a => a.empId));
    
    const newRecords = staff
      .filter(s => !markedIds.has(s.id))
      .map(s => ({
        employee_id: s.id,
        status: "present",
        date: today,
        check_in: "09:00",
        check_out: "18:00",
        late_minutes: 0,
        is_auto: false
      }));

    if (newRecords.length === 0) {
      toast.info("All staff members already have attendance marked for today");
      return;
    }

    try {
      const { error } = await supabase.from('attendance').insert(newRecords);
      if (error) throw error;
      
      fetchHRData();
      setMarkedAllPresent(true);
      toast.success(`Marked ${newRecords.length} staff members as Present`);
    } catch (err: any) {
      console.error("Error marking all present:", err);
      toast.error("Failed to mark bulk attendance");
    }
  };

  const handleAutoAbsent = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const markedIds = new Set(attendance.filter(a => a.date === today).map(a => a.empId));
    
    const absentees = staff
      .filter(s => !markedIds.has(s.id))
      .map(s => ({
        employee_id: s.id,
        status: "absent",
        date: today,
        is_auto: true
      }));

    if (absentees.length > 0) {
      try {
        const { error } = await supabase.from('attendance').insert(absentees);
        if (error) throw error;
        fetchHRData();
        toast.info(`Auto-marked ${absentees.length} missing staff as Absent`);
      } catch (err) {
        console.error("Error marking auto-absent:", err);
      }
    }
    setAttendanceChecked(true);
  };

  useEffect(() => {
    // Auto Attendance Logic: Mark absent at end of day or if triggered
    // In this app, we trigger it if attendance isn't marked by "midnight" (simulated by checking if it's a new day)
    const today = format(new Date(), "yyyy-MM-dd");
    const lastCheckedDate = localStorage.getItem('last_attendance_check');
    
    if (lastCheckedDate !== today) {
      // It's a new day, we should check yesterday's attendance and mark absent if missing
      // For simplicity in this demo, we'll just provide a way to trigger it or do it for "today" if requested
      // but the requirement says "automatically mark all employees as Absent if attendance not marked"
      // We'll simulate this by checking if any attendance exists for today. If not, and it's late in the day...
      
      const hour = new Date().getHours();
      if (hour >= 23 || hour < 1) { // Near midnight
        handleAutoAbsent();
        localStorage.setItem('last_attendance_check', today);
      }
    }
  }, [attendance, staff]);

  const handleBulkAttendance = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const markedIds = new Set(attendance.filter(a => a.date === today).map(a => a.empId));
    
    const newRecords = staff
      .filter(s => !markedIds.has(s.id))
      .map((s, index) => ({
        id: attendance.length + index + 1,
        empId: s.id,
        name: s.name,
        status: bulkStatus,
        date: today,
        checkIn: bulkStatus === "present" ? "09:00" : "-",
        checkOut: bulkStatus === "present" ? "18:00" : "-",
        lateMinutes: 0,
        isAuto: false
      }));

    if (newRecords.length > 0) {
      setAttendance([...newRecords, ...attendance]);
      toast.success(`Bulk marked ${newRecords.length} staff members as ${bulkStatus}`);
    } else {
      toast.info("All staff members already have attendance marked for today");
    }
    setShowBulkAttendanceModal(false);
  };

  const handleRequestLeave = async () => {
    const emp = staff.find(s => s.id === leaveForm.empId);
    if (!emp) return;
    
    try {
      const { error } = await supabase.from('leaves').insert([{
        employee_id: leaveForm.empId,
        type: leaveForm.type,
        start_date: leaveForm.start,
        end_date: leaveForm.end,
        reason: leaveForm.reason,
        status: 'pending'
      }]);
      
      if (error) throw error;
      
      fetchHRData();
      setShowLeaveRequestModal(false);
      toast.success("Leave request submitted");
    } catch (err: any) {
      console.error("Error requesting leave:", err);
      toast.error("Failed to submit leave request");
    }
  };

  const handleLeaveAction = async (id: number, status: string) => {
    try {
      const { error } = await supabase.from('leaves').update({ status }).eq('id', id);
      if (error) throw error;
      
      fetchHRData();
      toast.success(`Leave request ${status}`);
    } catch (err: any) {
      console.error("Error updating leave:", err);
      toast.error("Failed to update leave status");
    }
  };

  const handleAddPerformance = () => {
    const updatedStaff = staff.map(s => {
      if (s.id === performanceForm.empId) {
        return {
          ...s,
          performance: [...(s.performance || []), performanceForm.rating],
          performanceNotes: [...(s.performanceNotes || []), { note: performanceForm.notes, date: format(new Date(), "yyyy-MM-dd") }]
        };
      }
      return s;
    });
    setStaff(updatedStaff);
    setShowPerformanceModal(false);
    toast.success("Performance rating added");
  };

  const handleMarkAsPaid = async () => {
    const gross = payrollForm.basicSalary + payrollForm.allowances.houseRent + payrollForm.allowances.medical + payrollForm.allowances.conveyance + payrollForm.allowances.special + payrollForm.overtime.pay;
    const totalDeductions = payrollForm.deductions.tax + payrollForm.deductions.eobi + payrollForm.deductions.pessi + payrollForm.deductions.loans + payrollForm.deductions.late + payrollForm.deductions.absences;
    const netSalary = gross - totalDeductions;
    
    try {
      const { error } = await supabase.from('payroll_history').insert([{
        employee_id: payrollForm.empId,
        month: payrollForm.month,
        basic_salary: payrollForm.basicSalary,
        hra: payrollForm.allowances.houseRent,
        medical_allowance: payrollForm.allowances.medical,
        conveyance_allowance: payrollForm.allowances.conveyance,
        special_allowance: payrollForm.allowances.special,
        overtime_pay: payrollForm.overtime.pay,
        gross_salary: gross,
        income_tax: payrollForm.deductions.tax,
        eobi: payrollForm.deductions.eobi,
        pessi: payrollForm.deductions.pessi,
        loan_deduction: payrollForm.deductions.loans,
        late_deduction: payrollForm.deductions.late,
        absence_deduction: payrollForm.deductions.absences,
        net_salary: netSalary,
        net_pay: netSalary, // Add both for compatibility
        status: 'paid'
      }]);
      
      if (error) throw error;
      
      fetchHRData();
      setShowPayrollModal(false);
      toast.success(`Payroll processed for ${payrollForm.month}`);
    } catch (err: any) {
      console.error("Error processing payroll:", err);
      toast.error("Failed to process payroll");
    }
  };

  const prefillPayrollForm = (emp: any) => {
    const month = format(new Date(), "MMMM yyyy");
    const basic = emp.salary;
    
    // Standard Pakistani Allowances (Estimated)
    const hra = Math.round(basic * 0.45);
    const medical = Math.round(basic * 0.10);
    const conveyance = Math.round(basic * 0.10);
    const special = 0;

    // Deductions
    const eobi = calculateEOBI(basic);
    const pessi = calculatePESSI(basic);
    const tax = calculateTax(basic * 12);

    // Overtime
    const empOvertime = overtime.filter(o => o.empId === emp.id && o.status === 'pending');
    const otHours = empOvertime.reduce((sum, o) => sum + o.hours, 0);
    const hourlyRate = getHourlyRate(basic);
    const otPay = calculateOvertime(hourlyRate, otHours);

    // Attendance Deductions (Absences & Late)
    const monthAttendance = attendance.filter(a => a.empId === emp.id && a.date.startsWith(format(new Date(), "yyyy-MM")));
    const absences = monthAttendance.filter(a => a.status === 'absent').length;
    const lateDays = monthAttendance.filter(a => a.status === 'late').length;
    
    const dayRate = basic / 22;
    const absenceDeduction = absences * dayRate;
    const lateDeduction = lateDays > 3 ? (lateDays - 3) * (dayRate / 4) : 0; // Policy: 1/4 day pay after 3 late arrivals

    // Advances
    const empAdvances = advances.filter(a => a.empId === emp.id && a.status === 'approved');
    const advanceDeduction = empAdvances.reduce((sum, a) => sum + a.amount, 0);

    setPayrollForm({
      empId: emp.id,
      month,
      basicSalary: basic,
      allowances: { houseRent: hra, medical, conveyance, special },
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

  const handleUpdateRights = (id: string, rights: string[]) => {
    const updatedStaff = staff.map(s => s.id === id ? { ...s, rights } : s);
    setStaff(updatedStaff);
    setShowRightsModal(false);
    toast.success("User rights updated");
  };

  const handleAddOutsideWorker = () => {
    if (!newOutsideWorker.name || !newOutsideWorker.phone) {
      toast.error("Please fill name and phone");
      return;
    }
    const worker = {
      ...newOutsideWorker,
      id: `W-${String(outsideWorkers.length + 1).padStart(3, '0')}`,
      rate: Number(newOutsideWorker.rate),
      rating: 5,
      totalPaid: 0,
      pastEvents: [],
      avatar: null
    };
    setOutsideWorkers([...outsideWorkers, worker]);
    setShowAddOutsideModal(false);
    toast.success("Outside worker added");
  };

  const handleAssignToEvent = () => {
    if (!assignmentForm.eventId || !assignmentForm.workerId) {
      toast.error("Please select worker and event");
      return;
    }
    const newAssignment = {
      id: outsideAssignments.length + 1,
      ...assignmentForm,
      status: "unpaid",
      hours: 0,
      attendance: "pending"
    };
    setOutsideAssignments([...outsideAssignments, newAssignment]);
    
    // Update worker's past events
    setOutsideWorkers(outsideWorkers.map(w => 
      w.id === assignmentForm.workerId 
        ? { ...w, pastEvents: [...w.pastEvents, assignmentForm.eventId] }
        : w
    ));
    
    setShowAssignEventModal(false);
    toast.success("Worker assigned to event");
  };

  const handleOutsidePayment = () => {
    if (!outsidePaymentForm.amount || !outsidePaymentForm.workerId) {
      toast.error("Please fill amount and select worker");
      return;
    }
    const newPayment = {
      id: outsidePayments.length + 1,
      ...outsidePaymentForm,
      date: format(new Date(), "yyyy-MM-dd")
    };
    setOutsidePayments([...outsidePayments, newPayment]);
    
    // Update total paid for worker
    setOutsideWorkers(outsideWorkers.map(w => 
      w.id === outsidePaymentForm.workerId 
        ? { ...w, totalPaid: (w.totalPaid || 0) + Number(outsidePaymentForm.amount) }
        : w
    ));
    
    // Mark assignment as paid if linked to event
    if (outsidePaymentForm.eventId) {
      setOutsideAssignments(outsideAssignments.map(a => 
        (a.workerId === outsidePaymentForm.workerId && a.eventId === outsidePaymentForm.eventId)
          ? { ...a, status: "paid" }
          : a
      ));
    }
    
    setShowOutsidePaymentModal(false);
    toast.success("Payment recorded");
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
            .qr-placeholder { position: absolute; bottom: 10px; right: 10px; width: 40px; height: 40px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 6px; color: #94a3b8; text-align: center; }
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
              
              <div class="field">
                <p class="label">Worker Type</p>
                <p class="value">${worker.type}</p>
              </div>
              <div class="field">
                <p class="label">Contact</p>
                <p class="value">${worker.phone}</p>
              </div>
              <div class="field">
                <p class="label">City/Area</p>
                <p class="value">${worker.city}, ${worker.area}</p>
              </div>
              <div class="qr-placeholder">QR CODE</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportPayroll = () => {
    const data = staff.map((s) => {
      const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
      const netSalary = latestPayroll ? latestPayroll.netPay : s.salary;
      const status = latestPayroll ? "Paid" : "Pending";
      const basicSalary = latestPayroll ? latestPayroll.basic : s.salary;
      const bonus = latestPayroll ? latestPayroll.bonuses : 0;
      const deductions = latestPayroll ? (latestPayroll.deductions.tax + latestPayroll.deductions.loans + latestPayroll.deductions.absences) : 0;
      
      return {
        'Employee ID': s.id,
        'Staff Name': s.name,
        'Month': latestPayroll ? latestPayroll.month : format(new Date(), 'MMMM yyyy'),
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
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });
    saveAs(blob, `Payroll_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Payroll exported successfully to Excel");
  };

  const handleExportAttendance = () => {
    const data = attendance.map((a) => ({
      'Staff Name': a.name,
      'Employee ID': a.empId,
      'Date': a.date,
      'Check In': a.checkIn,
      'Check Out': a.checkOut,
      'Status': a.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });
    saveAs(blob, 'Attendance_March_2026.xlsx');
    toast.success("Attendance exported successfully to Excel");
  };

  const handleExportLedger = () => {
    if (!ledgerStaff) return;
    
    const data = (ledgerStaff.payrollHistory || []).map((h: any, index: number, array: any[]) => {
      // Calculate running balance
      const runningBalance = array.slice(0, index + 1).reduce((acc, curr) => acc + curr.netPay, 0);
      
      return {
        'Date': h.date,
        'Month': h.month,
        'Basic Salary': h.basic,
        'Transport': h.allowances.transport,
        'Meal': h.allowances.meal,
        'Housing': h.allowances.housing || 0,
        'Bonuses': h.bonuses,
        'Tax Deduction': h.deductions.tax,
        'Loan/Advance': h.deductions.loans,
        'Absence Deduction': h.deductions.absences,
        'Net Paid': h.netPay,
        'Running Total': runningBalance
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff_Ledger');
    
    // Add header row style if possible (optional)
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `Ledger_${ledgerStaff.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Ledger exported to Excel");
  };

  const handleExportLedgerPDF = () => {
    if (!ledgerStaff) return;
    toast.success("Downloading ledger as PDF...");
    
    let content = `STAFF PAYROLL LEDGER\n`;
    content += `Employee: ${ledgerStaff.name} (${ledgerStaff.id})\n`;
    content += `Date Generated: ${format(new Date(), 'PPP')}\n\n`;
    content += `Date | Month | Net Paid | Running Total\n`;
    content += `------------------------------------------\n`;
    
    let runningBalance = 0;
    (ledgerStaff.payrollHistory || []).forEach((h: any) => {
      runningBalance += h.netPay;
      content += `${h.date} | ${h.month} | Rs ${h.netPay.toLocaleString()} | Rs ${runningBalance.toLocaleString()}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Ledger_${ledgerStaff.id}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
  };

  const handleUpdateAttendance = (id: number, status: string) => {
    setAttendance(attendance.map(a => a.id === id ? { ...a, status } : a));
    setEditAttendanceId(null);
    toast.success("Attendance updated");
  };

  const handleExportTotalLedgerExcel = () => {
    const data: any[] = [];
    let grandTotal = 0;

    staff.forEach(s => {
      const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
      const status = latestPayroll ? "Paid" : "Pending";
      const basic = latestPayroll ? latestPayroll.basic : s.salary;
      const bonus = latestPayroll ? latestPayroll.bonuses : 0;
      const allowances = latestPayroll ? (latestPayroll.allowances.transport + latestPayroll.allowances.meal + (latestPayroll.allowances.housing || 0)) : 0;
      const deductions = latestPayroll ? (latestPayroll.deductions.tax + latestPayroll.deductions.loans + latestPayroll.deductions.absences) : 0;
      const netPay = latestPayroll ? latestPayroll.netPay : s.salary;
      grandTotal += netPay;

      data.push({
        'Employee ID': s.id,
        'Name': s.name,
        'Department': s.department,
        'Basic Salary': basic,
        'Bonus': bonus,
        'Allowances': allowances,
        'Deductions': deductions,
        'Net Pay': netPay,
        'Status': status,
        'Date': latestPayroll ? latestPayroll.date : '-'
      });
    });

    // Add Grand Total row
    data.push({});
    data.push({
      'Name': 'GRAND TOTAL',
      'Net Pay': grandTotal
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Total_Payroll_Ledger');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `Total_Payroll_Ledger_${format(new Date(), 'MMM_yyyy')}.xlsx`);
    toast.success("Total payroll ledger exported to Excel");
  };

  const handleRequestAdvance = async () => {
    const emp = staff.find(s => s.id === advanceForm.empId);
    if (!emp) return;
    
    try {
      const { error } = await supabase.from('advance_salary').insert([{
        employee_id: advanceForm.empId,
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason,
        status: 'pending'
      }]);
      
      if (error) throw error;
      
      fetchHRData();
      setShowAdvanceModal(false);
      logAction(`Requested advance for ${emp.name}: ₨ ${advanceForm.amount}`, "HR & Staff");
      toast.success("Advance request submitted");
    } catch (err: any) {
      console.error("Error requesting advance:", err);
      toast.error("Failed to submit advance request");
    }
  };

  const handleAdvanceAction = async (id: number, status: string) => {
    try {
      const { error } = await supabase.from('advance_salary').update({ status }).eq('id', id);
      if (error) throw error;
      
      fetchHRData();
      toast.success(`Advance request ${status}`);
    } catch (err: any) {
      console.error("Error updating advance:", err);
      toast.error("Failed to update advance status");
    }
  };

  const handleLogOvertime = async () => {
    const emp = staff.find(s => s.id === overtimeForm.empId);
    if (!emp) return;
    
    try {
      const { error } = await supabase.from('overtime').insert([{
        employee_id: overtimeForm.empId,
        hours: Number(overtimeForm.hours),
        date: overtimeForm.date,
        rate: 1.5,
        status: 'pending'
      }]);
      
      if (error) throw error;
      
      fetchHRData();
      setShowOvertimeModal(false);
      logAction(`Logged overtime for ${emp.name}: ${overtimeForm.hours} hours`, "HR & Staff");
      toast.success("Overtime logged");
    } catch (err: any) {
      console.error("Error logging overtime:", err);
      toast.error("Failed to log overtime");
    }
  };

  const handleOvertimeAction = async (id: number, status: string) => {
    try {
      const { error } = await supabase.from('overtime').update({ status }).eq('id', id);
      if (error) throw error;
      
      fetchHRData();
      toast.success(`Overtime marked as ${status}`);
    } catch (err: any) {
      console.error("Error updating overtime:", err);
      toast.error("Failed to update overtime status");
    }
  };

  const handleGeneratePayslip = (staff: any, payroll: any) => {
    const doc = new jsPDF();
    // Add company logo and header
    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74); // success color
    doc.text("Octonus Solutions", 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("Salary Payslip", 105, 28, { align: 'center' });

    // Employee details
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Employee Name: ${staff.name}`, 14, 45);
    doc.text(`Employee ID: ${staff.id}`, 14, 52);
    doc.text(`Designation: ${staff.role}`, 14, 59);
    doc.text(`Month & Year: ${payroll.month}`, 14, 66);

    // Earnings and Deductions tables
    const earnings = [
      ["Basic Salary", `Rs ${(payroll.basic_salary || 0).toLocaleString()}`],
      ["House Rent Allowance", `Rs ${(payroll.hra || 0).toLocaleString()}`],
      ["Medical Allowance", `Rs ${(payroll.medical_allowance || 0).toLocaleString()}`],
      ["Conveyance Allowance", `Rs ${(payroll.conveyance_allowance || 0).toLocaleString()}`],
      ["Special Allowance", `Rs ${(payroll.special_allowance || 0).toLocaleString()}`],
      ["Overtime Pay", `Rs ${(payroll.overtime_pay || 0).toLocaleString()}`],
    ];
    
    const deductions = [
      ["Income Tax", `Rs ${(payroll.income_tax || 0).toLocaleString()}`],
      ["EOBI", `Rs ${(payroll.eobi || 0).toLocaleString()}`],
      ["PESSI/SESSI", `Rs ${(payroll.pessi || 0).toLocaleString()}`],
      ["Loan/Advance", `Rs ${(payroll.loan_deduction || 0).toLocaleString()}`],
      ["Late Arrival", `Rs ${(payroll.late_deduction || 0).toLocaleString()}`],
      ["Absence", `Rs ${(payroll.absence_deduction || 0).toLocaleString()}`],
    ];

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

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Gross Salary: Rs ${(payroll.gross_salary || 0).toLocaleString()}`, 14, finalY);
    doc.text(`Net Salary: Rs ${(payroll.net_salary || 0).toLocaleString()}`, 14, finalY + 8);

    // Net salary in words
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Net Salary in Words:", 14, finalY + 18);
    doc.setFont("helvetica", "bold");
    doc.text(numberToWords(payroll.net_salary || 0).toUpperCase(), 14, finalY + 24);

    // Signature placeholders
    doc.setFont("helvetica", "normal");
    doc.text("__________________________", 14, finalY + 45);
    doc.text("Employee Signature", 14, finalY + 50);
    doc.text("__________________________", 140, finalY + 45);
    doc.text("Authorized Signature", 140, finalY + 50);

    doc.save(`Payslip_${staff.name}_${payroll.month}.pdf`);
  };


  const handleExportEOBIReport = () => {
    const data = staff.map(s => {
      const latestPayroll = s.payrollHistory?.[0]; // History is sorted by month desc
      return {
        "Employee ID": s.id,
        "Name": s.name,
        "Department": s.department,
        "Basic Salary": s.salary,
        "EOBI Contribution": latestPayroll ? latestPayroll.eobi : 0,
        "Month": latestPayroll ? latestPayroll.month : format(new Date(), "MMMM yyyy")
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
    const data = staff.map(s => {
      const latestPayroll = s.payrollHistory?.[0];
      return {
        "Employee ID": s.id,
        "Name": s.name,
        "Department": s.department,
        "Annual Salary": s.salary * 12,
        "Monthly Tax Deduction": latestPayroll ? latestPayroll.income_tax : 0,
        "Month": latestPayroll ? latestPayroll.month : format(new Date(), "MMMM yyyy")
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

  const handleDeleteStaff = async (id: string) => {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      
      fetchHRData();
      setShowDeleteConfirm(null);
      toast.success("Staff record deleted");
    } catch (err: any) {
      console.error("Error deleting staff:", err);
      toast.error("Failed to delete staff member");
    }
  };

  const handlePrintCard = (staff: any) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;

    const initials = staff.name.split(' ').map((n:any) => n[0]).join('').toUpperCase();
    const html = `
      <html>
        <head>
          <title>ID Card - ${staff.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .card { width: 350px; height: 220px; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; display: flex; border: 1px solid #e2e8f0; }
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
            <div class="left">
              <div class="avatar">${initials}</div>
              <div class="emp-id">${staff.id}</div>
            </div>
            <div class="right">
              <h1 class="name">${staff.name}</h1>
              <p class="role">${staff.role}</p>
              
              <div class="field">
                <p class="label">Department</p>
                <p class="value">${staff.department}</p>
              </div>
              <div class="field">
                <p class="label">Email</p>
                <p class="value">${staff.email}</p>
              </div>
              <div class="field">
                <p class="label">Joining Date</p>
                <p class="value">${staff.joinDate}</p>
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
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

    const tableData = staff.map(s => {
      const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
      return [
        s.id,
        s.name,
        s.department,
        `Rs ${((latestPayroll ? latestPayroll.basic : s.salary) || 0).toLocaleString()}`,
        `Rs ${((latestPayroll ? latestPayroll.bonuses : 0) || 0).toLocaleString()}`,
        `Rs ${((latestPayroll ? (latestPayroll.allowances.transport + latestPayroll.allowances.meal + (latestPayroll.allowances.housing || 0)) : 0) || 0).toLocaleString()}`,
        `Rs ${((latestPayroll ? (latestPayroll.deductions.tax + latestPayroll.deductions.loans + latestPayroll.deductions.absences) : 0) || 0).toLocaleString()}`,
        `Rs ${((latestPayroll ? latestPayroll.netPay : s.salary) || 0).toLocaleString()}`,
        latestPayroll ? "Paid" : "Pending",
        latestPayroll ? latestPayroll.date : '-'
      ];
    });

    const grandTotal = staff.reduce((acc, s) => {
      const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
      return acc + ((latestPayroll ? latestPayroll.netPay : s.salary) || 0);
    }, 0);

    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Name', 'Dept', 'Basic', 'Bonus', 'Allow.', 'Deduct.', 'Net Pay', 'Status', 'Date']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'GRAND TOTAL', `Rs ${grandTotal.toLocaleString()}`, '', '']],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save(`Total_Payroll_Ledger_${format(new Date(), 'MMM_yyyy')}.pdf`);
    toast.success("Total payroll ledger exported to PDF");
  };

  const filteredStaff = useMemo(() => staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);

  const monthlyPayrollTotal = useMemo(() => {
    // Sum of all net_pay (or net_salary) from payroll_history for all staff
    return staff.reduce((acc, s) => {
      return acc + (s.payrollHistory || []).reduce((sum: number, p: any) => sum + (p.netPay || 0), 0);
    }, 0);
  }, [staff]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading HR data...</p>
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
    <div className="space-y-4 sm:space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 text-primary animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary truncate">{announcements[0].title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{announcements[0].content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="profiles" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-2">
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
          
          <div className="flex items-center gap-4 w-full sm:w-auto bg-card border border-border rounded-lg px-4 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Monthly Total Payroll</span>
                <span className="text-sm font-bold text-success">
                  ₨ {(monthlyPayrollTotal || 0).toLocaleString()}
                </span>
              </div>
            <div className="h-8 w-[1px] bg-border mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Active Staff</span>
              <span className="text-sm font-bold">{staff.filter(s => s.status === 'active').length}</span>
            </div>
          </div>
        </div>

        {/* Staff Profiles */}
        <TabsContent value="profiles" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setViewMode("list")}
                className="h-8 gap-2"
              >
                <List className="h-4 w-4" /> List
              </Button>
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setViewMode("grid")}
                className="h-8 gap-2"
              >
                <LayoutGrid className="h-4 w-4" /> Cards
              </Button>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by ID, Name..." 
                className="pl-9 h-9 w-full" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-y border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role & Dept</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStaff.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-4 text-sm font-mono font-medium text-primary">{s.id}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-xs">
                              {s.name.split(" ").map((n:any) => n[0]).join("").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{s.phone}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-card-foreground">{s.role}</p>
                          <p className="text-[11px] text-muted-foreground">{s.department}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={`capitalize font-medium ${statusColor(s.status)}`}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintCard(s)}>
                              <Printer className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            {canDo("edit") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditStaff(s); setShowEditModal(true); }}>
                                <Edit className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLedgerStaff(s); setShowLedgerModal(true); }}>
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            {user?.role === "admin" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRightsStaff(s); setShowRightsModal(true); }}>
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            {canDo("delete") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(s.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map(s => (
                <div key={s.id} className="relative group overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary border-2 border-primary/20">
                        {s.name.split(' ').map((n:any) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-card-foreground leading-tight">{s.name}</h4>
                        <p className="text-xs text-muted-foreground font-medium">{s.role}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < (s.performance?.[s.performance.length-1] || 4) ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                      s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-border pt-4 text-[11px]">
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Staff ID</p>
                      <p className="font-bold">{s.id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Department</p>
                      <p className="font-bold">{s.department}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Monthly Salary</p>
                      <p className="font-bold text-success">₨ {(s.salary || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Joining Date</p>
                      <p className="font-bold">{s.joinDate}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Monthly Attendance</span>
                      <span className="text-sm font-black text-primary">{s.attendance}%</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedStaff(s); setShowViewModal(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-wider" onClick={() => handlePrintCard(s)}>
                        <Printer className="h-3 w-3" /> ID Card
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Outside Workers Management */}
        <TabsContent value="outside" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button 
                variant={outsideViewMode === "cards" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setOutsideViewMode("cards")}
                className="h-8 gap-2"
              >
                <Users className="h-4 w-4" /> Workers
              </Button>
              <Button 
                variant={outsideViewMode === "history" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setOutsideViewMode("history")}
                className="h-8 gap-2"
              >
                <History className="h-4 w-4" /> History & Payments
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search workers..." 
                  className="pl-9 h-9 w-full" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                {canDo("add") && (
                  <Button onClick={() => setShowAddOutsideModal(true)} className="gap-2 flex-1 sm:flex-none h-9">
                    <Plus className="h-4 w-4" /> Add Worker
                  </Button>
                )}
                {canDo("edit") && (
                  <>
                    <Button onClick={() => setShowAssignEventModal(true)} variant="outline" className="gap-2 flex-1 sm:flex-none h-9">
                      <CalendarDays className="h-4 w-4" /> Assign
                    </Button>
                    <Button onClick={() => setShowOutsidePaymentModal(true)} variant="outline" className="gap-2 flex-1 sm:flex-none h-9">
                      <Wallet2 className="h-4 w-4" /> Pay
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {outsideViewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outsideWorkers.filter(w => 
                w.name.toLowerCase().includes(search.toLowerCase()) || 
                w.skill.toLowerCase().includes(search.toLowerCase())
              ).map(worker => (
                <div key={worker.id} className="relative group overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary border-2 border-primary/20">
                        {worker.name[0]}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-card-foreground leading-tight">{worker.name}</h4>
                        <p className="text-xs text-primary font-bold uppercase tracking-wider">{worker.skill}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < worker.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`capitalize font-bold ${worker.status === 'available' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                      {worker.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-border pt-4 text-[11px]">
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Type</p>
                      <p className="font-bold">{worker.type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Rate</p>
                      <p className="font-bold">₨ {(worker.rate || 0).toLocaleString()} <span className="text-[9px] text-muted-foreground font-normal">{worker.rateType}</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Contact</p>
                      <p className="font-bold">{worker.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Location</p>
                      <p className="font-bold truncate">{worker.area}, {worker.city}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Paid</span>
                      <span className="text-sm font-black text-success">₨ {(worker.totalPaid || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-wider" onClick={() => handlePrintWorkerCard(worker)}>
                        <Printer className="h-3 w-3" /> Worker Card
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Recent Assignments</p>
                    <div className="space-y-2">
                      {outsideAssignments.filter(a => a.workerId === worker.id).slice(0, 2).map(a => (
                        <div key={a.id} className="flex items-center justify-between text-[10px] bg-muted/30 p-1.5 rounded">
                          <span className="font-bold truncate max-w-[120px]">{a.eventName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{a.date}</span>
                            <Badge variant="outline" className={`h-4 text-[8px] px-1 ${a.status === 'paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {a.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {outsideAssignments.filter(a => a.workerId === worker.id).length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">No past events found</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" /> Worker Assignments & Attendance
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Worker</th>
                        <th className="px-4 py-3 text-left">Event</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-center">Hours</th>
                        <th className="px-4 py-3 text-center">Attendance</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {outsideAssignments.filter(a => {
                        const w = outsideWorkers.find(x => x.id === a.workerId);
                        return w?.name.toLowerCase().includes(search.toLowerCase()) || 
                               a.eventName.toLowerCase().includes(search.toLowerCase());
                      }).map(a => (
                        <tr key={a.id} className="text-xs hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-bold">{outsideWorkers.find(w => w.id === a.workerId)?.name}</td>
                          <td className="px-4 py-3">{a.eventName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.date}</td>
                          <td className="px-4 py-3 text-right font-bold">₨ {(a.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <Input 
                              type="number" 
                              className="h-7 w-16 text-center mx-auto" 
                              value={a.hours} 
                              onChange={e => setOutsideAssignments(outsideAssignments.map(x => x.id === a.id ? { ...x, hours: Number(e.target.value) } : x))}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Select value={a.attendance} onValueChange={v => setOutsideAssignments(outsideAssignments.map(x => x.id === a.id ? { ...x, attendance: v } : x))}>
                              <SelectTrigger className="h-7 w-24 mx-auto text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={`h-5 text-[9px] capitalize ${a.status === 'paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[9px] gap-1"
                              disabled={a.status === 'paid'}
                              onClick={() => {
                                setOutsidePaymentForm({ workerId: a.workerId, amount: a.amount, method: "cash", eventId: a.eventId });
                                setShowOutsidePaymentModal(true);
                              }}
                            >
                              <Wallet2 className="h-3 w-3" /> Pay
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" /> Payment History
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Worker</th>
                        <th className="px-4 py-3 text-left">Method</th>
                        <th className="px-4 py-3 text-left">Reference</th>
                        <th className="px-4 py-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {outsidePayments.filter(p => {
                        const w = outsideWorkers.find(x => x.id === p.workerId);
                        return w?.name.toLowerCase().includes(search.toLowerCase()) || 
                               p.method.toLowerCase().includes(search.toLowerCase());
                      }).map(p => (
                        <tr key={p.id} className="text-xs hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                          <td className="px-4 py-3 font-bold">{outsideWorkers.find(w => w.id === p.workerId)?.name}</td>
                          <td className="px-4 py-3 capitalize">{p.method}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.eventId || "General Payment"}</td>
                          <td className="px-4 py-3 text-right font-bold text-success">₨ {(p.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Attendance Management */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              {canDo("add") && (
                <Button onClick={() => setShowAttendanceModal(true)} className="gap-2 flex-1 sm:flex-none">
                  <CheckCircle className="h-4 w-4" /> Mark Attendance
                </Button>
              )}
              {canDo("edit") && (
                <Button onClick={handleMarkAllPresent} variant="outline" className="gap-2 flex-1 sm:flex-none">
                  <Users className="h-4 w-4" /> Mark All Present
                </Button>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {canDo("edit") && (
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleAutoAbsent}>
                  <Clock className="h-4 w-4" /> Run Auto Absent
                </Button>
              )}
              {canDo("export") && (
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportAttendance}>
                  <Download className="h-4 w-4" /> Export Report
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">In/Out</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendance.map(a => (
                    <tr key={a.id} className="text-sm hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(a.date), 'MMM dd, yyyy')}</td>
                      <td className="px-4 py-3">
                        {editAttendanceId === a.id ? (
                          <Select defaultValue={a.status} onValueChange={(v) => handleUpdateAttendance(a.id, v)}>
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="half-day">Half Day</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.checkIn} - {a.checkOut}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditAttendanceId(editAttendanceId === a.id ? null : a.id)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Payroll System */}
        <TabsContent value="payroll" className="mt-4 space-y-4">
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
                  {staff.map(s => {
                    const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
                    const netSalary = latestPayroll ? latestPayroll.netPay : s.salary;
                    return (
                      <tr key={s.id} className="text-sm hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.id}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{latestPayroll ? latestPayroll.month : format(new Date(), 'MMMM yyyy')}</td>
                        <td className="px-4 py-3 font-bold text-success">₨ {(netSalary || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusColor(latestPayroll ? "paid" : "pending")}>
                            {latestPayroll ? "Paid" : "Pending"}
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
                      ₨ {(staff.reduce((acc, s) => {
                        const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
                        return acc + ((latestPayroll ? latestPayroll.netPay : s.salary) || 0);
                      }, 0) || 0).toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Leave Management */}
        <TabsContent value="leaves" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 flex-1 mr-4">
              {['Pending', 'Approved', 'Rejected'].map(status => (
                <div key={status} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{status} Requests</p>
                  <p className="mt-1 text-2xl font-bold">{leaves.filter(l => l.status.toLowerCase() === status.toLowerCase()).length}</p>
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
                  {leaves.map(l => (
                    <tr key={l.id} className="text-sm hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{l.name}</td>
                      <td className="px-4 py-3">{l.type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(l.start), 'MMM dd')} - {format(new Date(l.end), 'MMM dd')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColor(l.status)}>{l.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canDo("edit") && l.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-success text-success hover:bg-success/10" onClick={() => handleLeaveAction(l.id, 'approved')}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleLeaveAction(l.id, 'rejected')}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Overtime Management */}
        <TabsContent value="overtime" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {canDo("add") && (
              <Button onClick={() => setShowOvertimeModal(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Log Overtime
              </Button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
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
                  {overtime.map(o => (
                    <tr key={o.id} className="text-sm hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{o.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                      <td className="px-4 py-3">{o.hours}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColor(o.status)}>{o.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'pending' && canDo("edit") && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-success text-success hover:bg-success/10" onClick={() => handleOvertimeAction(o.id, 'paid')}>Mark as Paid</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Advances Management */}
        <TabsContent value="advances" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {canDo("add") && (
              <Button onClick={() => setShowAdvanceModal(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Request Advance
              </Button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
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
                  {advances.map(a => (
                    <tr key={a.id} className="text-sm hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.date}</td>
                      <td className="px-4 py-3">₨ {(a.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{a.reason}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.status === 'pending' && canDo("edit") && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-success text-success hover:bg-success/10" onClick={() => handleAdvanceAction(a.id, 'approved')}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleAdvanceAction(a.id, 'rejected')}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Performance Management */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {canDo("add") && (
              <Button onClick={() => setShowPerformanceModal(true)} className="gap-2">
                <Star className="h-4 w-4" /> Add Rating
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(s => (
              <div key={s.id} className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      className={`h-4 w-4 ${star <= (s.performance?.[s.performance.length-1] || 0) ? "fill-warning text-warning" : "text-muted-foreground"}`} 
                    />
                  ))}
                  <span className="ml-2 text-xs font-bold">{(s.performance?.[s.performance.length-1] || 0)}.0</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">History</p>
                  <div className="flex gap-1 h-8 items-end">
                    {(s.performance || []).map((p: any, i: number) => (
                      <div key={i} className="bg-primary/40 w-full rounded-t-sm" style={{ height: `${p * 20}%` }} title={`Rating: ${p}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="mt-4 space-y-4">
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
        </TabsContent>
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
          <DialogHeader>
            <DialogTitle>Mark Manual Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setAttendanceForm({ ...attendanceForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>)}
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
          <DialogFooter>
            <Button onClick={handleMarkAttendance} className="w-full">Save Attendance</Button>
          </DialogFooter>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 font-bold" onClick={handleBulkAttendance}>
              Mark All as {bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Modal */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Process Payroll - {payrollForm.month}</DialogTitle>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setLeaveForm({ ...leaveForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={leaveForm.start} onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={leaveForm.end} onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea placeholder="Brief reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRequestLeave} className="w-full">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Modal */}
      <Dialog open={showPerformanceModal} onOpenChange={setShowPerformanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Performance Rating</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setPerformanceForm({ ...performanceForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rating (1-5 Stars)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Button 
                    key={star} 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setPerformanceForm({ ...performanceForm, rating: star })}
                    className={performanceForm.rating >= star ? "text-warning" : "text-muted-foreground"}
                  >
                    <Star className={`h-6 w-6 ${performanceForm.rating >= star ? "fill-current" : ""}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Performance Notes</Label>
              <Textarea placeholder="Add feedback or notes..." value={performanceForm.notes} onChange={e => setPerformanceForm({ ...performanceForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddPerformance} className="w-full">Save Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Staff Profile</DialogTitle>
          </DialogHeader>
          {editStaff && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input value={editStaff.name} onChange={e => setEditStaff({ ...editStaff, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address *</Label>
                  <Input type="email" value={editStaff.email} onChange={e => setEditStaff({ ...editStaff, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Position / Role *</Label>
                  <Input value={editStaff.role} onChange={e => setEditStaff({ ...editStaff, role: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={editStaff.department} onValueChange={v => setEditStaff({ ...editStaff, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly Salary (₨) *</Label>
                  <Input type="number" value={editStaff.salary} onChange={e => setEditStaff({ ...editStaff, salary: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStaff.status} onValueChange={v => setEditStaff({ ...editStaff, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={editStaff.phone} onChange={e => setEditStaff({ ...editStaff, phone: e.target.value })} />
                </div>
                <div className="col-span-full space-y-1.5">
                  <Label>Residential Address</Label>
                  <Textarea value={editStaff.address} onChange={e => setEditStaff({ ...editStaff, address: e.target.value })} className="resize-none" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateStaff}>Update Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Ledger Modal */}
      <Dialog open={showLedgerModal} onOpenChange={setShowLedgerModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Ledger - {ledgerStaff?.name}</DialogTitle>
            <DialogDescription>Complete history of payments, advances, and deductions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-success">
                  ₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.netPay || 0), 0) || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Advances</p>
                <p className="text-lg font-bold text-destructive">
                  ₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.deductions.loans || 0), 0) || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-bold text-destructive">
                  ₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + ((h.deductions.tax || 0) + (h.deductions.absences || 0)), 0) || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Running Balance</p>
                <p className="text-lg font-bold text-primary">
                  ₨ {((ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.netPay || 0), 0) || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Month</th>
                      <th className="px-4 py-3 text-right">Basic</th>
                      <th className="px-4 py-3 text-right">Allowances</th>
                      <th className="px-4 py-3 text-right">Bonuses</th>
                      <th className="px-4 py-3 text-right text-destructive">Advances</th>
                      <th className="px-4 py-3 text-right text-destructive">Deductions</th>
                      <th className="px-4 py-3 text-right font-bold text-success">Net Paid</th>
                      <th className="px-4 py-3 text-right font-bold text-primary">Running Bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerStaff?.payrollHistory?.length > 0 ? (
                      (() => {
                        let runningBalance = 0;
                        return ledgerStaff.payrollHistory.map((h: any) => {
                          runningBalance += (h.netPay || 0);
                          return (
                            <tr key={h.id} className="text-sm hover:bg-muted/20">
                              <td className="px-4 py-3 text-muted-foreground">{h.date}</td>
                              <td className="px-4 py-3 font-medium">{h.month}</td>
                              <td className="px-4 py-3 text-right">₨ {(h.basic || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">₨ {((h.allowances.transport || 0) + (h.allowances.meal || 0) + (h.allowances.housing || 0)).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">₨ {(h.bonuses || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-destructive">₨ {(h.deductions.loans || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-destructive">₨ {((h.deductions.tax || 0) + (h.deductions.absences || 0)).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-bold text-success">₨ {(h.netPay || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-bold text-primary">₨ {(runningBalance || 0).toLocaleString()}</td>
                            </tr>
                          );
                        });
                      })()
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No payment history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowLedgerModal(false)}>Close Ledger</Button>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportLedger}><Download className="h-4 w-4" /> Excel</Button>
              <Button className="gap-2" onClick={handleExportLedgerPDF}><Download className="h-4 w-4" /> PDF</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Rights Modal */}
      <Dialog open={showRightsModal} onOpenChange={setShowRightsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Access Rights - {rightsStaff?.name}</DialogTitle>
            <DialogDescription>Select which modules this staff member can access.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {[
              { id: 'dashboard', label: 'Dashboard View' },
              { id: 'events', label: 'Event Booking' },
              { id: 'inventory', label: 'Inventory Management' },
              { id: 'expenses', label: 'Expense Tracking' },
              { id: 'hr', label: 'HR & Staff Management' },
              { id: 'finance', label: 'Finance & Accounts' }
            ].map(module => (
              <div key={module.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <Label htmlFor={`right-${module.id}`} className="flex-1 cursor-pointer">{module.label}</Label>
                <input 
                  type="checkbox" 
                  id={`right-${module.id}`}
                  checked={rightsStaff?.rights?.includes(module.id)}
                  onChange={(e) => {
                    const currentRights = rightsStaff?.rights || [];
                    const newRights = e.target.checked 
                      ? [...currentRights, module.id]
                      : currentRights.filter((r: string) => r !== module.id);
                    setRightsStaff({ ...rightsStaff, rights: newRights });
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRightsModal(false)}>Cancel</Button>
            <Button onClick={() => handleUpdateRights(rightsStaff.id, rightsStaff.rights)}>Save Permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Modal */}
      <Dialog open={showPayslipModal} onOpenChange={setShowPayslipModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Employee Payslip
            </DialogTitle>
            <DialogDescription>Monthly salary details for {selectedPayslip?.staff.name}</DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-6 py-4 border-t border-border mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Employee Name</Label>
                  <p className="font-medium">{selectedPayslip.staff.name}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Employee ID</Label>
                  <p className="font-medium">{selectedPayslip.staff.id}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pay Month</Label>
                  <p className="font-medium">{selectedPayslip.payroll.month}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Status</Label>
                  <Badge variant="outline" className={`capitalize ${statusColor(selectedPayslip.payroll.status)}`}>
                    {selectedPayslip.payroll.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Basic Salary</span>
                  <span>₨ {(selectedPayslip.payroll.basic || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Allowances (Transport, Meal, Housing)</span>
                  <span>₨ {((selectedPayslip.payroll.allowances.transport || 0) + (selectedPayslip.payroll.allowances.meal || 0) + (selectedPayslip.payroll.allowances.housing || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Bonuses</span>
                  <span>₨ {(selectedPayslip.payroll.bonuses || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                  <span>Deductions (Tax, Loan, Absence)</span>
                  <span>-₨ {((selectedPayslip.payroll.deductions.tax || 0) + (selectedPayslip.payroll.deductions.loans || 0) + (selectedPayslip.payroll.deductions.absences || 0)).toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-border my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Net Payable</span>
                  <span className="text-success">₨ {(selectedPayslip.payroll.netPay || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPayslipModal(false)}>Close</Button>
            <Button className="gap-2" onClick={() => {
              toast.success("Downloading payslip as PDF...");
              // Simulated PDF download
              const content = `Payslip for ${selectedPayslip?.staff.name} - ${selectedPayslip?.payroll.month}\nNet Pay: Rs ${ (selectedPayslip?.payroll.netPay || 0).toLocaleString()}`;
              const blob = new Blob([content], { type: 'text/plain' });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `payslip_${selectedPayslip?.staff.id}_${selectedPayslip?.payroll.month}.txt`;
              link.click();
            }}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Staff Modal - Upgraded with Profile & Tabs */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl border-none">
          {selectedStaff && (
            <div className="flex flex-col h-[80vh] sm:h-auto">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20">
                        {selectedStaff.name.split(" ").map((n:any) => n[0]).join("").toUpperCase()}
                      </div>
                      <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary shadow-sm transition-transform active:scale-95">
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-foreground truncate">{selectedStaff.name}</h2>
                      <p className="text-sm font-medium text-primary/80">{selectedStaff.role}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 h-5 bg-white">{selectedStaff.id}</Badge>
                    </div>
                  </div>
                  <Badge className={`capitalize py-1 px-3 ${statusColor(selectedStaff.status)}`}>{selectedStaff.status}</Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Department</Label>
                    <p className="text-sm font-medium">{selectedStaff.department}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Salary</Label>
                    <p className="text-sm font-bold text-success">₨ {(selectedStaff.salary || 0)?.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label>
                    <p className="text-sm font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phone Number</Label>
                    <p className="text-sm font-medium flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.phone}</p>
                  </div>
                  <div className="col-span-full space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Residential Address</Label>
                    <p className="text-sm font-medium flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /> {selectedStaff.address}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Joining Date</Label>
                    <p className="text-sm font-medium flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {selectedStaff.joinDate}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Emergency Contact</Label>
                    <p className="text-sm font-medium text-destructive">{selectedStaff.emergencyContact}</p>
                  </div>
                </div>

                {/* Status History */}
                <div className="pt-4 border-t border-border">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 block">Employment Status History</Label>
                  <div className="space-y-3">
                    {(selectedStaff.statusHistory || [{ status: "active", date: selectedStaff.joinDate }]).map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-bold capitalize">{h.status}</span>
                        <span className="text-muted-foreground">— {h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 block">Documents</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Employment_Contract.pdf', 'National_ID_Card.jpg'].map(doc => (
                      <div key={doc} className="flex items-center justify-between p-2 rounded-lg border border-dashed border-border bg-muted/20 group hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-[11px] truncate">{doc}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><Download className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>Close Profile</Button>
                <Button className="bg-primary hover:bg-primary/90">Edit Information</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Outside Worker Modal */}
      <Dialog open={showAddOutsideModal} onOpenChange={setShowAddOutsideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Outside Worker</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Zahid Ali" value={newOutsideWorker.name} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Worker Type</Label>
              <Select value={newOutsideWorker.type} onValueChange={v => setNewOutsideWorker({ ...newOutsideWorker, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                  <SelectItem value="Daily Wage">Daily Wage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Skill / Service</Label>
              <Select value={newOutsideWorker.skill} onValueChange={v => setNewOutsideWorker({ ...newOutsideWorker, skill: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Decorator", "Caterer", "DJ", "Photographer", "Driver", "Security", "Waiter", "Cleaner"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input placeholder="0300-0000000" value={newOutsideWorker.phone} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp Number</Label>
              <Input placeholder="0300-0000000" value={newOutsideWorker.whatsapp} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, whatsapp: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate</Label>
              <Input type="number" placeholder="5000" value={newOutsideWorker.rate} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, rate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={newOutsideWorker.rateType} onValueChange={v => setNewOutsideWorker({ ...newOutsideWorker, rateType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per hour">Per Hour</SelectItem>
                  <SelectItem value="per day">Per Day</SelectItem>
                  <SelectItem value="per event">Per Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={newOutsideWorker.city} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Input placeholder="e.g. Gulshan" value={newOutsideWorker.area} onChange={e => setNewOutsideWorker({ ...newOutsideWorker, area: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOutsideModal(false)}>Cancel</Button>
            <Button onClick={handleAddOutsideWorker}>Add Worker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Worker to Event Modal */}
      <Dialog open={showAssignEventModal} onOpenChange={setShowAssignEventModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Worker to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Select Worker</Label>
              <Select onValueChange={v => setAssignmentForm({ ...assignmentForm, workerId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose Worker" /></SelectTrigger>
                <SelectContent>
                  {outsideWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.skill})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event Name</Label>
              <Input placeholder="e.g. Wedding Ceremony" value={assignmentForm.eventName} onChange={e => setAssignmentForm({ ...assignmentForm, eventName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Event Date</Label>
                <Input type="date" value={assignmentForm.date} onChange={e => setAssignmentForm({ ...assignmentForm, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Amount (₨)</Label>
                <Input type="number" value={assignmentForm.amount} onChange={e => setAssignmentForm({ ...assignmentForm, amount: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignEventModal(false)}>Cancel</Button>
            <Button onClick={handleAssignToEvent}>Assign Worker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Outside Payment Modal */}
      <Dialog open={showOutsidePaymentModal} onOpenChange={setShowOutsidePaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Worker Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Select Worker</Label>
              <Select onValueChange={v => setOutsidePaymentForm({ ...outsidePaymentForm, workerId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose Worker" /></SelectTrigger>
                <SelectContent>
                  {outsideWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name} (₨ {(w.totalPaid || 0).toLocaleString()} paid)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link to Assignment (Optional)</Label>
              <Select onValueChange={v => {
                const a = outsideAssignments.find(x => x.id === Number(v));
                if (a) setOutsidePaymentForm({ ...outsidePaymentForm, eventId: a.eventId, amount: a.amount });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose Assignment" /></SelectTrigger>
                <SelectContent>
                  {outsideAssignments.filter(a => a.status === 'unpaid').map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.eventName} - ₨ {a.amount}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Amount (₨)</Label>
                <Input type="number" value={outsidePaymentForm.amount} onChange={e => setOutsidePaymentForm({ ...outsidePaymentForm, amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={outsidePaymentForm.method} onValueChange={v => setOutsidePaymentForm({ ...outsidePaymentForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowOutsidePaymentModal(false)}>Cancel</Button>
             <Button onClick={handleOutsidePayment}>Record Payment</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Overtime Modal */}
      <Dialog open={showOvertimeModal} onOpenChange={setShowOvertimeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setOvertimeForm({ ...overtimeForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Overtime Hours</Label>
                <Input type="number" value={overtimeForm.hours} onChange={e => setOvertimeForm({ ...overtimeForm, hours: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={overtimeForm.date} onChange={e => setOvertimeForm({ ...overtimeForm, date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleLogOvertime} className="w-full">Log Overtime</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Salary Modal */}
      <Dialog open={showAdvanceModal} onOpenChange={setShowAdvanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Advance Salary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select onValueChange={v => setAdvanceForm({ ...advanceForm, empId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₨)</Label>
              <Input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea placeholder="Brief reason for advance..." value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRequestAdvance} className="w-full">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="text-destructive flex items-center gap-2">
               <Trash2 className="h-5 w-5" /> Delete Staff Record?
             </DialogTitle>
             <DialogDescription>
               This action cannot be undone. All data related to this staff member (attendance, payroll, history) will be permanently removed.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="gap-2 sm:gap-0">
             <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Keep Record</Button>
             <Button variant="destructive" onClick={() => showDeleteConfirm && handleDeleteStaff(showDeleteConfirm)}>Yes, Delete Staff</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Total Payroll Ledger Modal */}
      <Dialog open={showTotalLedgerModal} onOpenChange={setShowTotalLedgerModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" /> Total Payroll Ledger Dashboard
                </DialogTitle>
                <DialogDescription>
                  Financial overview of all staff salaries, advances, and deductions.
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportTotalLedgerExcel}>
                  <Download className="h-4 w-4" /> Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportTotalLedgerPDF}>
                  <FileText className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { 
                  label: "Total Paid (Month)", 
                  value: `₨ ${staff.reduce((acc, s) => {
                    const latestPayroll = s.payrollHistory?.find(h => h.month === format(new Date(), 'MMMM yyyy'));
                    return acc + ((latestPayroll?.status === 'paid' ? latestPayroll.netPay : 0) || 0);
                  }, 0).toLocaleString()}`,
                  icon: DollarSign,
                  color: "text-success",
                  bg: "bg-success/10"
                },
                { 
                  label: "Total Payments", 
                  value: staff.reduce((acc, s) => acc + (s.payrollHistory?.length || 0), 0),
                  icon: CheckCircle,
                  color: "text-primary",
                  bg: "bg-primary/10"
                },
                { 
                  label: "Pending Payments", 
                  value: staff.filter(s => !s.payrollHistory?.some(h => h.month === format(new Date(), 'MMMM yyyy'))).length,
                  icon: Clock,
                  color: "text-warning",
                  bg: "bg-warning/10"
                },
                { 
                  label: "Total Advances", 
                  value: `₨ ${staff.reduce((acc, s) => acc + ((s.payrollHistory?.reduce((sum, h) => sum + (h.deductions.loans || 0), 0) || 0)), 0).toLocaleString()}`,
                  icon: Receipt,
                  color: "text-destructive",
                  bg: "bg-destructive/10"
                },
                { 
                  label: "Total Deductions", 
                  value: `₨ ${staff.reduce((acc, s) => acc + ((s.payrollHistory?.reduce((sum, h) => sum + ((h.deductions.tax || 0) + (h.deductions.absences || 0)), 0) || 0)), 0).toLocaleString()}`,
                  icon: TrendingDown,
                  color: "text-destructive",
                  bg: "bg-destructive/10"
                }
              ].map((card, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${card.bg}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{card.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Monthly Payroll Trend (Last 6 Months)
                </h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={
                      Array.from({ length: 6 }).map((_, i) => {
                        const date = subMonths(new Date(), 5 - i);
                        const monthName = format(date, 'MMM yyyy');
                        const total = staff.reduce((acc, s) => {
                          const payroll = s.payrollHistory?.find(h => h.month === format(date, 'MMMM yyyy'));
                          return acc + (payroll?.netPay || 0);
                        }, 0);
                        return { month: monthName, total };
                      })
                    }>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₨${v/1000}k`} />
                      <Tooltip 
                        formatter={(v: any) => [`₨ ${(v || 0).toLocaleString()}`, 'Total Payroll']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" /> Salary Distribution by Department
                </h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          ["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(dept => ({
                            name: dept,
                            value: staff.filter(s => s.department === dept).reduce((acc, s) => acc + s.salary, 0)
                          })).filter(d => d.value > 0)
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`₨ ${(v || 0).toLocaleString()}`, 'Salary']} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Ledger Table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <h4 className="text-sm font-bold">Detailed Payroll Ledger</h4>
                <Badge variant="outline" className="bg-white">Total Employees: {staff.length}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-4 text-left">Employee</th>
                      <th className="px-4 py-4 text-right">Basic</th>
                      <th className="px-4 py-4 text-right">Bonus</th>
                      <th className="px-4 py-4 text-right">Allowances</th>
                      <th className="px-4 py-4 text-right">Deductions</th>
                      <th className="px-4 py-4 text-right font-bold text-foreground">Net Pay</th>
                      <th className="px-4 py-4 text-center">Status</th>
                      <th className="px-4 py-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staff.map(s => {
                      const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
                      const basic = latestPayroll ? latestPayroll.basic : s.salary;
                      const bonus = latestPayroll ? latestPayroll.bonuses : 0;
                      const allowances = latestPayroll ? (latestPayroll.allowances.transport + latestPayroll.allowances.meal + (latestPayroll.allowances.housing || 0)) : 0;
                      const deductions = latestPayroll ? (latestPayroll.deductions.tax + latestPayroll.deductions.loans + latestPayroll.deductions.absences) : 0;
                      const netPay = latestPayroll ? latestPayroll.netPay : s.salary;

                      return (
                        <tr key={s.id} className="text-sm hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                {s.name.split(" ").map((n:any) => n[0]).join("").toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-xs">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{s.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-xs">₨ {(basic || 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-xs text-success">₨ {(bonus || 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-xs text-primary">₨ {(allowances || 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-xs text-destructive">₨ {(deductions || 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-right font-bold text-success">₨ {(netPay || 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-center">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusColor(latestPayroll ? "paid" : "pending")}`}>
                              {latestPayroll ? "Paid" : "Pending"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right text-xs text-muted-foreground">{latestPayroll ? latestPayroll.date : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/40 font-bold border-t-2 border-border">
                    <tr>
                      <td className="px-4 py-6 text-sm uppercase tracking-wider">Grand Total</td>
                      <td colSpan={4}></td>
                      <td className="px-4 py-6 text-right text-lg text-success">
                        ₨ {(staff.reduce((acc, s) => {
                          const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
                          return acc + ((latestPayroll ? latestPayroll.netPay : s.salary) || 0);
                        }, 0) || 0).toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTotalLedgerModal(false)} className="w-full sm:w-auto">Close Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Staff</DialogTitle>
            <DialogDescription>Enter employee details to generate an ID and create a profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="e.g. Ahmed Raza" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="email@octonus.com" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Position / Role *</Label>
                <Input placeholder="e.g. Chef" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={newStaff.department} onValueChange={v => setNewStaff({ ...newStaff, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                  <SelectContent>
                    {["Operations", "Kitchen", "Decoration", "Finance", "Logistics", "Admin"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Salary (₨) *</Label>
                <Input type="number" placeholder="e.g. 35000" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input placeholder="0300-0000000" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
              </div>
              <div className="col-span-full space-y-1.5">
                <Label>Residential Address</Label>
                <Textarea placeholder="Full address..." value={newStaff.address} onChange={e => setNewStaff({ ...newStaff, address: e.target.value })} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Contact</Label>
                <Input placeholder="Name - Phone" value={newStaff.emergencyContact} onChange={e => setNewStaff({ ...newStaff, emergencyContact: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Joining Date</Label>
                <Input type="date" value={newStaff.joinDate} onChange={e => setNewStaff({ ...newStaff, joinDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddStaff} className="bg-primary shadow-lg shadow-primary/20">Complete Registration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRStaff;
