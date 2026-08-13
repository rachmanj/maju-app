"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Select, Table, Button, App, Modal, Form, InputNumber, DatePicker, Input, Switch } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface StockRow {
  product_id: number;
  product_code: string;
  product_name: string;
  unit_code: string;
  quantity: number;
  min_stock: number;
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
}

export default function InventoryStockPage() {
  const { message } = App.useApp();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<{ id: number; code: string; name: string }[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState(false);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<{ id: number; code: string; name: string; base_unit_id: number }[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/inventory/warehouses?all=true")
      .then((r) => (r.ok ? r.json() : []))
      .then(setWarehouses);
    fetch("/api/inventory/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories);
  }, []);

  const buildStockParams = useCallback(() => {
    const params = new URLSearchParams({
      warehouse_id: String(selectedWarehouseId),
    });
    if (search.trim()) params.set("search", search.trim());
    if (categoryId != null) params.set("category_id", String(categoryId));
    if (lowStock) params.set("low_stock", "true");
    return params;
  }, [selectedWarehouseId, search, categoryId, lowStock]);

  const fetchStock = useCallback(async () => {
    if (!selectedWarehouseId) {
      setStock([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/inventory/stock?${buildStockParams()}`);
      setStock(r.ok ? await r.json() : []);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId, buildStockParams]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    if (!movementModalOpen) return;
    Promise.all([
      fetch("/api/inventory/products?limit=1000").then((r) => r.ok ? r.json() : { products: [] }),
      fetch("/api/inventory/units").then((r) => r.ok ? r.json() : []),
    ]).then(([data, u]) => {
      setProducts(data.products || []);
      setUnits(u || []);
    });
    movementForm.setFieldsValue({
      movement_type: "in",
      quantity: 1,
    });
  }, [movementModalOpen, movementForm]);

  const onRecordMovement = async (values: {
    movement_type: string;
    warehouse_id: number;
    product_id: number;
    unit_id: number;
    quantity: number;
    to_warehouse_id?: number;
    notes?: string;
    movement_date: Date;
  }) => {
    setSubmitting(true);
    try {
      const body: any = {
        movement_type: values.movement_type,
        warehouse_id: values.warehouse_id,
        product_id: values.product_id,
        unit_id: values.unit_id,
        quantity: values.quantity,
        notes: values.notes,
        movement_date:
          values.movement_date && typeof values.movement_date === "object" && "format" in values.movement_date
            ? (values.movement_date as { format: (s: string) => string }).format("YYYY-MM-DD")
            : values.movement_date
              ? format(values.movement_date instanceof Date ? values.movement_date : new Date(String(values.movement_date)), "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd"),
      };
      if (values.movement_type === "transfer" && values.to_warehouse_id) {
        body.to_warehouse_id = values.to_warehouse_id;
      }
      const response = await fetch("/api/inventory/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mencatat mutasi");
      }

      message.success("Mutasi stok berhasil dicatat");
      setMovementModalOpen(false);
      movementForm.resetFields();
      if (selectedWarehouseId) {
        await fetchStock();
      }
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<StockRow> = [
    { title: "Kode", dataIndex: "product_code", key: "product_code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "product_name", key: "product_name" },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code" },
    {
      title: "Jumlah",
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      render: (qty, row) => {
        const q = Number(qty);
        const min = Number(row.min_stock) || 0;
        const isLow = min > 0 && q < min;
        return <span className={isLow ? "text-red-600 font-medium" : ""}>{q}</span>;
      },
    },
    {
      title: "Min. stok",
      dataIndex: "min_stock",
      key: "min_stock",
      align: "right",
      render: (v) => Number(v) || 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stok</h1>
          <p className="text-muted-foreground">Stok per gudang dan mutasi</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setMovementModalOpen(true)}
          disabled={!selectedWarehouseId}
        >
          Catat Mutasi
        </Button>
      </div>

      <Card title="Stok per Gudang">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Gudang:</span>
          <Select
            placeholder="Pilih gudang"
            allowClear
            className="min-w-[240px]"
            value={selectedWarehouseId}
            onChange={setSelectedWarehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
          />
          <Input
            placeholder="Cari produk (nama/kode)..."
            allowClear
            className="min-w-[240px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Kategori"
            allowClear
            className="min-w-[200px]"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            Stok menipis
            <Switch checked={lowStock} onChange={setLowStock} />
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={stock}
          rowKey="product_id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: selectedWarehouseId ? "Tidak ada stok" : "Pilih gudang untuk melihat stok" }}
        />
      </Card>

      <Modal
        title="Catat Mutasi Stok"
        open={movementModalOpen}
        onCancel={() => setMovementModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form
          form={movementForm}
          layout="vertical"
          onFinish={(values) =>
            onRecordMovement({
              ...values,
              warehouse_id: selectedWarehouseId!,
            })
          }
          initialValues={{ movement_type: "in", quantity: 1 }}
        >
          <Form.Item name="movement_type" label="Jenis" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "in", label: "Masuk" },
                { value: "out", label: "Keluar" },
                { value: "transfer", label: "Transfer" },
                { value: "adjustment", label: "Penyesuaian" },
              ]}
            />
          </Form.Item>

          <Form.Item name="product_id" label="Produk" rules={[{ required: true, message: "Pilih produk" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Pilih produk"
              options={products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
              onChange={(_, opt: any) => {
                const p = products.find((x) => x.id === opt?.value);
                if (p) movementForm.setFieldsValue({ unit_id: p.base_unit_id });
              }}
            />
          </Form.Item>

          <Form.Item name="unit_id" label="Satuan" rules={[{ required: true }]}>
            <Select
              placeholder="Pilih satuan"
              options={units.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))}
            />
          </Form.Item>

          <Form.Item name="quantity" label="Jumlah" rules={[{ required: true, message: "Jumlah harus diisi" }]}>
            <InputNumber min={0.001} className="w-full" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.movement_type !== curr.movement_type}
          >
            {({ getFieldValue }) =>
              getFieldValue("movement_type") === "transfer" ? (
                <Form.Item name="to_warehouse_id" label="Gudang Tujuan" rules={[{ required: true }]}>
                  <Select
                    placeholder="Pilih gudang tujuan"
                    options={warehouses
                      .filter((w) => w.id !== selectedWarehouseId)
                      .map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="movement_date" label="Tanggal">
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="notes" label="Keterangan">
            <Input.TextArea rows={2} placeholder="Opsional" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" loading={submitting}>
              Simpan
            </Button>
            <Button className="ml-2" onClick={() => setMovementModalOpen(false)}>
              Batal
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
