"use client";

import { Suspense } from "react";
import { SessionProvider } from "@/components/providers/session-provider";
import { DashboardRedirect } from "@/components/auth/dashboard-redirect";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { useHeartbeat } from "@/lib/hooks/use-heartbeat";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  useHeartbeat("dashboard");
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
          <Suspense fallback={<aside className="fixed left-0 top-0 z-40 h-screen w-64 shrink-0 bg-[hsl(var(--sidebar-bg))]" />}>
            <Sidebar />
          </Suspense>
          <DashboardContent>{children}</DashboardContent>
        </div>
      </DashboardRedirect>
    </SessionProvider>
  );
}
