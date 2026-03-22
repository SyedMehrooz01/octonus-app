import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserRole = "admin" | "manager" | "staff" | "accountant";

export type UserAction = "view" | "add" | "edit" | "delete" | "export";

export interface UserPermissions {
  pages: string[];
  actions: UserAction[];
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  email: string;
  avatar: string;
  permissions?: UserPermissions;
  isActive?: boolean;
  lastLogin?: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    pages: ["dashboard", "hr", "events", "finance", "inventory", "expenses", "documents", "files", "settings"],
    actions: ["view", "add", "edit", "delete", "export"]
  },
  manager: {
    pages: ["dashboard", "hr", "events", "inventory", "expenses", "documents", "files"],
    actions: ["view", "add", "edit", "export"]
  },
  staff: {
    pages: ["dashboard", "events", "inventory", "documents", "files"],
    actions: ["view", "add"]
  },
  accountant: {
    pages: ["dashboard", "finance", "expenses", "documents", "files"],
    actions: ["view", "add", "edit", "export"]
  },
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (page: string) => boolean;
  canDo: (action: UserAction) => boolean;
  logAction: (action: string, page: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. First, check if there's a hardcoded admin session in localStorage
    const saved = localStorage.getItem("octonus_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role === "admin" && parsed.email === import.meta.env.VITE_ADMIN_EMAIL) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Silently fail parsing saved user
      }
    }

    // 2. Otherwise, check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        // Security check: Hard block any non-env user from gaining 'admin' role
        if (authUser.role === "admin") {
          setUser(null);
        } else {
          setUser(authUser);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        if (authUser.role === "admin") {
          setUser(null);
        } else {
          setUser(authUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapSupabaseUser = (sbUser: any): AuthUser => {
    const meta = sbUser.user_metadata || {};
    const role = (meta.role as UserRole) || "staff";
    
    // Default permissions from role, or override from user metadata
    const permissions: UserPermissions = meta.permissions || ROLE_PERMISSIONS[role];

    return {
      id: sbUser.id,
      name: meta.full_name || sbUser.email?.split('@')[0] || "User",
      username: meta.username || sbUser.email?.split('@')[0] || "user",
      role: role,
      email: sbUser.email || "",
      avatar: meta.avatar_url || (meta.full_name ? meta.full_name.substring(0, 2).toUpperCase() : "U"),
      permissions: permissions,
      isActive: meta.isActive !== undefined ? meta.isActive : true,
      lastLogin: sbUser.last_sign_in_at
    };
  };

  const login = async (email: string, password: string) => {
    try {
      // 1. Check if these are the hardcoded admin credentials from .env
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

      if (email === adminEmail && password === adminPassword) {
        // Log in as the hardcoded admin
        const adminUser: AuthUser = {
          id: "admin-id",
          name: "System Admin",
          username: "admin",
          role: "admin",
          email: adminEmail,
          avatar: "SA",
        };
        setUser(adminUser);
        localStorage.setItem("octonus_user", JSON.stringify(adminUser));
        return { success: true };
      }

      // 2. Regular user login via Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Failed to fetch") {
          return { success: false, error: "Network error: Could not connect to Supabase. Please check your internet connection and Supabase URL." };
        }
        throw error;
      }
      
      if (data.user) {
        const authUser = mapSupabaseUser(data.user);
        
        // 3. Security check: Hard block any non-env user from gaining 'admin' role
        if (authUser.role === "admin") {
          return { success: false, error: "Access denied. Invalid role configuration." };
        }

        // --- ACTIVITY LOG (Successful login) ---
        try {
          // Fetch IP if possible
          let ip = "unknown";
          try {
            const ipRes = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipRes.json();
            ip = ipData.ip;
          } catch (e) {
            // Silently fail IP fetch
          }

          const browserInfo = navigator.userAgent;
          const loginTime = new Date().toISOString();

          // Log in audit_logs
          await supabase.from("audit_logs").insert([{
            user_id: authUser.id,
            user_name: authUser.name,
            action: `Login from ${ip}`,
            page: "Login",
            timestamp: loginTime,
            // We can add metadata if the table supports it, or just in action string
            details: `Device: ${browserInfo}`
          }]);
        } catch (e) {
          // Audit log failed
        }

        setUser(authUser);
        localStorage.setItem("octonus_user", JSON.stringify(authUser));
        return { success: true };
      }
      return { success: false, error: "Login failed. Please check your credentials." };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid credentials." };
    }
  };


  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("octonus_user");
  };

  // --- SESSION TIMEOUT (30 mins inactivity) ---
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.error("Session expired due to inactivity. Please login again.");
      }, TIMEOUT_MS);
    };

    // Events to track activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(name => document.addEventListener(name, resetTimer));

    resetTimer(); // Initialize timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(name => document.removeEventListener(name, resetTimer));
    };
  }, [user]);

  const hasAccess = (page: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions?.pages.includes(page) ?? false;
  };

  const canDo = (action: UserAction) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions?.actions.includes(action) ?? false;
  };

  const logAction = async (action: string, page: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("audit_logs").insert([
        {
          user_id: user.id,
          user_name: user.name,
          action,
          page,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      // Audit log failed
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasAccess, canDo, logAction }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
