import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  BarChart2,
  ClipboardList,
  Home,
  LineChart,
  Target,
  User,
  Users,
} from "lucide-react";

export function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const links = {
    manager: [
      { href: "/", icon: <Home size={20} />, label: "Dashboard" },
      { href: "/profiles", icon: <Users size={20} />, label: "Profiles" },
      { href: "/targets", icon: <Target size={20} />, label: "Targets" },
      { href: "/reports", icon: <BarChart2 size={20} />, label: "Reports" },
    ],
    lead_gen: [
      { href: "/", icon: <Home size={20} />, label: "Dashboard" },
      { href: "/my-profile", icon: <User size={20} />, label: "Profile" },
      { href: "/progress", icon: <LineChart size={20} />, label: "Progress" },
    ],
    sales: [
      { href: "/", icon: <Home size={20} />, label: "Dashboard" },
      { href: "/my-profiles", icon: <Users size={20} />, label: "Profiles" },
      { href: "/lead-entry", icon: <ClipboardList size={20} />, label: "Leads" },
    ],
  };

  // Get navigation links based on user role
  const navLinks = links[user.role as keyof typeof links] || [];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-40 border-t">
      <div className="flex justify-around">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <a
              className={cn(
                "flex flex-col items-center py-2 flex-1 text-sm",
                location === link.href
                  ? "text-primary"
                  : "text-neutral-medium"
              )}
            >
              {link.icon}
              <span className="text-xs mt-1">{link.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
