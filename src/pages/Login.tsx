import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, UserPlus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }

    // --- LOGIN ATTEMPT LIMIT (5 attempts) ---
    const attemptsKey = `login_attempts_${email}`;
    const attempts = Number(localStorage.getItem(attemptsKey) || 0);
    const lastAttemptTime = Number(localStorage.getItem(`${attemptsKey}_time`) || 0);
    const lockoutTime = 15 * 60 * 1000; // 15 minutes lockout

    if (attempts >= 5 && Date.now() - lastAttemptTime < lockoutTime) {
      const remainingMinutes = Math.ceil((lockoutTime - (Date.now() - lastAttemptTime)) / 60000);
      setError(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    if (result.success) {
      // Clear attempts on success
      localStorage.removeItem(attemptsKey);
      localStorage.removeItem(`${attemptsKey}_time`);

      navigate("/dashboard");
    } else {
      // Track failed attempt
      const newAttempts = attempts + 1;
      localStorage.setItem(attemptsKey, newAttempts.toString());
      localStorage.setItem(`${attemptsKey}_time`, Date.now().toString());
      
      if (newAttempts >= 5) {
        setError("Too many failed attempts. Your account is temporarily locked for 15 minutes.");
      } else {
        setError(`${result.error || "Login failed."} (${5 - newAttempts} attempts remaining)`);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center items-center w-full mb-4">
          <div className="text-center flex flex-col items-center">
            <Logo size="lg" className="mb-2" />
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              HRMS & Event Management
            </p>
          </div>
        </div>

        <h2 className="mb-1 text-2xl font-bold text-foreground">Welcome back</h2>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to your account to continue</p>


        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="current-password"
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary"
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
          </Button>

          <div className="relative flex items-center justify-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="mx-4 flex-shrink text-xs text-muted-foreground uppercase font-medium">Authorized Access Only</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              If you don't have an account, please contact your System Administrator to create one.
            </p>
          </div>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2024 Octonus Solutions. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
