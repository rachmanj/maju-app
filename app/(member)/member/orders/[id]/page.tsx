"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Spin } from "antd";
import Link from "next/link";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface OrderDetail {
  id: number;
  order_number: string;
  warehouse_name: string;
  total_amount: number;
  status: string;
  order_date: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  items: { id: number; product_name: string; quantity: number; unit_code: string; unit_price: number; total_amount: number }[];
}

export default function MemberOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/member-portal/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOrder(d);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const statusLabel: Record<string, string> = {
    pending: "Menunggu konfirmasi",
    confirmed: "Dikonfirmasi",
    delivered: "Selesai",
    cancelled: "Dibatalkan",
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Pesanan tidak ditemukan.
        <Link href="/member/orders" className="ml-2 underline">Kembali ke daftar</Link>
      </div>
    );
  }

  const columns = [
    { title: "Produk", dataIndex: "product_name", key: "product_name" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code", width: 80 },
    {
      title: "Harga Satuan",
      dataIndex: "unit_price",
      key: "unit_price",
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
        <Link href="/member/orders">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Kembali
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Pesanan {order.order_number}</h1>
      </div>
      <Card className="shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Gudang</p>
            <p className="font-medium">{order.warehouse_name}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Status</p>
            <p className="font-medium">{statusLabel[order.status] ?? order.status}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Tanggal Pesan</p>
            <p className="font-medium">{order.order_date ? new Date(order.order_date).toLocaleDateString("id-ID") : "-"}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Total</p>
            <p className="font-medium">{formatRupiah(Number(order.total_amount))}</p>
          </div>
        </div>
        {order.notes && (
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Catatan: {order.notes}</p>
        )}
      </Card>
      <Card title="Detail Barang" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={order.items}
          pagination={false}
        />
      </Card>
    </div>
  );
}
