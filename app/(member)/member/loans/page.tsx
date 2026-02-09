"use client";

import { useEffect, useState } from "react";
import { Card, Table, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";

interface LoanRow {
  id: number;
  loan_number: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  created_at: string;
}

export default function MemberLoansPage() {
  const [data, setData] = useState<{ loans: LoanRow[]; total: number }>({ loans: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member-portal/loans")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData({ loans: d.loans ?? [], total: d.total ?? 0 });
      })
      .catch(() => setData({ loans: [], total: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const statusLabel: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    disbursed: "Cair",
    active: "Aktif",
    completed: "Lunas",
    rejected: "Ditolak",
  };

  const columns: ColumnsType<LoanRow> = [
    { title: "No. Pinjaman", dataIndex: "loan_number", key: "loan_number" },
    {
      title: "Pokok",
      dataIndex: "principal_amount",
      key: "principal_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Bunga",
      dataIndex: "interest_rate",
      key: "interest_rate",
      render: (v: number) => `${Number(v)}%`,
    },
    { title: "Tenor (bulan)", dataIndex: "term_months", key: "term_months" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => statusLabel[s] ?? s,
    },
    {
      title: "",
      key: "action",
      render: (_, row) => (
        <Link href={`/member/loans/${row.id}`} className="text-teal-600 hover:underline">
          Detail / Jadwal
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
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Pinjaman</h1>
      <Card title="Daftar Pinjaman" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.loans}
          pagination={{ pageSize: 10, total: data.total }}
          locale={{ emptyText: "Belum ada pinjaman" }}
        />
      </Card>
    </div>
  );
}
