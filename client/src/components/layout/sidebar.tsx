import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  BarChart2,
  ChevronLeft,
  ClipboardList,
  Home,
  LineChart,
  LogOut,
  Menu,
  Target,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const links = {
    manager: [
      { href: "/", icon: <Home size={20} />, label: "Dashboard" },
      { href: "/profiles", icon: <Users size={20} />, label: "Profile Assignment" },
      { href: "/targets", icon: <Target size={20} />, label: "Set Targets" },
      { href: "/reports", icon: <BarChart2 size={20} />, label: "Reports" },
    ],
    lead_gen: [
      { href: "/", icon: <Home size={20} />, label: "Dashboard" },
      { href: "/my-profile", icon: <User size={20} />, label: "My Profile" },
      { href: "/progress", icon: <LineChart size={20} />, label: "Update Progress" },
    ],
    sales: [
      { href: "/", icon: <Home size={20} />, label: "Dashboard" },
      { href: "/my-profiles", icon: <Users size={20} />, label: "My Profiles" },
      { href: "/lead-entry", icon: <ClipboardList size={20} />, label: "Lead Entry" },
    ],
  };

  // Get navigation links based on user role
  const navLinks = links[user.role as keyof typeof links] || [];

  return (
    <aside
      className={cn(
        "h-screen bg-white fixed left-0 top-0 z-40 transition-all duration-300 shadow-md flex flex-col",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className={cn(
        "p-6 border-b flex items-center",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && <h1 className="text-xl font-bold text-primary">Resume Manager</h1>}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={collapsed ? "ml-0" : "ml-2"}
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {!collapsed && (
        <div className="px-6 py-3 border-b">
          <p className="text-sm font-medium text-muted-foreground">
            {user.role === "manager" 
              ? "Manager Dashboard" 
              : user.role === "lead_gen" 
                ? "Lead Generation Dashboard"
                : "Sales Coordinator Dashboard"}
          </p>
        </div>
      )}

      <nav className="mt-6 flex-1 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                <a
                  className={cn(
                    "flex items-center py-2 px-3 text-sm font-medium rounded-md transition-colors",
                    location === link.href
                      ? "bg-primary bg-opacity-10 text-primary"
                      : "text-neutral-medium hover:bg-neutral-bg hover:text-primary"
                  )}
                >
                  <span className="mr-3">{link.icon}</span>
                  {!collapsed && <span>{link.label}</span>}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t mt-auto">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full text-neutral-medium hover:bg-neutral-bg hover:text-danger transition-colors",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut size={20} className="mr-2" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
