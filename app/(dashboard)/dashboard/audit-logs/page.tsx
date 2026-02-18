"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "antd";
import { AuditLogsTable } from "@/components/audit/audit-logs-table";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    const roles = (session.user as { roles?: string[] })?.roles ?? [];
    if (!hasPermission(roles, PERMISSIONS.ADMIN_AUDIT)) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-6">Memuat...</div>;
  }

  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  if (!hasPermission(roles, PERMISSIONS.ADMIN_AUDIT)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">
          Riwayat aksi sistem - siapa melakukan apa dan kapan
        </p>
      </div>

      <Card title="Daftar Log">
        <AuditLogsTable />
      </Card>
    </div>
  );
}
