import { Suspense } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { ConsignmentSuppliersTable } from "@/components/inventory/consignment-suppliers-table";

export default function ConsignmentSuppliersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplier Konsinyasi</h1>
          <p className="text-muted-foreground">Data supplier barang konsinyasi</p>
        </div>
        <Link href="/dashboard/inventory/consignment/suppliers/new">
          <Button type="primary" icon={<PlusOutlined />}>Tambah Supplier</Button>
        </Link>
      </div>
      <Card title="Daftar Supplier">
        <Suspense fallback={<div>Loading...</div>}>
          <ConsignmentSuppliersTable />
        </Suspense>
      </Card>
    </div>
  );
}
