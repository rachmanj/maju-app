"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, App, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface ReceiptRow {
  id: number;
  receipt_number: string;
  supplier_name: string;
  warehouse_name: string;
  receipt_date: string;
  status: string;
}

export default function ConsignmentReceiptsPage() {
  const { message } = App.useApp();
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (supplierId) params.set("supplier_id", String(supplierId));
    if (warehouseId) params.set("warehouse_id", String(warehouseId));
    fetch(`/api/inventory/consignment/receipts?${params}`)
      .then((r) => (r.ok ? r.json() : { receipts: [], total: 0 }))
      .then((d) => { setReceipts(d.receipts); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, [page, supplierId, warehouseId]);

  const columns: ColumnsType<ReceiptRow> = [
    { title: "No. Penerimaan", dataIndex: "receipt_number", key: "receipt_number", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Tanggal", dataIndex: "receipt_date", key: "receipt_date", render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
    { title: "Supplier", dataIndex: "supplier_name", key: "supplier_name" },
    { title: "Gudang", dataIndex: "warehouse_name", key: "warehouse_name" },
    { title: "Aksi", key: "action", render: (_, r) => <Link href={`/dashboard/inventory/consignment/receipts/${r.id}`}><Button type="link">Detail</Button></Link> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Penerimaan Konsinyasi</h1>
          <p className="text-muted-foreground">Barang masuk konsinyasi</p>
        </div>
        <Link href="/dashboard/inventory/consignment/receipts/new">
          <Button type="primary" icon={<PlusOutlined />}>Penerimaan Baru</Button>
        </Link>
      </div>
      <Card title="Daftar Penerimaan">
        <div className="mb-4 flex gap-4">
          <Select placeholder="Semua supplier" allowClear className="w-48" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          <Select placeholder="Semua gudang" allowClear className="w-48" value={warehouseId} onChange={setWarehouseId} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
        </div>
        <Table columns={columns} dataSource={receipts} rowKey="id" loading={loading} pagination={{ current: page, pageSize: 20, total, onChange: setPage }} />
      </Card>
    </div>
  );
}
