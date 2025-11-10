import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Lock, MessageSquare } from "lucide-react";
import { isAuthed } from "@/lib/auth";

const HERO_IMAGE = "https://ideogram.ai/assets/image/lossless/response/nXGvC0ZRR_OgZR7hWbOn1Q";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Prevent navigation throttling by only navigating once
    if (isAuthed() && !hasNavigated.current) {
      hasNavigated.current = true;
      // Use setTimeout to defer navigation to avoid blocking render
      setTimeout(() => {
        navigate("/dashboard");
      }, 0);
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      localStorage.setItem("auth", "true");
      localStorage.setItem("token", data.token);
      
      // Defer navigation to avoid blocking render
      hasNavigated.current = true;
      setTimeout(() => {
        navigate("/dashboard");
      }, 0);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Full background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      />
      
      {/* Professional gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-blue-900/60" />
      
      {/* Subtle pattern overlay for texture */}
      <div className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      
      {/* Login form container */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Compact brand header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <MessageSquare className="h-6 w-6 text-blue-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white leading-tight">
                Welcome to
              </h1>
              <h2 className="text-3xl font-bold whitespace-nowrap leading-tight">
                <span className="text-slate-400 font-bold">
                  GMT's
                </span>{' '}
                <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  ChatPilot
                </span>
              </h2>
            </div>
            <p className="text-slate-300 text-base mt-3">
              Your AI-powered CRM solution
            </p>
          </div>
          
          {/* Login card with glass morphism effect */}
          <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">Sign In</h2>
                <p className="text-slate-300 text-sm">Access your dashboard</p>
              </div>
              
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-sm font-medium text-slate-200">Username</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="h-10 pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-white/30 transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-200">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-10 pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-white/30 transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-white/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    <Label 
                      htmlFor="remember" 
                      className="text-xs text-slate-300 cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <button 
                    type="button"
                    className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                    onClick={() => alert('Forgot password functionality to be implemented')}
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 px-4 py-3 rounded-lg backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <Button 
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0" 
                  type="submit"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>Sign In</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Button>
              </form>
              
              {/* Compact features */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-center space-x-4 text-xs text-slate-500">
                  <span>Secure</span>
                  <span>•</span>
                  <span>24/7 Support</span>
                  <span>•</span>
                  <span>Enterprise</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


