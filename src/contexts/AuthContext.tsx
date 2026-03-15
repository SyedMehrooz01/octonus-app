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
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) {
        setUser(mapSupabaseUser(data.user));
        return { success: true };
      }
      return { success: false, error: "Login failed." };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid credentials." };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
