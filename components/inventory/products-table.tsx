"use client";

import { useEffect, useState } from "react";
import { Button, Table, Input, Badge, Space, App } from "antd";
import { SearchOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

interface ProductRow {
  id: number;
  code: string;
  name: string;
  barcode?: string;
  category_name?: string;
  base_unit_code?: string;
  min_stock: number;
  is_active: boolean;
}

export function ProductsTable() {
  const { message } = App.useApp();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const response = await fetch(`/api/inventory/products?${params}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data.products);
      setTotal(data.total);
    } catch (error: any) {
      message.error(error.message || "Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const columns: ColumnsType<ProductRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name", render: (t) => <span className="font-medium">{t}</span> },
    { title: "Barcode", dataIndex: "barcode", key: "barcode", render: (t) => t || "-" },
    { title: "Kategori", dataIndex: "category_name", key: "category_name", render: (t) => t || "-" },
    { title: "Satuan", dataIndex: "base_unit_code", key: "base_unit_code", render: (t) => t || "-" },
    {
      title: "Min. Stok",
      dataIndex: "min_stock",
      key: "min_stock",
      align: "right",
      render: (v) => Number(v) || 0,
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
      align: "right",
      render: (_, record) => (
        <Space>
          <Link href={`/dashboard/inventory/products/${record.id}`}>
            <Button type="link" icon={<EyeOutlined />} />
          </Link>
          <Link href={`/dashboard/inventory/products/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />} />
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cari produk (kode, nama, barcode)..."
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
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} produk`,
          onChange: (p) => setPage(p),
        }}
      />
    </div>
  );
}
