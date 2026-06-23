import { Suspense } from "react";
import { Card } from "antd";
import { SavingsAccountsList } from "@/components/savings/savings-accounts-list";
import { SavingsUploadExcel } from "@/components/savings/savings-upload-excel";
import { SavingsReduceSukarelaExcel } from "@/components/savings/savings-reduce-sukarela-upload";

export default function SavingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simpanan</h1>
          <p className="text-muted-foreground">Kelola simpanan anggota</p>
        </div>
        <div className="flex gap-2">
          <SavingsUploadExcel />
          <SavingsReduceSukarelaExcel />
        </div>
      </div>

      <Card title="Jenis Simpanan">
        <Suspense fallback={<div>Loading...</div>}>
          <SavingsAccountsList />
        </Suspense>
      </Card>
    </div>
  );
}
