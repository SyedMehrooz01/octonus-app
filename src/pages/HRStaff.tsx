import { useState, useRef } from "react";
import { 
  Users, Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, 
  DollarSign, Camera, FileText, Calendar, Phone, Mail, MapPin, 
  UserPlus, Download, Star, StarOff, Bell, ShieldCheck, ChevronRight
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
import { format } from "date-fns";

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
  const [leaves, setLeaves] = useState(DUMMY_LEAVES);
  const [announcements, setAnnouncements] = useState(DUMMY_ANNOUNCEMENTS);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newStaff, setNewStaff] = useState({ 
    name: "", role: "", department: "", salary: "", phone: "", email: "", 
    address: "", emergencyContact: "", status: "active", joinDate: format(new Date(), "yyyy-MM-dd") 
  });

  const [editStaff, setEditStaff] = useState<any>(null);

  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });

  const [attendanceForm, setAttendanceForm] = useState({
    empId: "", status: "present", date: format(new Date(), "yyyy-MM-dd"), checkIn: "09:00", checkOut: "18:00"
  });

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
      statusHistory: [{ status: "active", date: format(new Date(), "yyyy-MM-dd") }]
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
      ...attendanceForm
    };
    setAttendance([newRecord, ...attendance]);
    setShowAttendanceModal(false);
    toast.success("Attendance marked");
  };

  const handleBulkAttendance = (status: string) => {
    const newRecords = staff.map((s, index) => ({
      id: attendance.length + index + 1,
      empId: s.id,
      name: s.name,
      status: status,
      date: format(new Date(), "yyyy-MM-dd"),
      checkIn: "09:00",
      checkOut: "18:00"
    }));
    setAttendance([...newRecords, ...attendance]);
    setShowBulkAttendanceModal(false);
    toast.success(`Bulk attendance marked as ${status}`);
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

  const handleDeleteStaff = (id: string) => {
    setStaff(staff.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    toast.success("Staff record deleted");
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Workforce Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground text-balance">Comprehensive HR portal for staff, attendance, and payroll</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAnnounceModal(true)} variant="outline" className="gap-2 flex-1 sm:flex-none">
            <Bell className="h-4 w-4" /> Announce
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2 flex-1 sm:flex-none">
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
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-full justify-start sm:w-auto inline-flex">
            <TabsTrigger value="profiles" className="text-xs sm:text-sm">Profiles</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs sm:text-sm">Attendance</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs sm:text-sm">Payroll</TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs sm:text-sm">Leaves</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
          </TabsList>
        </div>

        {/* Staff Profiles */}
        <TabsContent value="profiles" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="p-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search by ID, Name..." 
                  className="pl-9 h-9" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
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
                  {filtered.map(s => (
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditStaff(s); setShowEditModal(true); }}>
                            <Edit className="h-4 w-4 text-muted-foreground" />
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
        </TabsContent>

        {/* Attendance Management */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={() => setShowAttendanceModal(true)} className="gap-2 flex-1 sm:flex-none">
                <CheckCircle className="h-4 w-4" /> Mark Attendance
              </Button>
              <Button onClick={() => setShowBulkAttendanceModal(true)} variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Users className="h-4 w-4" /> Bulk Mark
              </Button>
            </div>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
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
                        <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.checkIn} - {a.checkOut}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
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
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export Payroll
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
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
                    const netSalary = s.salary; // Simplified for UI
                    return (
                      <tr key={s.id} className="text-sm hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.id}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(), 'MMMM yyyy')}</td>
                        <td className="px-4 py-3 font-bold text-success">₨ {netSalary.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusColor("paid")}>Paid</Badge>
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
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><FileText className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
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
              <table className="w-full border-collapse">
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
          <div className="grid grid-cols-2 gap-3 py-4">
            {['Present', 'Absent', 'Late', 'Half-day'].map(s => (
              <Button key={s} variant="outline" className="h-12 font-bold" onClick={() => handleBulkAttendance(s.toLowerCase())}>
                {s}
              </Button>
            ))}
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
