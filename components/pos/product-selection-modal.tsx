"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, Input, Select, Table, InputNumber, Button, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

export type ProductItem = {
  id: number;
  code: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  unit_price: number;
  unit_id: number;
  unit_code: string;
  category_name?: string;
};

interface ProductSelectionModalProps {
  open: boolean;
  onClose: () => void;
  warehouseId: number | null;
  onAddItem: (
    product: ProductItem,
    quantity: number,
    unitId: number,
    unitCode: string
  ) => void;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

export function ProductSelectionModal({
  open,
  onClose,
  warehouseId,
  onAddItem,
}: ProductSelectionModalProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<{ id: number; code: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [qtyModal, setQtyModal] = useState<{
    visible: boolean;
    product: ProductItem | null;
    qty: number;
  }>({ visible: false, product: null, qty: 1 });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/pos-public/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch {
      message.error("Gagal memuat kategori");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("warehouse_id", String(warehouseId));
      if (search.trim()) params.set("q", search.trim());
      if (categoryId != null) params.set("category_id", String(categoryId));
      params.set("limit", "50");
      const res = await fetch(`/api/pos-public/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch {
      message.error("Gagal memuat produk");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, search, categoryId]);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, fetchCategories]);

  useEffect(() => {
    if (open && warehouseId) {
      const t = setTimeout(fetchProducts, 300);
      return () => clearTimeout(t);
    } else {
      setProducts([]);
    }
  }, [open, warehouseId, fetchProducts]);

  const handleRowClick = (product: ProductItem) => {
    setQtyModal({ visible: true, product, qty: 1 });
  };

  const handleConfirmAdd = () => {
    if (qtyModal.product && qtyModal.qty > 0) {
      if (qtyModal.qty > qtyModal.product.quantity) {
        message.warning(`Stok tersedia: ${qtyModal.product.quantity}`);
        return;
      }
      onAddItem(
        qtyModal.product,
        qtyModal.qty,
        qtyModal.product.unit_id,
        qtyModal.product.unit_code
      );
      setQtyModal({ visible: false, product: null, qty: 1 });
      message.success("Ditambahkan ke keranjang");
    }
  };

  const columns: ColumnsType<ProductItem> = [
    { title: "Kode", dataIndex: "code", key: "code", width: 100, render: (v) => <span className="font-mono">{v}</span> },
    { title: "Nama", dataIndex: "name", key: "name" },
    { title: "Kategori", dataIndex: "category_name", key: "category", render: (v) => v || "-" },
    { title: "Stok", dataIndex: "quantity", key: "quantity", width: 80, align: "right" },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      width: 120,
      align: "right",
      render: (v) => formatCurrency(Number(v)),
    },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code", width: 80 },
  ];

  return (
    <>
      <Modal
        title="Pilih Produk"
        open={open}
        onCancel={onClose}
        footer={null}
        width={720}
        destroyOnClose
      >
        {!warehouseId ? (
          <p className="text-muted-foreground">Pilih gudang terlebih dahulu.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Cari nama, kode, barcode..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => fetchProducts()}
                style={{ width: 240 }}
                allowClear
              />
              <Select
                placeholder="Semua kategori"
                allowClear
                value={categoryId}
                onChange={setCategoryId}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                style={{ minWidth: 160 }}
              />
              <Button type="primary" onClick={fetchProducts} loading={loading}>
                Cari
              </Button>
            </div>
            <Table
              dataSource={products}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, size: "small" }}
              size="small"
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: "pointer" },
              })}
            />
          </div>
        )}
      </Modal>

      <Modal
        title={`Tambah: ${qtyModal.product?.name ?? ""}`}
        open={qtyModal.visible}
        onOk={handleConfirmAdd}
        onCancel={() => setQtyModal({ visible: false, product: null, qty: 1 })}
        okText="Tambah ke Keranjang"
      >
        {qtyModal.product && (
          <div className="space-y-4">
            <p>
              Stok tersedia: <strong>{qtyModal.product.quantity}</strong> {qtyModal.product.unit_code}
            </p>
            <p>
              Harga: <strong>{formatCurrency(qtyModal.product.unit_price)}</strong> / {qtyModal.product.unit_code}
            </p>
            <div>
              <label className="block mb-2">Jumlah</label>
              <InputNumber
                min={1}
                max={qtyModal.product.quantity}
                value={qtyModal.qty}
                onChange={(v) => setQtyModal((prev) => ({ ...prev, qty: v ?? 1 }))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
