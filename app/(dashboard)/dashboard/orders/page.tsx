"use client";

import { useState, useEffect } from "react";
import { Card, Table, Select, Button, message, Tag, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import Link from "next/link";

type Order = {
  id: number;
  order_number: string;
  member_name: string;
  total_amount: number;
  status: string;
  order_date: string;
};

export default function OrdersPage() {
  const [data, setData] = useState<{ orders: Order[]; total: number }>({ orders: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(status && { status }),
      });
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      message.error("Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, status]);

  const handleConfirm = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}/confirm`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      message.success("Pesanan dikonfirmasi");
      fetchOrders();
    } catch (e: any) {
      message.error(e.message || "Gagal konfirmasi");
    }
  };

  const handleDeliver = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}/deliver`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      message.success("Pesanan dikirim");
      fetchOrders();
    } catch (e: any) {
      message.error(e.message || "Gagal kirim");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      message.success("Pesanan dibatalkan");
      fetchOrders();
    } catch (e: any) {
      message.error(e.message || "Gagal batalkan");
    }
  };

  const columns: ColumnsType<Order> = [
    { title: "No. Pesanan", dataIndex: "order_number", key: "order_number" },
    { title: "Anggota", dataIndex: "member_name", key: "member_name" },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v) => `Rp ${Number(v).toLocaleString("id-ID")}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => {
        const color =
          s === "pending"
            ? "gold"
            : s === "confirmed"
              ? "blue"
              : s === "delivered"
                ? "green"
                : "default";
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: "Tanggal",
      dataIndex: "order_date",
      key: "order_date",
      render: (v) => (v ? new Date(v).toLocaleDateString("id-ID") : "-"),
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, r) => (
        <Space>
          <Link href={`/dashboard/orders/${r.id}`}>
            <Button size="small" icon={<EyeOutlined />} />
          </Link>
          {r.status === "pending" && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleConfirm(r.id)}>
                Konfirmasi
              </Button>
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleCancel(r.id)}>
                Batal
              </Button>
            </>
          )}
          {r.status === "confirmed" && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleDeliver(r.id)}>
              Kirim
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pesanan Online</h1>
        <p className="text-muted-foreground">Daftar pesanan anggota</p>
      </div>

      <Card className="border-[hsl(var(--border))]">
        <div className="mb-4">
          <Select
            placeholder="Status"
            value={status || undefined}
            onChange={(v) => setStatus(v || "")}
            options={[
              { value: "", label: "Semua" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Dikonfirmasi" },
              { value: "delivered", label: "Dikirim" },
              { value: "cancelled", label: "Dibatalkan" },
            ]}
            style={{ width: 160 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={data.orders}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total: data.total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
