import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth(); // We need to check if an admin is logged in
  
  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/\d/.test(pwd)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // --- ADMIN-ONLY USER CREATION ---
    if (!user || user.role !== "admin") {
      setError("Only administrators can create new user accounts.");
      toast.error("Unauthorized");
      return;
    }
    
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }
    
    // --- PASSWORD REQUIREMENTS (8 chars, num, special) ---
    const pwdError = validatePassword(password);
    if (pwdError) { setError(pwdError); return; }

    setIsLoading(true);

    try {
      // SECURITY: Force role to 'staff' (regular user) regardless of what might be sent
      const data = await authService.signUp(email, password, {
        full_name: fullName,
        role: "staff", // Hardcoded to staff for security
        username: email.split('@')[0],
      });

      if (data.user) {
        toast.success("Account created successfully!");
        navigate("/login");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      toast.error("Signup failed");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo size="lg" className="mb-2" />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            HRMS & Event Management
          </p>
        </div>

        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-1 h-3 w-3" /> Back to Login
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-foreground">Create Account</h2>
          <p className="text-sm text-muted-foreground">Join the system to start managing</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                placeholder="John Doe"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="pl-10"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Min. 6 characters"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : "Create Account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
