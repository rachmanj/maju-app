"use client";

import { useEffect, useState } from "react";
import { Table, Input, Button, Badge, Space, App } from "antd";
import { SearchOutlined, EditOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

interface SupplierRow {
  id: number;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  commission_type: string;
  commission_value: number;
  is_active: boolean;
}

export function ConsignmentSuppliersTable() {
  const { message } = App.useApp();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "20", ...(search && { search }) });
      const res = await fetch(`/api/inventory/consignment/suppliers?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSuppliers(data.suppliers);
      setTotal(data.total);
    } catch {
      message.error("Gagal memuat supplier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page, search]);

  const columns: ColumnsType<SupplierRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name" },
    { title: "Kontak", dataIndex: "contact_person", key: "contact_person", render: (t) => t || "-" },
    { title: "Telepon", dataIndex: "phone", key: "phone", render: (t) => t || "-" },
    {
      title: "Komisi",
      key: "commission",
      render: (_, r) => (r.commission_type === "percentage" ? `${r.commission_value}%` : `Rp ${Number(r.commission_value).toLocaleString("id-ID")}`),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (v) => <Badge status={v ? "success" : "default"} text={v ? "Aktif" : "Nonaktif"} />,
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, row) => (
        <Link href={`/dashboard/inventory/consignment/suppliers/${row.id}/edit`}>
          <Button type="link" icon={<EditOutlined />} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Input
        placeholder="Cari supplier..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
        allowClear
      />
      <Table
        columns={columns}
        dataSource={suppliers}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `Total ${t} supplier`, onChange: setPage }}
      />
    </div>
  );
}
