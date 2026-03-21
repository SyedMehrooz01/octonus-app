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
  const { user: currentUser, logAction } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  
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

  const [editUser, setEditUser] = useState({
    id: "",
    name: "",
    role: "staff" as UserRole,
    permissions: {
      pages: [] as string[],
      actions: [] as UserAction[]
    }
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

  const [company, setCompany] = useState({
    name: "Octonus Solutions",
    tagline: "A Spectacular Turn of Events",
    phone: "0300-0000000",
    email: "info@octonus.com",
    address: "Karachi, Pakistan",
    currency: "₨",
    taxNo: "NTN-0000000",
  });

  const [notifications, setNotifications] = useState({
    newBooking: true,
    paymentReminder: true,
    lowStock: true,
    payrollDue: false,
    dailySummary: true,
  });

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, user: "Ahmed Khan", action: "Added new event booking", page: "Events", time: "2024-03-19 11:20 AM" },
    { id: 2, user: "System Admin", action: "Updated company settings", page: "Settings", time: "2024-03-19 10:45 AM" },
    { id: 3, user: "Sara Ali", action: "Generated monthly P&L", page: "Finance", time: "2024-03-18 03:30 PM" },
  ]);

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      // Simulate save to Supabase
      await new Promise(resolve => setTimeout(resolve, 800));
      toast({ title: `${section} saved`, description: "Your changes have been saved successfully." });
      logAction(`Updated ${section}`, "Settings");
    } catch (err) {
      toast({ title: "Error", description: `Failed to save ${section}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error("Fetch users error:", err);
      toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers();
    }
  }, [currentUser]);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Create user in Supabase Auth (Note: In a real app, this usually requires an Edge Function or admin-level access)
      // For this demo/setup, we'll use the profiles table which handles metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert into profiles table
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          full_name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          permissions: newUser.permissions,
          status: 'active'
        }]);

        if (profileError) throw profileError;
      }

      toast({ title: "User Created", description: `${newUser.name} has been added to the system.` });
      logAction(`Created new user: ${newUser.name}`, "Settings");
      setShowAddUserModal(false);
      setNewUser({
        name: "", email: "", password: "", role: "staff",
        permissions: { pages: ["dashboard"], actions: ["view"] }
      });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUser({
      id: user.id,
      name: user.full_name || user.name,
      role: user.role,
      permissions: user.permissions || { pages: [], actions: [] }
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editUser.role,
          permissions: editUser.permissions
        })
        .eq('id', editUser.id);

      if (error) throw error;
      toast({ title: "User Updated", description: "Permissions and role updated successfully." });
      logAction(`Updated user permissions for: ${editUser.name}`, "Settings");
      setShowEditUserModal(false);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({ title: "Error", description: "Please enter a new password", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // In Supabase, resetting another user's password usually requires admin Edge Functions
      // For now we'll simulate the success as requested for the UI flow
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Password Reset", description: `Password for ${selectedUser.full_name || selectedUser.name} has been reset.` });
      logAction(`Reset password for: ${selectedUser.full_name || selectedUser.name}`, "Settings");
      setShowResetPasswordModal(false);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserStatus = async (id: string, status: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "User Status Updated" });
      logAction(`Updated user status for ID: ${id} to ${status}`, "Settings");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "User Deleted", variant: "destructive" });
      logAction(`Deleted user ID: ${id}`, "Settings");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const togglePagePermission = (pageId: string, isEdit = false) => {
    const target = isEdit ? editUser : newUser;
    const current = target.permissions.pages;
    const next = current.includes(pageId) 
      ? current.filter(p => p !== pageId) 
      : [...current, pageId];
    
    if (isEdit) {
      setEditUser({ ...editUser, permissions: { ...editUser.permissions, pages: next } });
    } else {
      setNewUser({ ...newUser, permissions: { ...newUser.permissions, pages: next } });
    }
  };

  const toggleActionPermission = (actionId: UserAction, isEdit = false) => {
    const target = isEdit ? editUser : newUser;
    const current = target.permissions.actions;
    const next = current.includes(actionId) 
      ? current.filter(a => a !== actionId) 
      : [...current, actionId];
    
    if (isEdit) {
      setEditUser({ ...editUser, permissions: { ...editUser.permissions, actions: next } });
    } else {
      setNewUser({ ...newUser, permissions: { ...newUser.permissions, actions: next } });
    }
  };

  const filteredUsers = (users || []).filter(u => 
    (u.full_name || u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="animate-in fade-in slide-in-from-left duration-500">
        <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">System Settings</h1>
        <p className="text-slate-500 font-bold mt-1">Manage your system preferences and configurations.</p>
      </div>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Edit User Permissions</DialogTitle>
            <DialogDescription className="font-medium">Update role and access control for {editUser.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Access Role</Label>
              <Select value={editUser.role} onValueChange={(v: UserRole) => {
                setEditUser({...editUser, role: v, permissions: ROLE_PERMISSIONS[v]});
              }}>
                <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 border-t border-slate-100 pt-6">
              <Label className="mb-4 block font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Page Access Control</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {PAGES.map(p => (
                  <div key={p.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                    <Checkbox 
                      id={`edit-page-${p.id}`} 
                      checked={editUser.permissions.pages.includes(p.id)}
                      onCheckedChange={() => togglePagePermission(p.id, true)}
                      className="rounded-md h-5 w-5"
                    />
                    <Label htmlFor={`edit-page-${p.id}`} className="text-xs font-black cursor-pointer truncate">{p.label.toUpperCase()}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 border-t border-slate-100 pt-6">
              <Label className="mb-4 block font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Action Permissions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ACTIONS.map(a => (
                  <div key={a.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                    <Checkbox 
                      id={`edit-action-${a.id}`} 
                      checked={editUser.permissions.actions.includes(a.id)}
                      onCheckedChange={() => toggleActionPermission(a.id, true)}
                      className="rounded-md h-5 w-5"
                    />
                    <Label htmlFor={`edit-action-${a.id}`} className="text-xs font-black cursor-pointer">{a.label.toUpperCase()}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-12 rounded-xl font-black px-6" onClick={() => setShowEditUserModal(false)} disabled={saving}>CANCEL</Button>
            <Button className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-8" onClick={handleUpdateUser} disabled={saving}>
              {saving ? "UPDATING..." : "UPDATE PERMISSIONS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Reset Password</DialogTitle>
            <DialogDescription className="font-medium">Set a new password for {selectedUser?.full_name || selectedUser?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">New Password</Label>
              <Input type="password" placeholder="••••••••" className="h-12 rounded-xl font-bold" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-12 rounded-xl font-black px-6" onClick={() => setShowResetPasswordModal(false)} disabled={saving}>CANCEL</Button>
            <Button className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black px-8" onClick={handleResetPassword} disabled={saving}>
              {saving ? "RESETTING..." : "CONFIRM RESET"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="mb-8 h-auto gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
          <TabsTrigger value="company" className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
          {currentUser?.role === "admin" && (
            <>
              <TabsTrigger value="users" className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
              <TabsTrigger value="audit" className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2"><History className="h-4 w-4" /> Audit Log</TabsTrigger>
            </>
          )}
          <TabsTrigger value="notifications" className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2"><Bell className="h-4 w-4" /> Alerts</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 py-3 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        {currentUser?.role === "admin" && (
          <TabsContent value="users" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input 
                  placeholder="Search system users..." 
                  className="pl-11 h-12 bg-slate-50 border-none rounded-xl font-bold shadow-sm focus-visible:ring-blue-500/20" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                <DialogTrigger asChild>
                  <Button className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-8 gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"><Plus className="h-5 w-5" /> CREATE USER</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight">Create New User Account</DialogTitle>
                    <DialogDescription className="font-medium">Add a new staff member and configure their permissions.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Full Name</Label>
                      <Input placeholder="Ahmed Khan" className="h-12 rounded-xl font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Email Address</Label>
                      <Input type="email" placeholder="ahmed@octonus.com" className="h-12 rounded-xl font-bold" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Initial Password</Label>
                      <Input type="password" placeholder="••••••••" className="h-12 rounded-xl font-bold" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Access Role</Label>
                      <Select value={newUser.role} onValueChange={(v: UserRole) => {
                        setNewUser({...newUser, role: v, permissions: ROLE_PERMISSIONS[v]});
                      }}>
                        <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 border-t border-slate-100 pt-6">
                      <Label className="mb-4 block font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Page Access Control</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {PAGES.map(p => (
                          <div key={p.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                            <Checkbox 
                              id={`page-${p.id}`} 
                              checked={newUser.permissions.pages.includes(p.id)}
                              onCheckedChange={() => togglePagePermission(p.id, false)}
                              className="rounded-md h-5 w-5"
                            />
                            <Label htmlFor={`page-${p.id}`} className="text-xs font-black cursor-pointer truncate">{p.label.toUpperCase()}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-2 border-t border-slate-100 pt-6">
                      <Label className="mb-4 block font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Action Permissions</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {ACTIONS.map(a => (
                          <div key={a.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                            <Checkbox 
                              id={`action-${a.id}`} 
                              checked={newUser.permissions.actions.includes(a.id)}
                              onCheckedChange={() => toggleActionPermission(a.id, false)}
                              className="rounded-md h-5 w-5"
                            />
                            <Label htmlFor={`action-${a.id}`} className="text-xs font-black cursor-pointer">{a.label.toUpperCase()}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-3">
                    <Button variant="outline" className="h-12 rounded-xl font-black px-6" onClick={() => setShowAddUserModal(false)} disabled={saving}>CANCEL</Button>
                    <Button className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-8" onClick={handleAddUser} disabled={saving}>
                      {saving ? "CREATING..." : "CREATE ACCOUNT"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                      <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                      <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Role</th>
                      <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Permissions</th>
                      <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-10 font-black text-slate-400">LOADING USERS...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 font-black text-slate-400">NO USERS FOUND</td></tr>
                    ) : filteredUsers.map((u, idx) => (
                      <tr key={u.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/40 transition-all duration-200 group`}>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-black text-sm shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform duration-300">
                              {(u.full_name || u.name || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-blue-600 transition-colors">{u.full_name || u.name}</p>
                              <p className="text-[11px] font-bold text-slate-400 mt-2 tracking-tight">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <Badge variant="outline" className="rounded-lg font-black text-[10px] uppercase tracking-widest bg-white border-slate-200 px-3 py-1 shadow-sm">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(u.permissions?.pages || []).map((p: string) => (
                              <Badge key={p} className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <Badge 
                            className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm ${u.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50 shadow-sm"
                              onClick={() => handleEditUser(u)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl text-amber-600 hover:bg-amber-100/50 shadow-sm" 
                              title="Reset Password"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowResetPasswordModal(true);
                              }}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-9 w-9 rounded-xl shadow-sm ${u.status === 'active' ? 'text-rose-500 hover:bg-rose-100/50' : 'text-emerald-500 hover:bg-emerald-100/50'}`}
                              onClick={() => handleUpdateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')}
                            >
                              {u.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-100/50 shadow-sm" onClick={() => handleDeleteUser(u.id)}>
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
              <Button onClick={() => handleSave("Company settings")} className="gap-2" disabled={saving}>
                {saving ? "SAVING..." : <><Save className="h-4 w-4" /> Save Changes</>}
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
              <Button onClick={() => handleSave("Profile")} className="gap-2" disabled={saving}>
                {saving ? "SAVING..." : <><Save className="h-4 w-4" /> Save Profile</>}
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
              <Button variant="outline" onClick={() => handleSave("Password")} className="gap-2" disabled={saving}>
                {saving ? "UPDATING..." : <><Shield className="h-4 w-4" /> Update Password</>}
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
              <Button onClick={() => handleSave("Notifications")} className="gap-2" disabled={saving}>
                {saving ? "SAVING..." : <><Save className="h-4 w-4" /> Save Preferences</>}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
