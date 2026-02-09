"use client";

import { useEffect, useState } from "react";
import { Card, Table, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";

interface SavingsAccount {
  id: number;
  account_number: string;
  savings_type_code: string;
  savings_type_name: string;
  balance: number;
  opened_date: string;
}

export default function MemberSavingsPage() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member-portal/savings")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setAccounts(d);
        else if (d.error) throw new Error(d.error);
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const columns: ColumnsType<SavingsAccount> = [
    { title: "No. Rekening", dataIndex: "account_number", key: "account_number" },
    { title: "Jenis", dataIndex: "savings_type_name", key: "savings_type_name" },
    {
      title: "Saldo",
      dataIndex: "balance",
      key: "balance",
      render: (v: number) => formatRupiah(v),
    },
    {
      title: "Tanggal Buka",
      dataIndex: "opened_date",
      key: "opened_date",
      render: (v: string) => (v ? new Date(v).toLocaleDateString("id-ID") : "-"),
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
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Simpanan</h1>
      <Card title="Rekening Simpanan" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={accounts}
          pagination={false}
          locale={{ emptyText: "Belum ada rekening simpanan" }}
        />
      </Card>
    </div>
  );
}
