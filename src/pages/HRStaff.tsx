import { useState } from "react";
import { Users, Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DUMMY_STAFF = [
  { id: 1, name: "Ahmed Raza", role: "Event Manager", department: "Operations", salary: 45000, status: "active", phone: "0300-1234567", joinDate: "2022-03-15", attendance: 96 },
  { id: 2, name: "Sara Khan", role: "Chef", department: "Kitchen", salary: 38000, status: "active", phone: "0301-2345678", joinDate: "2021-07-01", attendance: 92 },
  { id: 3, name: "Bilal Ahmed", role: "Decorator", department: "Decoration", salary: 30000, status: "active", phone: "0302-3456789", joinDate: "2023-01-10", attendance: 88 },
  { id: 4, name: "Fatima Malik", role: "Accountant", department: "Finance", salary: 42000, status: "active", phone: "0303-4567890", joinDate: "2020-11-20", attendance: 99 },
  { id: 5, name: "Usman Ali", role: "Driver", department: "Logistics", salary: 22000, status: "inactive", phone: "0304-5678901", joinDate: "2022-08-05", attendance: 75 },
  { id: 6, name: "Zara Sheikh", role: "Receptionist", department: "Admin", salary: 28000, status: "active", phone: "0305-6789012", joinDate: "2023-06-01", attendance: 94 },
];

const DUMMY_ATTENDANCE = [
  { id: 1, name: "Ahmed Raza", date: "2024-03-14", checkIn: "09:00", checkOut: "18:00", status: "present" },
  { id: 2, name: "Sara Khan", date: "2024-03-14", checkIn: "08:45", checkOut: "17:30", status: "present" },
  { id: 3, name: "Bilal Ahmed", date: "2024-03-14", checkIn: "-", checkOut: "-", status: "absent" },
  { id: 4, name: "Fatima Malik", date: "2024-03-14", checkIn: "09:10", checkOut: "18:15", status: "present" },
  { id: 5, name: "Usman Ali", date: "2024-03-14", checkIn: "10:00", checkOut: "16:00", status: "late" },
  { id: 6, name: "Zara Sheikh", date: "2024-03-14", checkIn: "09:00", checkOut: "18:00", status: "present" },
];

const DUMMY_PAYROLL = [
  { id: 1, name: "Ahmed Raza", salary: 45000, bonus: 5000, deductions: 2000, net: 48000, month: "March 2024", paid: true },
  { id: 2, name: "Sara Khan", salary: 38000, bonus: 3000, deductions: 1500, net: 39500, month: "March 2024", paid: true },
  { id: 3, name: "Bilal Ahmed", salary: 30000, bonus: 0, deductions: 3000, net: 27000, month: "March 2024", paid: false },
  { id: 4, name: "Fatima Malik", salary: 42000, bonus: 4000, deductions: 1000, net: 45000, month: "March 2024", paid: true },
  { id: 5, name: "Usman Ali", salary: 22000, bonus: 0, deductions: 5000, net: 17000, month: "March 2024", paid: false },
  { id: 6, name: "Zara Sheikh", salary: 28000, bonus: 2000, deductions: 1000, net: 29000, month: "March 2024", paid: true },
];

const statusColor = (status: string) => {
  if (status === "active" || status === "present" || status === "paid") return "bg-success/10 text-success border-success/20";
  if (status === "inactive" || status === "absent") return "bg-destructive/10 text-destructive border-destructive/20";
  if (status === "late") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

const HRStaff = () => {
  const [staff, setStaff] = useState(DUMMY_STAFF);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", role: "", department: "", salary: "", phone: "", status: "active" });

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newStaff.name || !newStaff.role) return;
    setStaff([...staff, {
      id: staff.length + 1,
      ...newStaff,
      salary: Number(newStaff.salary),
      joinDate: new Date().toISOString().split("T")[0],
      attendance: 100,
    }]);
    setNewStaff({ name: "", role: "", department: "", salary: "", phone: "", status: "active" });
    setShowAddModal(false);
  };

  const handleDelete = (id: number) => setStaff(staff.filter(s => s.id !== id));

  const totalPayroll = DUMMY_PAYROLL.reduce((sum, p) => sum + p.net, 0);
  const paidCount = DUMMY_PAYROLL.filter(p => p.paid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">HR & Staff Management</h2>
          <p className="text-sm text-muted-foreground">Manage staff profiles, attendance, and payroll</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Staff", value: staff.length, icon: Users, color: "bg-primary" },
          { label: "Active", value: staff.filter(s => s.status === "active").length, icon: CheckCircle, color: "bg-success" },
          { label: "Inactive", value: staff.filter(s => s.status === "inactive").length, icon: XCircle, color: "bg-destructive" },
          { label: "Monthly Payroll", value: `₨ ${totalPayroll.toLocaleString()}`, icon: DollarSign, color: "bg-warning" },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-card-foreground">{card.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profiles">
        <TabsList className="mb-4">
          <TabsTrigger value="profiles">Staff Profiles</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        {/* Staff Profiles Tab */}
        <TabsContent value="profiles">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search staff..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Attendance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.role}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.department}</td>
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">₨ {s.salary.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${s.attendance}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{s.attendance}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelectedStaff(s); setShowViewModal(true); }} className="rounded p-1 hover:bg-muted">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button className="rounded p-1 hover:bg-muted">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="rounded p-1 hover:bg-muted">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold text-card-foreground">Today's Attendance — March 14, 2024</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Staff Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DUMMY_ATTENDANCE.map(a => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{a.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.checkIn}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.checkOut}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-semibold text-card-foreground">Payroll — March 2024</h3>
              <div className="text-xs text-muted-foreground">{paidCount}/{DUMMY_PAYROLL.length} paid</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Basic</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Bonus</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Deductions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Net Pay</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DUMMY_PAYROLL.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium text-card-foreground">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">₨ {p.salary.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-success">+₨ {p.bonus.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-destructive">-₨ {p.deductions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-bold text-card-foreground">₨ {p.net.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${p.paid ? statusColor("paid") : statusColor("inactive")}`}>
                          {p.paid ? "Paid" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input placeholder="e.g. Ahmed Raza" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input placeholder="e.g. Chef" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input placeholder="e.g. Kitchen" value={newStaff.department} onChange={e => setNewStaff({ ...newStaff, department: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="0300-0000000" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Salary (₨)</Label>
                <Input type="number" placeholder="e.g. 35000" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={newStaff.status} onValueChange={v => setNewStaff({ ...newStaff, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Staff Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-3">
              {[
                { label: "Full Name", value: selectedStaff.name },
                { label: "Role", value: selectedStaff.role },
                { label: "Department", value: selectedStaff.department },
                { label: "Phone", value: selectedStaff.phone },
                { label: "Salary", value: `₨ ${selectedStaff.salary?.toLocaleString()}` },
                { label: "Join Date", value: selectedStaff.joinDate },
                { label: "Attendance", value: `${selectedStaff.attendance}%` },
                { label: "Status", value: selectedStaff.status },
              ].map(row => (
                <div key={row.label} className="flex justify-between border-b border-border pb-2 text-sm last:border-0">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-card-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRStaff;
