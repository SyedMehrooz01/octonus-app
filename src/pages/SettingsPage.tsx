import { useState } from "react";
import { Building2, User, Bell, Shield, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
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
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

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
