"use client";

import { useEffect, useState } from "react";
import { Card, Spin } from "antd";
import { WalletOutlined, CreditCardOutlined, TransactionOutlined } from "@ant-design/icons";

interface DashboardData {
  totalSavings: number;
  savingsByType: { code: string; name: string; balance: number }[];
  totalOutstanding: number;
  activeLoansCount: number;
  recentTransactions: { id: number; type: string; amount: number; date: string; savings_type?: string }[];
}

export default function MemberDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member-portal/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Gagal memuat dashboard. Silakan coba lagi.
      </div>
    );
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/30">
              <WalletOutlined className="text-2xl text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Simpanan</p>
              <p className="text-lg font-semibold">{formatRupiah(data.totalSavings)}</p>
            </div>
          </div>
        </Card>
        <Card className="shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <CreditCardOutlined className="text-2xl text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Pinjaman Aktif</p>
              <p className="text-lg font-semibold">
                {data.activeLoansCount} pinjaman · {formatRupiah(data.totalOutstanding)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <TransactionOutlined className="text-2xl text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Transaksi Terbaru</p>
              <p className="text-lg font-semibold">{data.recentTransactions.length} transaksi</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Simpanan per Jenis" className="shadow-sm">
          <ul className="space-y-2">
            {data.savingsByType.map((s) => (
              <li key={s.code} className="flex justify-between">
                <span className="text-[hsl(var(--foreground))]/80">{s.name}</span>
                <span className="font-medium">{formatRupiah(s.balance)}</span>
              </li>
            ))}
            {data.savingsByType.length === 0 && (
              <li className="text-[hsl(var(--muted-foreground))]">Belum ada simpanan</li>
            )}
          </ul>
        </Card>
        <Card title="Transaksi Terbaru" className="shadow-sm">
          <ul className="space-y-2">
            {data.recentTransactions.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span>
                  {t.type === "deposit" ? "Setor" : "Tarik"} · {t.savings_type ?? "-"}
                </span>
                <span className={t.type === "deposit" ? "text-green-600" : "text-red-600"}>
                  {t.type === "deposit" ? "+" : "-"}
                  {formatRupiah(t.amount)}
                </span>
              </li>
            ))}
            {data.recentTransactions.length === 0 && (
              <li className="text-[hsl(var(--muted-foreground))]">Belum ada transaksi</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
