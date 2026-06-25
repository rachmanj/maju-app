"use client";

import { useEffect, useState } from "react";
import { Card, Spin, Descriptions } from "antd";
import { WalletOutlined, CreditCardOutlined, TransactionOutlined, UserOutlined } from "@ant-design/icons";

interface MemberInfo {
  member_number: string;
  nik: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  joined_date: string | null;
  status: string | null;
  project_name: string | null;
  project_code: string | null;
  department_name: string | null;
  department_code: string | null;
}

interface DashboardData {
  member: MemberInfo | null;
  totalSavings: number;
  savingsByType: { code: string; name: string; balance: number; totalDeposits: number }[];
  totalWithdrawals: number;
  totalOutstanding: number;
  activeLoansCount: number;
  recentTransactions: { id: number; type: string; amount: number; date: string; savings_type?: string; savings_type_code?: string }[];
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

  const TYPE_DISPLAY_ORDER = ["POKOK", "WAJIB", "SUKARELA_SHU", "SUKARELA_REGULER"];
  const DISPLAY_NAME_OVERRIDE: Record<string, string> = {
    SUKARELA_REGULER: "Simpanan Sukarela",
  };

  const DEPOSIT_TOTAL_TYPES = new Set(["SUKARELA_SHU", "SUKARELA_REGULER"]);

  const savingsByType = data.savingsByType
    .filter((s) => s.code !== "SUKARELA")
    .sort((a, b) => TYPE_DISPLAY_ORDER.indexOf(a.code) - TYPE_DISPLAY_ORDER.indexOf(b.code))
    .map((s) => ({
      ...s,
      name: DISPLAY_NAME_OVERRIDE[s.code] ?? s.name,
      displayAmount: DEPOSIT_TOTAL_TYPES.has(s.code) ? s.totalDeposits : s.balance,
    }));

  const withdrawableFunds = data.savingsByType
    .filter((s) => s.code === "SUKARELA_SHU" || s.code === "SUKARELA_REGULER")
    .reduce((sum, s) => sum + s.balance, 0);

  const formatTransactionLabel = (type: string, savingsTypeCode?: string, savingsTypeName?: string) => {
    const action = type === "deposit" ? "Setor" : "Tarik";
    const typeName = savingsTypeCode
      ? (DISPLAY_NAME_OVERRIDE[savingsTypeCode] ?? savingsTypeName ?? "-")
      : (savingsTypeName ?? "-");
    return `${action} - ${typeName}`;
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const formatDate = (v: string) =>
    new Date(v).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getStatusLabel = (s: string | null) => {
    const map: Record<string, string> = {
      active: "Aktif",
      pending: "Menunggu",
      inactive: "Tidak Aktif",
      resigned: "Keluar",
    };
    return (s && map[s]) || s || "-";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Dashboard</h1>

      {data.member && (
        <Card
          title={
            <span>
              <UserOutlined className="mr-2" />
              Data Anggota
            </span>
          }
          className="shadow-sm"
        >
          <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
            <Descriptions.Item label="Nomor Anggota">
              <span className="font-mono">{data.member.member_number}</span>
            </Descriptions.Item>
            <Descriptions.Item label="NIK">{data.member.nik || "-"}</Descriptions.Item>
            <Descriptions.Item label="Nama Lengkap">{data.member.name}</Descriptions.Item>
            <Descriptions.Item label="Status">{getStatusLabel(data.member.status)}</Descriptions.Item>
            <Descriptions.Item label="Email">{data.member.email || "-"}</Descriptions.Item>
            <Descriptions.Item label="Telepon">{data.member.phone || "-"}</Descriptions.Item>
            <Descriptions.Item label="Jabatan">{data.member.job_title || "-"}</Descriptions.Item>
            <Descriptions.Item label="Tanggal Bergabung">
              {data.member.joined_date ? formatDate(data.member.joined_date) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Proyek">
              {data.member.project_name
                ? [data.member.project_code, data.member.project_name].filter(Boolean).join(" - ")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Departemen">
              {data.member.department_name
                ? [data.member.department_code, data.member.department_name].filter(Boolean).join(" - ")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Alamat" span={2}>
              {data.member.address || "-"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/30">
              <WalletOutlined className="text-2xl text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Dana Yang Bisa Ditarik</p>
              <p className="text-lg font-semibold">{formatRupiah(withdrawableFunds)}</p>
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
            {savingsByType.flatMap((s) => {
              const rows = [
                <li key={s.code} className="flex justify-between">
                  <span className="text-[hsl(var(--foreground))]/80">{s.name}</span>
                  <span className="font-medium">{formatRupiah(s.displayAmount)}</span>
                </li>,
              ];
              if (s.code === "SUKARELA_REGULER") {
                rows.push(
                  <li key="total-withdrawals" className="flex justify-between">
                    <span className="text-[hsl(var(--foreground))]/80">Penarikan Simpanan</span>
                    <span className="font-medium text-red-600">{formatRupiah(data.totalWithdrawals)}</span>
                  </li>
                );
              }
              return rows;
            })}
            {savingsByType.length === 0 && (
              <li className="text-[hsl(var(--muted-foreground))]">Belum ada simpanan</li>
            )}
          </ul>
        </Card>
        <Card title="Transaksi Terbaru" className="shadow-sm">
          <ul className="space-y-2">
            {data.recentTransactions.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span>
                  {formatTransactionLabel(t.type, t.savings_type_code, t.savings_type)}
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
