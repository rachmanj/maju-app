import { Suspense } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { LoansTable } from "@/components/loans/loans-table";

export default function LoansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pinjaman</h1>
          <p className="text-muted-foreground">Kelola pinjaman anggota</p>
        </div>
        <Link href="/dashboard/loans/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Pengajuan Baru
          </Button>
        </Link>
      </div>

      <Card title="Daftar Pinjaman">
        <Suspense fallback={<div>Loading...</div>}>
          <LoansTable />
        </Suspense>
      </Card>
    </div>
  );
}
