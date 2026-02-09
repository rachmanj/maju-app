import { Suspense } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { MembersTable } from "@/components/members/members-table";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Anggota</h1>
          <p className="text-muted-foreground">Kelola data anggota koperasi</p>
        </div>
        <Link href="/dashboard/members/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Tambah Anggota
          </Button>
        </Link>
      </div>

      <Card title="Daftar Anggota">
        <Suspense fallback={<div>Loading...</div>}>
          <MembersTable />
        </Suspense>
      </Card>
    </div>
  );
}
