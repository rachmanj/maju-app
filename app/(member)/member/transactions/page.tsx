"use client";

import { useEffect, useState } from "react";
import { Card, Table, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";

interface TxRow {
  id: number;
  account_id?: number;
  type: string;
  amount: number;
  date: string;
  balance_after?: number;
  savings_type_name?: string;
}

export default function MemberTransactionsPage() {
  const [data, setData] = useState<{ transactions: TxRow[]; total: number }>({ transactions: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member-portal/savings/transactions")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData({
          transactions: d.transactions ?? [],
          total: d.total ?? 0,
        });
      })
      .catch(() => setData({ transactions: [], total: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const columns: ColumnsType<TxRow> = [
    {
      title: "Tanggal",
      dataIndex: "date",
      key: "date",
      render: (v: string) => (v ? new Date(v).toLocaleDateString("id-ID") : "-"),
    },
    {
      title: "Jenis",
      dataIndex: "type",
      key: "type",
      render: (t: string) => (t === "deposit" ? "Setoran" : t === "withdrawal" ? "Penarikan" : t),
    },
    {
      title: "Rekening",
      dataIndex: "savings_type_name",
      key: "savings_type_name",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Jumlah",
      dataIndex: "amount",
      key: "amount",
      render: (v: number, row) => (
        <span className={row.type === "deposit" ? "text-green-600" : "text-red-600"}>
          {row.type === "deposit" ? "+" : "-"}
          {formatRupiah(Number(v))}
        </span>
      ),
    },
    {
      title: "Saldo Setelah",
      dataIndex: "balance_after",
      key: "balance_after",
      render: (v: number) => (v != null ? formatRupiah(Number(v)) : "-"),
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
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Riwayat Transaksi</h1>
      <Card title="Transaksi Simpanan" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.transactions}
          pagination={{ pageSize: 20, total: data.total }}
          locale={{ emptyText: "Belum ada transaksi" }}
        />
      </Card>
    </div>
  );
}
