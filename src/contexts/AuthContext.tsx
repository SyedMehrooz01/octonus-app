import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "manager" | "staff" | "accountant";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  email: string;
  avatar: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["dashboard", "hr", "events", "finance", "inventory", "expenses", "settings"],
  manager: ["dashboard", "events", "inventory", "expenses"],
  staff: ["dashboard", "events", "inventory"],
  accountant: ["dashboard", "finance", "expenses"],
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (page: string) => boolean;
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
        console.error("Error parsing saved user", e);
      }
    }

    // 2. Otherwise, check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const authUser = mapSupabaseUser(session.user);
        // Security check: Hard block any non-env user from gaining 'admin' role
        if (authUser.role === "admin") {
          console.warn(`Supabase user has admin role but is not the hardcoded admin. Denying access.`);
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
    return {
      id: sbUser.id,
      name: meta.full_name || sbUser.email?.split('@')[0] || "User",
      username: meta.username || sbUser.email?.split('@')[0] || "user",
      role: (meta.role as UserRole) || "staff",
      email: sbUser.email || "",
      avatar: meta.avatar_url || (meta.full_name ? meta.full_name.substring(0, 2).toUpperCase() : "U"),
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
          console.warn(`Access denied: User ${email} attempted to log in with admin role but is not the hardcoded admin.`);
          return { success: false, error: "Access denied. Invalid role configuration." };
        }

        setUser(authUser);
        localStorage.setItem("octonus_user", JSON.stringify(authUser));
        return { success: true };
      }
      return { success: false, error: "Login failed. Please check your credentials." };
    } catch (err: any) {
      console.error("Login error:", err);
      return { success: false, error: err.message || "Invalid credentials." };
    }
  };


  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("octonus_user");
  };

  const hasAccess = (page: string) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(page) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
