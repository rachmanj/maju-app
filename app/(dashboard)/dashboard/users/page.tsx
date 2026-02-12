"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { UsersTable } from "@/components/users/users-table";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    const roles = (session.user as { roles?: string[] })?.roles ?? [];
    if (!hasPermission(roles, PERMISSIONS.ADMIN_USERS)) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-6">Memuat...</div>;
  }

  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  if (!hasPermission(roles, PERMISSIONS.ADMIN_USERS)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola akun pengguna dan role sistem</p>
        </div>
        <Link href="/dashboard/users/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Tambah Pengguna
          </Button>
        </Link>
      </div>

      <Card title="Daftar Pengguna">
        <Suspense fallback={<div>Memuat...</div>}>
          <UsersTable />
        </Suspense>
      </Card>
    </div>
  );
}
