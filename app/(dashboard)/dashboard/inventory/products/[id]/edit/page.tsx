"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select, InputNumber, Switch } from "antd";

interface ProductFormData {
  code: string;
  name: string;
  barcode?: string;
  category_id?: number;
  base_unit_id: number;
  description?: string;
  min_stock?: number;
  is_active: boolean;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [categories, setCategories] = useState<{ id: number; code: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    Promise.all([
      fetch(`/api/inventory/products/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/inventory/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/inventory/units").then((r) => (r.ok ? r.json() : [])),
    ]).then(([product, cats, u]) => {
      setCategories(cats);
      setUnits(u);
      if (product) {
        form.setFieldsValue({
          code: product.code,
          name: product.name,
          barcode: product.barcode,
          category_id: product.category_id,
          base_unit_id: product.base_unit_id,
          description: product.description,
          min_stock: product.min_stock ?? 0,
          is_active: product.is_active !== false,
        });
      }
      setLoadingData(false);
    });
  }, [params.id, form]);

  const onSubmit = async (values: ProductFormData) => {
    const id = params.id as string;
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventory/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          category_id: values.category_id || undefined,
          min_stock: values.min_stock ?? 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mengubah produk");
      }

      message.success("Produk berhasil diubah");
      router.push(`/dashboard/inventory/products/${id}`);
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) {
    return <div className="flex items-center justify-center min-h-[200px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ubah Produk</h1>
        <p className="text-muted-foreground">Edit data produk</p>
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

          <Form.Item label="Aktif" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch />
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
