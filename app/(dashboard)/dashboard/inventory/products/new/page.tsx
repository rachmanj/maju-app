"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select, InputNumber } from "antd";

interface ProductFormData {
  code: string;
  name: string;
  barcode?: string;
  category_id?: number;
  base_unit_id: number;
  description?: string;
  min_stock?: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; code: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/categories").then((r) => r.ok ? r.json() : []),
      fetch("/api/inventory/units").then((r) => r.ok ? r.json() : []),
    ]).then(([cats, u]) => {
      setCategories(cats);
      setUnits(u);
    });
  }, []);

  const onSubmit = async (values: ProductFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          category_id: values.category_id || undefined,
          min_stock: values.min_stock ?? 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal membuat produk");
      }

      message.success("Produk berhasil dibuat");
      router.push("/dashboard/inventory/products");
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tambah Produk Baru</h1>
        <p className="text-muted-foreground">Daftarkan produk ke katalog</p>
      </div>

      <Card title="Data Produk">
        <Form form={form} layout="vertical" onFinish={onSubmit} className="max-w-2xl">
          <Form.Item
            label="Kode"
            name="code"
            rules={[{ required: true, message: "Kode harus diisi" }]}
          >
            <Input placeholder="Kode unik produk" />
          </Form.Item>

          <Form.Item
            label="Nama"
            name="name"
            rules={[{ required: true, message: "Nama harus diisi" }]}
          >
            <Input placeholder="Nama produk" />
          </Form.Item>

          <Form.Item label="Barcode" name="barcode">
            <Input placeholder="Opsional" />
          </Form.Item>

          <Form.Item label="Kategori" name="category_id">
            <Select
              allowClear
              placeholder="Pilih kategori"
              options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
            />
          </Form.Item>

          <Form.Item
            label="Satuan dasar"
            name="base_unit_id"
            rules={[{ required: true, message: "Satuan harus dipilih" }]}
          >
            <Select
              placeholder="Pilih satuan"
              options={units.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))}
            />
          </Form.Item>

          <Form.Item label="Min. stok" name="min_stock" initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          <Form.Item label="Deskripsi" name="description">
            <Input.TextArea rows={2} placeholder="Opsional" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Simpan
            </Button>
            <Button className="ml-2" onClick={() => router.back()}>
              Batal
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
