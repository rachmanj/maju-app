"use client";

import { useEffect, useState } from "react";
import { Card, Table, Spin, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";

interface OrderRow {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  order_date: string;
  confirmed_at: string | null;
  delivered_at: string | null;
}

export default function MemberOrdersPage() {
  const [data, setData] = useState<{ orders: OrderRow[]; total: number }>({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member-portal/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData({ orders: d.orders ?? [], total: d.total ?? 0 });
      })
      .catch(() => setData({ orders: [], total: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const statusLabel: Record<string, string> = {
    pending: "Menunggu konfirmasi",
    confirmed: "Dikonfirmasi",
    delivered: "Selesai",
    cancelled: "Dibatalkan",
  };

  const columns: ColumnsType<OrderRow> = [
    { title: "No. Pesanan", dataIndex: "order_number", key: "order_number" },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => statusLabel[s] ?? s,
    },
    {
      title: "Tanggal",
      dataIndex: "order_date",
      key: "order_date",
      render: (v: string) => (v ? new Date(v).toLocaleDateString("id-ID") : "-"),
    },
    {
      title: "",
      key: "action",
      render: (_, row) => (
        <Link href={`/member/orders/${row.id}`} className="text-teal-600 hover:underline">
          Detail
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Pesanan</h1>
        <Link href="/member/orders/new">
          <Button type="primary">Buat Pesanan</Button>
        </Link>
      </div>
      <Card title="Daftar Pesanan" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.orders}
          pagination={{ pageSize: 10, total: data.total }}
          locale={{ emptyText: "Belum ada pesanan" }}
        />
      </Card>
    </div>
  );
}
