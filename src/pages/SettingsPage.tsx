import { useState, useEffect } from "react";
import { 
  Building2, User, Bell, Shield, Palette, Save, Users, Plus, 
  Trash2, Key, History, Search, CheckCircle2, XCircle, Edit2, 
  Eye, Download, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useAuth, ROLE_PERMISSIONS, UserRole, UserAction } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock data for initial UI - in production this comes from Supabase
const INITIAL_USERS = [
  { id: "1", name: "Ahmed Khan", email: "ahmed@octonus.com", role: "manager", status: "active", lastLogin: "2024-03-18 10:30 AM", permissions: ROLE_PERMISSIONS.manager },
  { id: "2", name: "Sara Ali", email: "sara@octonus.com", role: "accountant", status: "active", lastLogin: "2024-03-19 09:15 AM", permissions: ROLE_PERMISSIONS.accountant },
  { id: "3", name: "Zainab Malik", email: "zainab@octonus.com", role: "staff", status: "inactive", lastLogin: "2024-03-10 04:45 PM", permissions: ROLE_PERMISSIONS.staff },
];

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "hr", label: "HR & Staff" },
  { id: "events", label: "Event Booking" },
  { id: "finance", label: "Finance" },
  { id: "inventory", label: "Inventory" },
  { id: "expenses", label: "Expenses" },
  { id: "settings", label: "Settings" },
];

const ACTIONS: { id: UserAction; label: string }[] = [
  { id: "view", label: "View Only" },
  { id: "add", label: "Can Add" },
  { id: "edit", label: "Can Edit" },
  { id: "delete", label: "Can Delete" },
  { id: "export", label: "Can Export" },
];

const SettingsPage = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // User Management State
  const [users, setUsers] = useState(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as UserRole,
    permissions: {
      pages: ["dashboard"] as string[],
      actions: ["view"] as UserAction[]
    }
  });

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, user: "Ahmed Khan", action: "Added new event booking", page: "Events", time: "2024-03-19 11:20 AM" },
    { id: 2, user: "System Admin", action: "Updated company settings", page: "Settings", time: "2024-03-19 10:45 AM" },
    { id: 3, user: "Sara Ali", action: "Generated monthly P&L", page: "Finance", time: "2024-03-18 03:30 PM" },
  ]);

  // Rest of state...
  const [company, setCompany] = useState({
    name: "Octonus Solutions",
    tagline: "A Spectacular Turn of Events",
    phone: "0300-0000000",
    email: "info@octonus.com",
    address: "Karachi, Pakistan",
    currency: "₨",
    taxNo: "NTN-0000000",
  });

  const [profile, setProfile] = useState({
    name: "Admin User",
    username: "admin",
    email: "admin@octonus.com",
    phone: "0300-1234567",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    newBooking: true,
    paymentReminder: true,
    lowStock: true,
    payrollDue: false,
    dailySummary: true,
  });

  const handleSave = (section: string) => {
    toast({ title: `${section} saved`, description: "Your changes have been saved successfully." });
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    const userToAdd = {
      id: String(users.length + 1),
      ...newUser,
      status: "active",
      lastLogin: "Never"
    };
    setUsers([...users, userToAdd]);
    setShowAddUserModal(false);
    toast({ title: "User Created", description: `${newUser.name} has been added to the system.` });
  };

  const handleUpdateUserStatus = (id: string, status: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status } : u));
    toast({ title: "User Status Updated" });
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
    toast({ title: "User Deleted", variant: "destructive" });
  };

  const togglePagePermission = (pageId: string) => {
    const current = newUser.permissions.pages;
    const next = current.includes(pageId) 
      ? current.filter(p => p !== pageId) 
      : [...current, pageId];
    setNewUser({ ...newUser, permissions: { ...newUser.permissions, pages: next } });
  };

  const toggleActionPermission = (actionId: UserAction) => {
    const current = newUser.permissions.actions;
    const next = current.includes(actionId) 
      ? current.filter(a => a !== actionId) 
      : [...current, actionId];
    setNewUser({ ...newUser, permissions: { ...newUser.permissions, actions: next } });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your system preferences and configurations</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="mb-4">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
          {currentUser?.role === "admin" && (
            <>
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> User Management</TabsTrigger>
              <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Log</TabsTrigger>
            </>
          )}
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        {currentUser?.role === "admin" && (
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-9" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Add User</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New User Account</DialogTitle>
                    <DialogDescription>Add a new staff member and configure their permissions.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input placeholder="Ahmed Khan" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" placeholder="ahmed@octonus.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Initial Role</Label>
                      <Select value={newUser.role} onValueChange={(v: UserRole) => {
                        setNewUser({...newUser, role: v, permissions: ROLE_PERMISSIONS[v]});
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 border-t border-border pt-4">
                      <Label className="mb-2 block font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Page Access</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PAGES.map(p => (
                          <div key={p.id} className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border">
                            <Checkbox 
                              id={`page-${p.id}`} 
                              checked={newUser.permissions.pages.includes(p.id)}
                              onCheckedChange={() => togglePagePermission(p.id)}
                            />
                            <Label htmlFor={`page-${p.id}`} className="text-xs cursor-pointer truncate">{p.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-2 border-t border-border pt-4">
                      <Label className="mb-2 block font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Actions Permissions</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ACTIONS.map(a => (
                          <div key={a.id} className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border">
                            <Checkbox 
                              id={`action-${a.id}`} 
                              checked={newUser.permissions.actions.includes(a.id)}
                              onCheckedChange={() => toggleActionPermission(a.id)}
                            />
                            <Label htmlFor={`action-${a.id}`} className="text-xs cursor-pointer">{a.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
                    <Button onClick={handleAddUser}>Create Account</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold">User</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Last Login</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <Badge variant="secondary" className="font-medium">{u.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className={`capitalize ${u.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.lastLogin}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password"><Key className="h-4 w-4" /></Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${u.status === 'active' ? 'text-destructive' : 'text-success'}`}
                              onClick={() => handleUpdateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')}
                              title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {u.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 className="h-4 w-4" />
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
        )}

        {/* Audit Log Tab */}
        {currentUser?.role === "admin" && (
          <TabsContent value="audit">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold">System Audit Log</h3>
                  <p className="text-xs text-muted-foreground">Track all user activities across the system.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export Log</Button>
              </div>
              <div className="space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-foreground">{log.user}</p>
                        <span className="text-[10px] text-muted-foreground">{log.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.action}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] py-0">{log.page}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button variant="ghost" size="sm" className="text-primary font-bold">Load Older Logs</Button>
              </div>
            </div>
          </TabsContent>
        )}

        {/* Company Settings */}
        <TabsContent value="company">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-card-foreground">Company Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input value={company.tagline} onChange={e => setCompany({ ...company, tagline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency Symbol</Label>
                <Input value={company.currency} onChange={e => setCompany({ ...company, currency: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax / NTN Number</Label>
                <Input value={company.taxNo} onChange={e => setCompany({ ...company, taxNo: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => handleSave("Company settings")} className="gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-card-foreground">My Profile</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => handleSave("Profile")} className="gap-2">
                <Save className="h-4 w-4" /> Save Profile
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="mt-4 rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-card-foreground">Change Password</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input type="password" placeholder="••••••••" value={profile.currentPassword} onChange={e => setProfile({ ...profile, currentPassword: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" placeholder="••••••••" value={profile.newPassword} onChange={e => setProfile({ ...profile, newPassword: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="••••••••" value={profile.confirmPassword} onChange={e => setProfile({ ...profile, confirmPassword: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => handleSave("Password")} className="gap-2">
                <Shield className="h-4 w-4" /> Update Password
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-card-foreground">Notification Preferences</h3>
            <div className="space-y-5">
              {[
                { key: "newBooking", label: "New Booking Alert", desc: "Get notified when a new event is booked" },
                { key: "paymentReminder", label: "Payment Reminders", desc: "Reminders for pending balances from clients" },
                { key: "lowStock", label: "Low Stock Alerts", desc: "Alert when inventory falls below minimum level" },
                { key: "payrollDue", label: "Payroll Due Reminder", desc: "Reminder when monthly payroll is due" },
                { key: "dailySummary", label: "Daily Summary", desc: "Receive a daily summary of all activities" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={v => setNotifications({ ...notifications, [item.key]: v })}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => handleSave("Notifications")} className="gap-2">
                <Save className="h-4 w-4" /> Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-card-foreground">Security Settings</h3>
            <div className="space-y-5">
              {[
                { label: "Two-Factor Authentication", desc: "Add an extra layer of security to your account", enabled: false },
                { label: "Session Timeout", desc: "Auto logout after 30 minutes of inactivity", enabled: true },
                { label: "Login Notifications", desc: "Get notified on new login to your account", enabled: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between border-b border-border pb-4 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.enabled} />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-destructive/5 border border-destructive/20 p-4">
              <h4 className="mb-1 text-sm font-semibold text-destructive">Danger Zone</h4>
              <p className="mb-3 text-xs text-muted-foreground">These actions are permanent and cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  Clear All Data
                </Button>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
