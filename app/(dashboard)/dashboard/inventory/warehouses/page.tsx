import { Suspense } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { WarehousesTable } from "@/components/inventory/warehouses-table";

export default function InventoryWarehousesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gudang</h1>
          <p className="text-muted-foreground">Kelola gudang dan lokasi</p>
        </div>
        <Link href="/dashboard/inventory/warehouses/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Tambah Gudang
          </Button>
        </Link>
      </div>

      <Card title="Daftar Gudang">
        <Suspense fallback={<div>Loading...</div>}>
          <WarehousesTable />
        </Suspense>
      </Card>
    </div>
  );
}
