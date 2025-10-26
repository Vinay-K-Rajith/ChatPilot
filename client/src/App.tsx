import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Conversations from "@/pages/Conversations";
import Leads from "@/pages/Leads";
import Campaigns from "@/pages/Campaigns";
import Analytics from "@/pages/Analytics";
import KnowledgeBase from "@/pages/KnowledgeBase";
import AISettings from "@/pages/AISettings";
import Testing from "@/pages/Testing";
import NotFound from "@/pages/not-found";

import { isAuthed, validateSession } from "./lib/auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidSession, setIsValidSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      if (!isAuthed()) {
        setIsValidSession(false);
        setIsLoading(false);
        return;
      }

      const isValid = await validateSession();
      setIsValidSession(isValid);
      setIsLoading(false);
    }

    checkSession();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isValidSession) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/conversations" component={() => <ProtectedRoute component={Conversations} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={Leads} />} />
      <Route path="/campaigns" component={() => <ProtectedRoute component={Campaigns} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/knowledge" component={() => <ProtectedRoute component={KnowledgeBase} />} />
      <Route path="/ai-settings" component={() => <ProtectedRoute component={AISettings} />} />
      <Route path="/testing" component={() => <ProtectedRoute component={Testing} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
  };
  const [location] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          {location === "/login" || location === "/" ? (
            <main className="min-h-screen w-full bg-background">
              <Router />
            </main>
          ) : (
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-border bg-background">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-y-auto bg-background transition-all duration-200">
                  <div className="animate-in fade-in slide-in-from-right-3 duration-300">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          )}
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
