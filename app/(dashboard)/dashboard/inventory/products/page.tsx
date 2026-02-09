import { Suspense } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { ProductsTable } from "@/components/inventory/products-table";

export default function InventoryProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Produk</h1>
          <p className="text-muted-foreground">Daftar produk dan kategori</p>
        </div>
        <Link href="/dashboard/inventory/products/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Tambah Produk
          </Button>
        </Link>
      </div>

      <Card title="Daftar Produk">
        <Suspense fallback={<div>Loading...</div>}>
          <ProductsTable />
        </Suspense>
      </Card>
    </div>
  );
}
