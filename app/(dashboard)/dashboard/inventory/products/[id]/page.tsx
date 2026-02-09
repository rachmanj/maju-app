"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Descriptions, Button, Spin, App, Badge, Table, Form, Select, InputNumber, Popconfirm, DatePicker } from "antd";
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { format } from "date-fns";

interface Product {
  id: number;
  code: string;
  name: string;
  barcode?: string;
  category_name?: string;
  base_unit_code?: string;
  base_unit_name?: string;
  description?: string;
  min_stock: number;
  is_active: boolean;
}

interface ConversionRow {
  id: number;
  from_unit_code: string;
  to_unit_code: string;
  conversion_factor: number;
}

interface PriceRow {
  id: number;
  warehouse_code?: string;
  unit_code: string;
  price: number;
  effective_date: string;
  expiry_date?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [convForm] = Form.useForm();
  const [priceForm] = Form.useForm();
  const [addingConv, setAddingConv] = useState(false);
  const [addingPrice, setAddingPrice] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/inventory/products/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            message.error("Produk tidak ditemukan");
            router.push("/dashboard/inventory/products");
            return;
          }
          throw new Error("Failed to fetch product");
        }
        const data = await response.json();
        setProduct(data);
      } catch (error: any) {
        message.error(error.message || "Gagal memuat data produk");
        router.push("/dashboard/inventory/products");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, message, router]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/inventory/products/${id}/conversions`).then((r) => (r.ok ? r.json() : [])).then(setConversions);
    fetch(`/api/inventory/products/${id}/prices`).then((r) => (r.ok ? r.json() : [])).then(setPrices);
    fetch("/api/inventory/units").then((r) => (r.ok ? r.json() : [])).then(setUnits);
    fetch("/api/inventory/warehouses?all=true").then((r) => (r.ok ? r.json() : [])).then(setWarehouses);
  }, [id]);

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/dashboard/inventory/products")}
          >
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">
              Detail produk • Kode {product.code}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/inventory/products/${product.id}/edit`}>
          <Button type="primary" icon={<EditOutlined />}>
            Ubah
          </Button>
        </Link>
      </div>

      <Card title="Data Produk">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Kode">
            <span className="font-mono">{product.code}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Nama">{product.name}</Descriptions.Item>
          <Descriptions.Item label="Barcode">{product.barcode || "-"}</Descriptions.Item>
          <Descriptions.Item label="Kategori">{product.category_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Satuan">
            {product.base_unit_code ? `${product.base_unit_code} (${product.base_unit_name || ""})` : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Min. stok">{Number(product.min_stock) || 0}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Badge status={product.is_active ? "success" : "default"} text={product.is_active ? "Aktif" : "Nonaktif"} />
          </Descriptions.Item>
          <Descriptions.Item label="Deskripsi" span={2}>
            {product.description || "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Konversi Satuan"
        extra={
          <Form
            form={convForm}
            layout="inline"
            onFinish={async (v) => {
              setAddingConv(true);
              try {
                const r = await fetch(`/api/inventory/products/${id}/conversions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(v),
                });
                if (!r.ok) throw new Error((await r.json()).error);
                message.success("Konversi ditambah");
                convForm.resetFields();
                const list = await fetch(`/api/inventory/products/${id}/conversions`).then((res) => (res.ok ? res.json() : []));
                setConversions(list);
              } catch (e: any) {
                message.error(e.message || "Gagal menambah konversi");
              } finally {
                setAddingConv(false);
              }
            }}
          >
            <Form.Item name="from_unit_id" rules={[{ required: true }]}>
              <Select placeholder="Dari" options={units.map((u) => ({ value: u.id, label: u.code }))} className="w-24" />
            </Form.Item>
            <Form.Item name="to_unit_id" rules={[{ required: true }]}>
              <Select placeholder="Ke" options={units.map((u) => ({ value: u.id, label: u.code }))} className="w-24" />
            </Form.Item>
            <Form.Item name="conversion_factor" rules={[{ required: true }]} initialValue={1}>
              <InputNumber min={0.000001} step={0.1} placeholder="Faktor" className="w-24" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={addingConv} icon={<PlusOutlined />}>
                Tambah
              </Button>
            </Form.Item>
          </Form>
        }
      >
        <Table
          dataSource={conversions}
          rowKey="id"
          size="small"
          columns={[
            { title: "Dari", dataIndex: "from_unit_code", key: "from_unit_code" },
            { title: "Ke", dataIndex: "to_unit_code", key: "to_unit_code" },
            { title: "Faktor", dataIndex: "conversion_factor", key: "conversion_factor", align: "right" },
            {
              title: "",
              key: "action",
              width: 80,
              render: (_, row) => (
                <Popconfirm title="Hapus konversi?" onConfirm={async () => {
                  await fetch(`/api/inventory/products/${id}/conversions/${row.id}`, { method: "DELETE" });
                  setConversions((prev) => prev.filter((c) => c.id !== row.id));
                  message.success("Konversi dihapus");
                }}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
          pagination={false}
          locale={{ emptyText: "Belum ada konversi satuan" }}
        />
      </Card>

      <Card
        title="Harga"
        extra={
          <Form
            form={priceForm}
            layout="inline"
            onFinish={async (v) => {
              setAddingPrice(true);
              try {
                const r = await fetch(`/api/inventory/products/${id}/prices`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    unit_id: v.unit_id,
                    warehouse_id: v.warehouse_id,
                    price: v.price,
                    effective_date: v.effective_date
                      ? (typeof v.effective_date === "object" && v.effective_date && "format" in v.effective_date
                        ? (v.effective_date as { format: (s: string) => string }).format("YYYY-MM-DD")
                        : format(new Date(v.effective_date as string), "yyyy-MM-dd"))
                      : format(new Date(), "yyyy-MM-dd"),
                  }),
                });
                if (!r.ok) throw new Error((await r.json()).error);
                message.success("Harga ditambah");
                priceForm.resetFields();
                const list = await fetch(`/api/inventory/products/${id}/prices`).then((res) => (res.ok ? res.json() : []));
                setPrices(list);
              } catch (e: any) {
                message.error(e.message || "Gagal menambah harga");
              } finally {
                setAddingPrice(false);
              }
            }}
          >
            <Form.Item name="unit_id" rules={[{ required: true }]}>
              <Select placeholder="Satuan" options={units.map((u) => ({ value: u.id, label: u.code }))} className="w-24" />
            </Form.Item>
            <Form.Item name="warehouse_id">
              <Select placeholder="Gudang (umum)" allowClear options={warehouses.map((w) => ({ value: w.id, label: w.code }))} className="w-28" />
            </Form.Item>
            <Form.Item name="price" rules={[{ required: true }]}>
              <InputNumber min={0} placeholder="Harga" className="w-28" />
            </Form.Item>
            <Form.Item name="effective_date">
              <DatePicker className="w-36" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={addingPrice} icon={<PlusOutlined />}>
                Tambah
              </Button>
            </Form.Item>
          </Form>
        }
      >
        <Table
          dataSource={prices}
          rowKey="id"
          size="small"
          columns={[
            { title: "Gudang", dataIndex: "warehouse_code", key: "warehouse_code", render: (t) => t || "Umum" },
            { title: "Satuan", dataIndex: "unit_code", key: "unit_code" },
            { title: "Harga", dataIndex: "price", key: "price", align: "right", render: (p) => Number(p).toLocaleString("id-ID") },
            { title: "Berlaku", dataIndex: "effective_date", key: "effective_date", render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
            { title: "Kadaluarsa", dataIndex: "expiry_date", key: "expiry_date", render: (d) => (d ? format(new Date(d), "dd/MM/yyyy") : "-") },
          ]}
          pagination={false}
          locale={{ emptyText: "Belum ada harga" }}
        />
      </Card>
    </div>
  );
}
