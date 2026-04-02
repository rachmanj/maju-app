"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Table, Spin, Button, Descriptions } from "antd";
import { ArrowLeftOutlined, ShoppingOutlined } from "@ant-design/icons";

interface PosDetail {
  id: number;
  transaction_number: string;
  transaction_date: string;
  warehouse_name: string;
  warehouse_code: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  payment_methods: string;
  items: {
    id: number;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_code: string;
    unit_price: number;
    discount_amount: number;
    total_amount: number;
  }[];
  payments: { payment_method: string; amount: number }[];
}

export default function MemberPosTransactionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<PosDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/member-portal/pos-transactions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDetail(d);
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const payLabel: Record<string, string> = {
    cash: "Tunai",
    potong_gaji: "Potong Gaji",
    simpanan: "Simpanan",
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Transaksi tidak ditemukan.
        <Link href="/member/pos-transactions" className="ml-2 underline">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const columns = [
    { title: "Kode", dataIndex: "product_code", key: "product_code", width: 100 },
    { title: "Produk", dataIndex: "product_name", key: "product_name" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code", width: 80 },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Diskon",
      dataIndex: "discount_amount",
      key: "discount_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Subtotal",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/member/pos-transactions">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Kembali
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">
          <ShoppingOutlined className="mr-2 text-teal-600" />
          {detail.transaction_number}
        </h1>
      </div>

      <Card className="shadow-sm">
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label="Tanggal">
            {detail.transaction_date ? new Date(detail.transaction_date).toLocaleString("id-ID") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Gudang">
            {detail.warehouse_code} — {detail.warehouse_name}
          </Descriptions.Item>
          <Descriptions.Item label="Subtotal">{formatRupiah(detail.subtotal)}</Descriptions.Item>
          <Descriptions.Item label="Diskon">{formatRupiah(detail.discount_amount)}</Descriptions.Item>
          <Descriptions.Item label="Total">{formatRupiah(detail.total_amount)}</Descriptions.Item>
          <Descriptions.Item label="Pembayaran">{detail.payment_methods}</Descriptions.Item>
        </Descriptions>
        {detail.payments.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[hsl(var(--foreground))]">Rincian pembayaran</p>
            <ul className="list-inside list-disc text-sm text-[hsl(var(--muted-foreground))]">
              {detail.payments.map((p, i) => (
                <li key={i}>
                  {payLabel[p.payment_method] ?? p.payment_method}: {formatRupiah(p.amount)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {detail.notes && (
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Catatan: {detail.notes}</p>
        )}
      </Card>

      <Card title="Detail barang" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={detail.items}
          pagination={false}
          locale={{ emptyText: "Tidak ada barang" }}
        />
      </Card>
    </div>
  );
}
