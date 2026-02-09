"use client";

import { useEffect, useState } from "react";
import { Button, Table, Input, Badge, Space, App } from "antd";
import { SearchOutlined, EditOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

interface WarehouseRow {
  id: number;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
}

export function WarehousesTable() {
  const { message } = App.useApp();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const response = await fetch(`/api/inventory/warehouses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch warehouses");
      const data = await response.json();
      setWarehouses(data.warehouses);
      setTotal(data.total);
    } catch (error: any) {
      message.error(error.message || "Gagal memuat data gudang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [page, search]);

  const columns: ColumnsType<WarehouseRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name", render: (t) => <span className="font-medium">{t}</span> },
    { title: "Alamat", dataIndex: "address", key: "address", render: (t) => t || "-" },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (v) => <Badge status={v ? "success" : "default"} text={v ? "Aktif" : "Nonaktif"} />,
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space>
          <Link href={`/dashboard/inventory/warehouses/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />}>
              Ubah
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cari gudang..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          allowClear
        />
      </div>
      <Table
        columns={columns}
        dataSource={warehouses}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} gudang`,
          onChange: (p) => setPage(p),
        }}
      />
    </div>
  );
}
