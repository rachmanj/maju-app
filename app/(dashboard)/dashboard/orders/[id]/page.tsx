"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Table, Button, message, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import Link from "next/link";

type OrderDetail = {
  id: number;
  order_number: string;
  member_name: string;
  warehouse_name: string;
  total_amount: number;
  status: string;
  order_date: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  items: {
    product_name: string;
    quantity: number;
    unit_code: string;
    unit_price: number;
    total_amount: number;
  }[];
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const d = await res.json();
        setOrder(d);
      } else {
        message.error("Pesanan tidak ditemukan");
      }
    } catch {
      message.error("Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleConfirm = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Pesanan dikonfirmasi");
      fetchOrder();
    } catch (e: any) {
      message.error(e.message || "Gagal konfirmasi");
    }
  };

  const handleDeliver = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/deliver`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Pesanan dikirim");
      fetchOrder();
    } catch (e: any) {
      message.error(e.message || "Gagal kirim");
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Pesanan dibatalkan");
      router.push("/dashboard/orders");
    } catch (e: any) {
      message.error(e.message || "Gagal batalkan");
    }
  };

  const itemColumns: ColumnsType<OrderDetail["items"][0]> = [
    { title: "Produk", dataIndex: "product_name", key: "product_name" },
    {
      title: "Qty",
      key: "qty",
      render: (_, r) => `${r.quantity} ${r.unit_code}`,
    },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v) => `Rp ${Number(v).toLocaleString("id-ID")}`,
    },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v) => `Rp ${Number(v).toLocaleString("id-ID")}`,
    },
  ];

  if (loading || !order) {
    return (
      <div className="p-6">
        <p>Memuat...</p>
      </div>
    );
  }

  const statusColor =
    order.status === "pending"
      ? "gold"
      : order.status === "confirmed"
        ? "blue"
        : order.status === "delivered"
          ? "green"
          : "default";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/orders" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
            <ArrowLeftOutlined className="mr-1" /> Kembali
          </Link>
          <h1 className="text-3xl font-bold">Pesanan {order.order_number}</h1>
          <p className="text-muted-foreground">{order.member_name} • {order.warehouse_name}</p>
        </div>
        <Tag color={statusColor}>{order.status}</Tag>
      </div>

      <Card className="border-[hsl(var(--border))]">
        <div className="mb-4 flex flex-wrap gap-2">
          {order.status === "pending" && (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm}>
                Konfirmasi
              </Button>
              <Button danger icon={<CloseOutlined />} onClick={handleCancel}>
                Batal
              </Button>
            </>
          )}
          {order.status === "confirmed" && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleDeliver}>
              Tandai Dikirim
            </Button>
          )}
        </div>

        <p>
          <strong>Total:</strong> Rp {Number(order.total_amount).toLocaleString("id-ID")}
        </p>
        {order.notes && <p className="text-muted-foreground">Catatan: {order.notes}</p>}
        <p className="text-sm">
          Order: {new Date(order.order_date).toLocaleString("id-ID")}
          {order.confirmed_at && ` • Dikonfirmasi: ${new Date(order.confirmed_at).toLocaleString("id-ID")}`}
          {order.delivered_at && ` • Dikirim: ${new Date(order.delivered_at).toLocaleString("id-ID")}`}
        </p>

        <Table
          columns={itemColumns}
          dataSource={order.items}
          rowKey={(_, i) => String(i)}
          pagination={false}
          className="mt-4"
        />
      </Card>
    </div>
  );
}
