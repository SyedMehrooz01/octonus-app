import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Landmark, 
  Package, 
  Receipt, 
  FileText, 
  FolderOpen,
  Settings 
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { to: "/hr", label: "HR & Staff", icon: Users, page: "hr" },
  { to: "/events", label: "Event Booking", icon: CalendarDays, page: "events" },
  { to: "/finance", label: "Finance", icon: Landmark, page: "finance" },
  { to: "/inventory", label: "Inventory", icon: Package, page: "inventory" },
  { to: "/expenses", label: "Expenses", icon: Receipt, page: "expenses" },
  { to: "/documents", label: "Documents", icon: FileText, page: "documents" },
  { to: "/files", label: "File Manager", icon: FolderOpen, page: "files" },
  { to: "/settings", label: "Settings", icon: Settings, page: "settings" },
];
