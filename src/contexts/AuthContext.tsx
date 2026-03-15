import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "manager" | "staff" | "accountant";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  email: string;
  avatar: string;
}

const USERS: (AuthUser & { password: string })[] = [
  { id: 1, name: "Admin User", username: "admin", password: "admin123", role: "admin", email: "admin@octonus.com", avatar: "AU" },
  { id: 2, name: "Event Manager", username: "manager", password: "mgr123", role: "manager", email: "manager@octonus.com", avatar: "EM" },
  { id: 3, name: "Staff Member", username: "staff", password: "staff123", role: "staff", email: "staff@octonus.com", avatar: "SM" },
  { id: 4, name: "Accountant", username: "accountant", password: "acc123", role: "accountant", email: "acc@octonus.com", avatar: "AC" },
];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["dashboard", "hr", "events", "finance", "inventory", "expenses", "settings"],
  manager: ["dashboard", "events", "inventory", "expenses"],
  staff: ["dashboard", "events", "inventory"],
  accountant: ["dashboard", "finance", "expenses"],
};

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("octonus_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = async (username: string, password: string) => {
    await new Promise(res => setTimeout(res, 800));
    const found = USERS.find(u => u.username === username && u.password === password);
    if (found) {
      const { password: _, ...authUser } = found;
      setUser(authUser);
      localStorage.setItem("octonus_user", JSON.stringify(authUser));
      return { success: true };
    }
    return { success: false, error: "Invalid username or password." };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("octonus_user");
  };

  const hasAccess = (page: string) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(page) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
