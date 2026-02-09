"use client";

import { useEffect, useState } from "react";
import { Card, Table, Select, App } from "antd";
import type { ColumnsType } from "antd/es/table";

interface StockRow {
  supplier_code: string;
  supplier_name: string;
  warehouse_code: string;
  warehouse_name: string;
  product_code: string;
  product_name: string;
  unit_code: string;
  quantity: number;
}

export default function ConsignmentStockPage() {
  const { message } = App.useApp();
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<{ id: number; code: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [warehouseId, setWarehouseId] = useState<number | undefined>();

  useEffect(() => {
    fetch("/api/inventory/consignment/suppliers?limit=500").then((r) => r.ok ? r.json() : { suppliers: [] }).then((d: { suppliers?: { id: number; code: string; name: string }[] }) => setSuppliers(d.suppliers || []));
    fetch("/api/inventory/warehouses?all=true").then((r) => r.ok ? r.json() : []).then(setWarehouses);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (supplierId) params.set("supplier_id", String(supplierId));
    if (warehouseId) params.set("warehouse_id", String(warehouseId));
    fetch(`/api/inventory/consignment/stock?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setStock)
      .catch(() => message.error("Gagal memuat stok"))
      .finally(() => setLoading(false));
  }, [supplierId, warehouseId, message]);

  const columns: ColumnsType<StockRow> = [
    { title: "Supplier", key: "supplier", render: (_, r) => `${r.supplier_code} - ${r.supplier_name}` },
    { title: "Gudang", key: "warehouse", render: (_, r) => `${r.warehouse_code} - ${r.warehouse_name}` },
    { title: "Produk", key: "product", render: (_, r) => `${r.product_code} - ${r.product_name}` },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code" },
    { title: "Jumlah", dataIndex: "quantity", key: "quantity", align: "right", render: (q) => Number(q) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stok Konsinyasi</h1>
        <p className="text-muted-foreground">Stok barang konsinyasi per supplier & gudang</p>
      </div>
      <Card title="Daftar Stok">
        <div className="mb-4 flex gap-4">
          <Select placeholder="Semua supplier" allowClear className="w-56" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          <Select placeholder="Semua gudang" allowClear className="w-56" value={warehouseId} onChange={setWarehouseId} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
        </div>
        <Table columns={columns} dataSource={stock} rowKey={(r) => `${r.supplier_code}-${r.warehouse_code}-${r.product_code}`} loading={loading} pagination={{ pageSize: 20 }} locale={{ emptyText: "Tidak ada stok konsinyasi" }} />
      </Card>
    </div>
  );
}
