import { Suspense } from "react";
import { Card } from "antd";
import { SavingsAccountsList } from "@/components/savings/savings-accounts-list";

export default function SavingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Simpanan</h1>
        <p className="text-muted-foreground">Kelola simpanan anggota</p>
      </div>

      <Card title="Jenis Simpanan">
        <Suspense fallback={<div>Loading...</div>}>
          <SavingsAccountsList />
        </Suspense>
      </Card>
    </div>
  );
}
