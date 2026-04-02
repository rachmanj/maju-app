"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Table, DatePicker, Button, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ShoppingOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

type TxRow = {
  id: number;
  transaction_number: string;
  transaction_date: string;
  warehouse_name: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_methods: string;
};

export default function MemberPosTransactionsPage() {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [data, setData] = useState<TxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [from, to] = range;
    if (!from || !to) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        fromDate: from.format("YYYY-MM-DD"),
        toDate: to.format("YYYY-MM-DD"),
      });
      const res = await fetch(`/api/member-portal/pos-transactions?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data");
      setData(json.transactions ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [range, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const columns: ColumnsType<TxRow> = [
    {
      title: "No. Transaksi",
      dataIndex: "transaction_number",
      key: "transaction_number",
      render: (v: string) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (v: string) => (v ? new Date(v).toLocaleString("id-ID") : "-"),
    },
    { title: "Gudang", dataIndex: "warehouse_name", key: "warehouse_name" },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Pembayaran",
      dataIndex: "payment_methods",
      key: "payment_methods",
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_, row) => (
        <Link href={`/member/pos-transactions/${row.id}`} className="text-teal-600 hover:underline">
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          <ShoppingOutlined className="mr-2 text-teal-600" />
          Riwayat Belanja POS
        </h1>
      </div>

      <Card className="shadow-sm">
        <Space wrap className="mb-4">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Periode</span>
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => {
              setRange(v as [Dayjs | null, Dayjs | null]);
              setPage(1);
            }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              load();
            }}
          >
            Tampilkan
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          locale={{ emptyText: "Belum ada transaksi POS di periode ini" }}
        />
      </Card>
    </div>
  );
}
