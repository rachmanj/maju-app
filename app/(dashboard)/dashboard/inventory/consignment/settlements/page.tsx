"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, App, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface SettlementRow {
  id: number;
  settlement_number: string;
  supplier_name: string;
  settlement_date: string;
  total_sales_amount: number;
  total_commission: number;
  net_payable: number;
  status: string;
}

const statusLabel: Record<string, string> = { draft: "Draft", confirmed: "Dikonfirmasi", paid: "Dibayar" };

export default function ConsignmentSettlementsPage() {
  const { message } = App.useApp();
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState<{ id: number; code: string; name: string }[]>([]);
  const [supplierId, setSupplierId] = useState<number | undefined>();

  useEffect(() => {
    fetch("/api/inventory/consignment/suppliers?limit=500").then((r) => r.ok ? r.json() : { suppliers: [] }).then((d: { suppliers?: { id: number; code: string; name: string }[] }) => setSuppliers(d.suppliers || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (supplierId) params.set("supplier_id", String(supplierId));
    fetch(`/api/inventory/consignment/settlements?${params}`)
      .then((r) => (r.ok ? r.json() : { settlements: [], total: 0 }))
      .then((d) => { setSettlements(d.settlements); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, [page, supplierId]);

  const columns: ColumnsType<SettlementRow> = [
    { title: "No. Settlement", dataIndex: "settlement_number", key: "settlement_number", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Tanggal", dataIndex: "settlement_date", key: "settlement_date", render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
    { title: "Supplier", dataIndex: "supplier_name", key: "supplier_name" },
    { title: "Total Penjualan", dataIndex: "total_sales_amount", key: "total_sales_amount", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
    { title: "Total Komisi", dataIndex: "total_commission", key: "total_commission", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
    { title: "Bersih Dibayar", dataIndex: "net_payable", key: "net_payable", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
    { title: "Status", dataIndex: "status", key: "status", render: (s) => statusLabel[s] || s },
    { title: "Aksi", key: "action", render: (_, r) => <Link href={`/dashboard/inventory/consignment/settlements/${r.id}`}><Button type="link">Detail</Button></Link> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlement Konsinyasi</h1>
          <p className="text-muted-foreground">Penyelesaian dengan supplier</p>
        </div>
        <Link href="/dashboard/inventory/consignment/settlements/new">
          <Button type="primary" icon={<PlusOutlined />}>Buat Settlement</Button>
        </Link>
      </div>
      <Card title="Daftar Settlement">
        <div className="mb-4">
          <Select placeholder="Semua supplier" allowClear className="w-56" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        <Table columns={columns} dataSource={settlements} rowKey="id" loading={loading} pagination={{ current: page, pageSize: 20, total, onChange: setPage }} />
      </Card>
    </div>
  );
}
