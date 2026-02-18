"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "antd";
import { OnlineUsersCard } from "@/components/monitoring/online-users-card";
import { MemberActivityTable } from "@/components/monitoring/member-activity-table";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export default function MonitoringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    const roles = (session.user as { roles?: string[] })?.roles ?? [];
    if (!hasPermission(roles, PERMISSIONS.ADMIN_MONITORING)) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-6">Memuat...</div>;
  }

  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  if (!hasPermission(roles, PERMISSIONS.ADMIN_MONITORING)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Monitoring</h1>
        <p className="text-muted-foreground">
          Pengguna online dan statistik aktivitas anggota
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OnlineUsersCard />
      </div>

      <Card title="Statistik Aktivitas Anggota">
        <MemberActivityTable />
      </Card>
    </div>
  );
}
