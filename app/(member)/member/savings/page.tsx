"use client";

import { useEffect, useState } from "react";
import { Card, Table, Spin, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import Link from "next/link";
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

  const TYPE_DISPLAY_ORDER = ["POKOK", "WAJIB", "SUKARELA_SHU", "SUKARELA_REGULER"];
  const DISPLAY_NAME_OVERRIDE: Record<string, string> = {
    SUKARELA_REGULER: "Simpanan Sukarela",
  };

  useEffect(() => {
    fetch("/api/member-portal/savings")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const filtered = d.filter((a: SavingsAccount) => a.savings_type_code !== "SUKARELA");
          const sorted = filtered.sort(
            (a: SavingsAccount, b: SavingsAccount) =>
              TYPE_DISPLAY_ORDER.indexOf(a.savings_type_code) - TYPE_DISPLAY_ORDER.indexOf(b.savings_type_code)
          );
          setAccounts(sorted);
        } else if (d.error) throw new Error(d.error);
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const columns: ColumnsType<SavingsAccount> = [
    { title: "No. Rekening", dataIndex: "account_number", key: "account_number" },
    {
      title: "Jenis",
      dataIndex: "savings_type_code",
      key: "savings_type_name",
      render: (_: unknown, r: SavingsAccount) => DISPLAY_NAME_OVERRIDE[r.savings_type_code] ?? r.savings_type_name,
    },
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
    {
      title: "Aksi",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Link href={`/member/transactions?accountId=${record.id}`}>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            Lihat Transaksi
          </Button>
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
