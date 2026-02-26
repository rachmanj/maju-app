import { Suspense } from "react";
import { Button, Card, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { LoansTable } from "@/components/loans/loans-table";
import { LoanApplicationsTable } from "@/components/loans/loan-applications-table";
import { LoansUploadExcel } from "@/components/loans/loans-upload-excel";

export default function LoansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pinjaman</h1>
          <p className="text-muted-foreground">Kelola pinjaman anggota</p>
        </div>
        <Space>
          <LoansUploadExcel />
          <Link href="/dashboard/loans/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Pengajuan Baru
            </Button>
          </Link>
        </Space>
      </div>

      <Card title="Pengajuan Menunggu">
        <Suspense fallback={<div>Loading...</div>}>
          <LoanApplicationsTable />
        </Suspense>
      </Card>

      <Card title="Daftar Pinjaman">
        <Suspense fallback={<div>Loading...</div>}>
          <LoansTable />
        </Suspense>
      </Card>
    </div>
  );
}

