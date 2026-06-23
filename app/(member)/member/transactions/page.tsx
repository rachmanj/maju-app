"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Table, Spin, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

type TransactionCategory = "sukarela" | "pokok_wajib";

interface TxRow {
  id: number;
  account_id?: number;
  type: string;
  amount: number;
  date: string;
  balance_after?: number;
  balance_before?: number;
  savings_type_code?: string;
  savings_type_name?: string;
  notes?: string;
}

const TAB_ITEMS = [
  { key: "sukarela", tab: "Transaksi Simpanan Sukarela" },
  { key: "pokok_wajib", tab: "Transaksi Simpanan Pokok & Wajib" },
] as const;

export default function MemberTransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountId = searchParams.get("accountId");
  const [activeTab, setActiveTab] = useState<TransactionCategory>("sukarela");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ transactions: TxRow[]; total: number }>({ transactions: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (accountId) {
      params.set("accountId", accountId);
    } else {
      params.set("category", activeTab);
    }

    fetch(`/api/member-portal/savings/transactions?${params}`)
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
  }, [accountId, activeTab, page]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const formatDate = (v: string) =>
    v
      ? new Date(v).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const columns: ColumnsType<TxRow> = [
    {
      title: "Tanggal",
      dataIndex: "date",
      key: "date",
      render: (v: string) => formatDate(v),
    },
    {
      title: "Jenis",
      dataIndex: "type",
      key: "type",
      render: (t: string) => (t === "deposit" ? "Setoran" : t === "withdrawal" ? "Penarikan" : t),
    },
    ...(!accountId
      ? [
          {
            title: "Rekening",
            dataIndex: "savings_type_name",
            key: "savings_type_name",
            render: (v: string) => v ?? "-",
          },
        ]
      : []),
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

  if (loading && data.transactions.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        {accountId && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/member/transactions")}
          >
            Semua Transaksi
          </Button>
        )}
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          {accountId ? "Transaksi Rekening" : "Riwayat Transaksi"}
        </h1>
      </div>
      <Card
        className="shadow-sm"
        title={accountId ? "Transaksi Simpanan" : undefined}
        tabList={accountId ? undefined : TAB_ITEMS.map((item) => ({ key: item.key, tab: item.tab }))}
        activeTabKey={accountId ? undefined : activeTab}
        onTabChange={(key) => {
          setActiveTab(key as TransactionCategory);
          setPage(1);
        }}
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.transactions}
          pagination={{
            current: page,
            pageSize: 20,
            total: data.total,
            onChange: (nextPage) => setPage(nextPage),
          }}
          locale={{ emptyText: "Belum ada transaksi" }}
        />
      </Card>
    </div>
  );
}
