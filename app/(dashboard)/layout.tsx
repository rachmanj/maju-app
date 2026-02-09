"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { DashboardRedirect } from "@/components/auth/dashboard-redirect";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useSidebar } from "@/lib/hooks/use-sidebar";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <div
      className="flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300"
      style={{ marginLeft: isCollapsed ? 80 : 256 }}
    >
      <Header />
      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardRedirect>
        <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
          <Sidebar />
          <DashboardContent>{children}</DashboardContent>
        </div>
      </DashboardRedirect>
    </SessionProvider>
  );
}
