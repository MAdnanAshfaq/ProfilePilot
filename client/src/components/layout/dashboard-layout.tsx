import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar className="hidden md:flex" />
      <main className="min-h-screen pt-6 px-4 md:px-8 pb-20 md:ml-64">
        {title && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
