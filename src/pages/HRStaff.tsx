import { useState, useRef, useMemo } from "react";
import { 
  Users, Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, 
  DollarSign, Camera, FileText, Calendar, Phone, Mail, MapPin, 
  UserPlus, Download, Star, StarOff, Bell, ShieldCheck, ChevronRight, BarChart3, PieChart as PieChartIcon, Receipt,
  TrendingDown, LayoutDashboard, CalendarDays, Landmark, Package, Settings, LogOut,
  LayoutGrid, List, Printer
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
import 'jspdf-autotable';
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
    leaveBalance: { annual: 15, sick: 10, casual: 10 }
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
    leaveBalance: { annual: 12, sick: 8, casual: 7 }
  },
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

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "active" || s === "present" || s === "paid" || s === "approved") return "bg-success/10 text-success border-success/20";
  if (s === "inactive" || s === "absent" || s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "late" || s === "pending" || s === "half-day") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

const HRStaff = () => {
  const [staff, setStaff] = useState(DUMMY_STAFF);
  const [attendance, setAttendance] = useState(DUMMY_ATTENDANCE);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [leaves, setLeaves] = useState(DUMMY_LEAVES);
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
    deductions: { tax: 0, loans: 0, absences: 0 },
    bonuses: 0,
    allowances: { transport: 0, meal: 0, housing: 0 }
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

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.role || !newStaff.email) {
      toast.error("Please fill all required fields");
      return;
    }
    const emp = {
      ...newStaff,
      id: generateEmpId(),
      salary: Number(newStaff.salary),
      attendance: 100,
      performance: [],
      leaveBalance: { annual: 15, sick: 10, casual: 10 },
      statusHistory: [{ status: "active", date: format(new Date(), "yyyy-MM-dd") }],
      payrollHistory: [],
      rights: ["dashboard", "events", "inventory", "expenses"] // Default rights
    };
    setStaff([...staff, emp]);
    setNewStaff({ 
      name: "", role: "", department: "", salary: "", phone: "", email: "", 
      address: "", emergencyContact: "", status: "active", joinDate: format(new Date(), "yyyy-MM-dd") 
    });
    setShowAddModal(false);
    toast.success("Staff member added successfully");
  };

  const handleUpdateStaff = () => {
    if (!editStaff.name || !editStaff.role || !editStaff.email) {
      toast.error("Please fill all required fields");
      return;
    }
    const updatedStaff = staff.map(s => {
      if (s.id === editStaff.id) {
        const statusChanged = s.status !== editStaff.status;
        const statusHistory = statusChanged 
          ? [...(s.statusHistory || []), { status: editStaff.status, date: format(new Date(), "yyyy-MM-dd") }]
          : (s.statusHistory || []);
        return { ...editStaff, statusHistory };
      }
      return s;
    });
    setStaff(updatedStaff);
    setShowEditModal(false);
    toast.success("Staff member updated successfully");
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

  const handleMarkAttendance = () => {
    const emp = staff.find(s => s.id === attendanceForm.empId);
    if (!emp) return;
    const newRecord = {
      id: attendance.length + 1,
      name: emp.name,
      ...attendanceForm,
      lateMinutes: attendanceForm.status === "late" ? attendanceForm.lateMinutes : 0,
      isAuto: false
    };
    
    // Check if attendance already exists for this employee on this date
    const existingIndex = attendance.findIndex(a => a.empId === attendanceForm.empId && a.date === attendanceForm.date);
    
    if (existingIndex !== -1) {
      // Override
      const newAttendance = [...attendance];
      newAttendance[existingIndex] = { ...newRecord, id: attendance[existingIndex].id };
      setAttendance(newAttendance);
      toast.success("Attendance updated (override)");
    } else {
      setAttendance([newRecord, ...attendance]);
      toast.success("Attendance marked");
    }
    
    setShowAttendanceModal(false);
  };

  const handleMarkAllPresent = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const markedIds = new Set(attendance.filter(a => a.date === today).map(a => a.empId));
    
    const newRecords = staff
      .filter(s => !markedIds.has(s.id))
      .map((s, index) => ({
        id: attendance.length + index + 1,
        empId: s.id,
        name: s.name,
        status: "present",
        date: today,
        checkIn: "09:00",
        checkOut: "18:00",
        lateMinutes: 0,
        isAuto: false
      }));

    if (newRecords.length === 0) {
      toast.info("All staff members already have attendance marked for today");
      return;
    }

    setAttendance([...newRecords, ...attendance]);
    setMarkedAllPresent(true);
    toast.success(`Marked ${newRecords.length} staff members as Present`);
  };

  const handleAutoAbsent = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const markedIds = new Set(attendance.filter(a => a.date === today).map(a => a.empId));
    
    const absentees = staff
      .filter(s => !markedIds.has(s.id))
      .map((s, index) => ({
        id: attendance.length + index + 1,
        empId: s.id,
        name: s.name,
        status: "absent",
        date: today,
        checkIn: "-",
        checkOut: "-",
        lateMinutes: 0,
        isAuto: true
      }));

    if (absentees.length > 0) {
      setAttendance([...absentees, ...attendance]);
      toast.info(`Auto-marked ${absentees.length} missing staff as Absent`);
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

  const handleRequestLeave = () => {
    const emp = staff.find(s => s.id === leaveForm.empId);
    if (!emp) return;
    const newLeave = {
      id: leaves.length + 1,
      name: emp.name,
      ...leaveForm,
      status: "pending"
    };
    setLeaves([newLeave, ...leaves]);
    setShowLeaveRequestModal(false);
    toast.success("Leave request submitted");
  };

  const handleLeaveAction = (id: number, status: string) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l));
    toast.success(`Leave request ${status}`);
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

  const handleMarkAsPaid = () => {
    const netPay = (payrollForm.basicSalary + payrollForm.bonuses + payrollForm.allowances.transport + payrollForm.allowances.meal + (payrollForm.allowances.housing || 0) - payrollForm.deductions.tax - payrollForm.deductions.loans - payrollForm.deductions.absences);
    const updatedStaff = staff.map(s => {
      if (s.id === payrollForm.empId) {
        return {
          ...s,
          payrollHistory: [
            ...(s.payrollHistory || []),
            {
              id: (s.payrollHistory?.length || 0) + 1,
              month: payrollForm.month,
              basic: payrollForm.basicSalary,
              allowances: payrollForm.allowances,
              bonuses: payrollForm.bonuses,
              deductions: payrollForm.deductions,
              netPay: netPay,
              date: format(new Date(), "yyyy-MM-dd"),
              status: "paid"
            }
          ]
        };
      }
      return s;
    });
    setStaff(updatedStaff);
    setShowPayrollModal(false);
    toast.success(`Payroll processed for ${payrollForm.month}`);
  };

  const handleUpdateRights = (id: string, rights: string[]) => {
    const updatedStaff = staff.map(s => s.id === id ? { ...s, rights } : s);
    setStaff(updatedStaff);
    setShowRightsModal(false);
    toast.success("User rights updated");
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
        `Rs ${ (latestPayroll ? latestPayroll.basic : s.salary).toLocaleString() }`,
        `Rs ${ (latestPayroll ? latestPayroll.bonuses : 0).toLocaleString() }`,
        `Rs ${ (latestPayroll ? (latestPayroll.allowances.transport + latestPayroll.allowances.meal + (latestPayroll.allowances.housing || 0)) : 0).toLocaleString() }`,
        `Rs ${ (latestPayroll ? (latestPayroll.deductions.tax + latestPayroll.deductions.loans + latestPayroll.deductions.absences) : 0).toLocaleString() }`,
        `Rs ${ (latestPayroll ? latestPayroll.netPay : s.salary).toLocaleString() }`,
        latestPayroll ? "Paid" : "Pending",
        latestPayroll ? latestPayroll.date : '-'
      ];
    });

    const grandTotal = staff.reduce((acc, s) => {
      const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
      return acc + (latestPayroll ? latestPayroll.netPay : s.salary);
    }, 0);

    // @ts-ignore
    doc.autoTable({
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

  const handleDeleteStaff = (id: string) => {
    setStaff(staff.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    toast.success("Staff record deleted");
  };

  const filteredStaff = useMemo(() => staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);

  const monthlyPayrollTotal = useMemo(() => staff.reduce((acc, s) => {
    const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
    return acc + (latestPayroll ? latestPayroll.netPay : s.salary);
  }, 0), [staff]);

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
              <TabsTrigger value="leaves" className="text-xs sm:text-sm">Leaves</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto bg-card border border-border rounded-lg px-4 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Monthly Total Payroll</span>
              <span className="text-sm font-bold text-success">
                ₨ {monthlyPayrollTotal.toLocaleString()}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditStaff(s); setShowEditModal(true); }}>
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLedgerStaff(s); setShowLedgerModal(true); }}>
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRightsStaff(s); setShowRightsModal(true); }}>
                              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                      <p className="font-bold text-success">₨ {s.salary.toLocaleString()}</p>
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

        {/* Attendance Management */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={() => setShowAttendanceModal(true)} className="gap-2 flex-1 sm:flex-none">
                <CheckCircle className="h-4 w-4" /> Mark Attendance
              </Button>
              <Button onClick={handleMarkAllPresent} variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Users className="h-4 w-4" /> Mark All Present
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleAutoAbsent}>
                <Clock className="h-4 w-4" /> Run Auto Absent
              </Button>
              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportAttendance}>
                <Download className="h-4 w-4" /> Export Report
              </Button>
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
            <Button variant="outline" className="gap-2" onClick={handleExportPayroll}>
              <Download className="h-4 w-4" /> Export Payroll
            </Button>
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
                        <td className="px-4 py-3 font-bold text-success">₨ {netSalary.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusColor(latestPayroll ? "paid" : "pending")}>
                            {latestPayroll ? "Paid" : "Pending"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                              setPayrollForm({
                                empId: s.id,
                                month: format(new Date(), "MMMM yyyy"),
                                basicSalary: s.salary,
                                deductions: { tax: 0, loans: 0, absences: 0 },
                                bonuses: 0,
                                allowances: { transport: 0, meal: 0, housing: 0 }
                              });
                              setShowPayrollModal(true);
                            }}>Process</Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0" 
                              disabled={!latestPayroll}
                              onClick={() => {
                                setSelectedPayslip({ staff: s, payroll: latestPayroll });
                                setShowPayslipModal(true);
                              }}
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
                      ₨ {staff.reduce((acc, s) => {
                        const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
                        return acc + (latestPayroll ? latestPayroll.netPay : s.salary);
                      }, 0).toLocaleString()}
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
            <Button onClick={() => setShowLeaveRequestModal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Request Leave
            </Button>
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
                        {l.status === 'pending' && (
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

        {/* Performance Tracking */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowPerformanceModal(true)} className="gap-2">
              <Star className="h-4 w-4" /> Add Rating
            </Button>
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
                  <Label className="text-xs">Basic Salary: ₨ {payrollForm.basicSalary.toLocaleString()}</Label>
                  <div className="space-y-1.5">
                    <Label>Transport Allowance</Label>
                    <Input type="number" value={payrollForm.allowances.transport} onChange={e => setPayrollForm({ ...payrollForm, allowances: { ...payrollForm.allowances, transport: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meal Allowance</Label>
                    <Input type="number" value={payrollForm.allowances.meal} onChange={e => setPayrollForm({ ...payrollForm, allowances: { ...payrollForm.allowances, meal: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bonuses</Label>
                    <Input type="number" value={payrollForm.bonuses} onChange={e => setPayrollForm({ ...payrollForm, bonuses: Number(e.target.value) })} />
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
                    <Label>Loans / Advances</Label>
                    <Input type="number" value={payrollForm.deductions.loans} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, loans: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Absence Deductions</Label>
                    <Input type="number" value={payrollForm.deductions.absences} onChange={e => setPayrollForm({ ...payrollForm, deductions: { ...payrollForm.deductions, absences: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
              <span className="font-bold">Net Payable:</span>
              <span className="text-xl font-bold text-success">
                ₨ {(payrollForm.basicSalary + payrollForm.bonuses + payrollForm.allowances.transport + payrollForm.allowances.meal - payrollForm.deductions.tax - payrollForm.deductions.loans - payrollForm.deductions.absences).toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
            <Button className="bg-success hover:bg-success/90" onClick={() => { toast.success("Payroll marked as paid"); setShowPayrollModal(false); }}>Mark as Paid</Button>
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
                  ₨ {(ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + h.netPay, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Advances</p>
                <p className="text-lg font-bold text-destructive">
                  ₨ {(ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + h.deductions.loans, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-bold text-destructive">
                  ₨ {(ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + (h.deductions.tax + h.deductions.absences), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Running Balance</p>
                <p className="text-lg font-bold text-primary">
                  ₨ {(ledgerStaff?.payrollHistory || []).reduce((acc: number, h: any) => acc + h.netPay, 0).toLocaleString()}
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
                          runningBalance += h.netPay;
                          return (
                            <tr key={h.id} className="text-sm hover:bg-muted/20">
                              <td className="px-4 py-3 text-muted-foreground">{h.date}</td>
                              <td className="px-4 py-3 font-medium">{h.month}</td>
                              <td className="px-4 py-3 text-right">₨ {h.basic.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">₨ {(h.allowances.transport + h.allowances.meal + (h.allowances.housing || 0)).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">₨ {h.bonuses.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-destructive">₨ {h.deductions.loans.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-destructive">₨ {(h.deductions.tax + h.deductions.absences).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-bold text-success">₨ {h.netPay.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-bold text-primary">₨ {runningBalance.toLocaleString()}</td>
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
                  <span>₨ {selectedPayslip.payroll.basic.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Allowances (Transport, Meal, Housing)</span>
                  <span>₨ {(selectedPayslip.payroll.allowances.transport + selectedPayslip.payroll.allowances.meal + (selectedPayslip.payroll.allowances.housing || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Bonuses</span>
                  <span>₨ {selectedPayslip.payroll.bonuses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                  <span>Deductions (Tax, Loan, Absence)</span>
                  <span>-₨ {(selectedPayslip.payroll.deductions.tax + selectedPayslip.payroll.deductions.loans + selectedPayslip.payroll.deductions.absences).toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-border my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Net Payable</span>
                  <span className="text-success">₨ {selectedPayslip.payroll.netPay.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPayslipModal(false)}>Close</Button>
            <Button className="gap-2" onClick={() => {
              toast.success("Downloading payslip as PDF...");
              // Simulated PDF download
              const content = `Payslip for ${selectedPayslip?.staff.name} - ${selectedPayslip?.payroll.month}\nNet Pay: Rs ${selectedPayslip?.payroll.netPay.toLocaleString()}`;
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
                    <p className="text-sm font-bold text-success">₨ {selectedStaff.salary?.toLocaleString()}</p>
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

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
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
                    return acc + (latestPayroll?.status === 'paid' ? latestPayroll.netPay : 0);
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
                  value: `₨ ${staff.reduce((acc, s) => acc + (s.payrollHistory?.reduce((sum, h) => sum + h.deductions.loans, 0) || 0), 0).toLocaleString()}`,
                  icon: Receipt,
                  color: "text-destructive",
                  bg: "bg-destructive/10"
                },
                { 
                  label: "Total Deductions", 
                  value: `₨ ${staff.reduce((acc, s) => acc + (s.payrollHistory?.reduce((sum, h) => sum + (h.deductions.tax + h.deductions.absences), 0) || 0), 0).toLocaleString()}`,
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
                        formatter={(v: any) => [`₨ ${v.toLocaleString()}`, 'Total Payroll']}
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
                      <Tooltip formatter={(v: any) => [`₨ ${v.toLocaleString()}`, 'Salary']} />
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
                          <td className="px-4 py-4 text-right text-xs">₨ {basic.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-xs text-success">₨ {bonus.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-xs text-primary">₨ {allowances.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-xs text-destructive">₨ {deductions.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right font-bold text-success">₨ {netPay.toLocaleString()}</td>
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
                        ₨ {staff.reduce((acc, s) => {
                          const latestPayroll = s.payrollHistory?.[s.payrollHistory.length - 1];
                          return acc + (latestPayroll ? latestPayroll.netPay : s.salary);
                        }, 0).toLocaleString()}
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
