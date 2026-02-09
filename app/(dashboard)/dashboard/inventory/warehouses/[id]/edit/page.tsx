"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Switch } from "antd";

interface WarehouseFormData {
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
}

export default function EditWarehousePage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    fetch(`/api/inventory/warehouses/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          form.setFieldsValue({
            code: data.code,
            name: data.name,
            address: data.address,
            is_active: data.is_active !== false,
          });
        }
        setLoadingData(false);
      });
  }, [params.id, form]);

  const onSubmit = async (values: WarehouseFormData) => {
    const id = params.id as string;
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventory/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mengubah gudang");
      }

      message.success("Gudang berhasil diubah");
      router.push("/dashboard/inventory/warehouses");
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
        <h1 className="text-3xl font-bold">Ubah Gudang</h1>
        <p className="text-muted-foreground">Edit data gudang</p>
      </div>

      <Card title="Data Gudang">
        <Form form={form} layout="vertical" onFinish={onSubmit} className="max-w-xl">
          <Form.Item
            label="Kode"
            name="code"
            rules={[{ required: true, message: "Kode harus diisi" }]}
          >
            <Input placeholder="Kode unik gudang" />
          </Form.Item>

          <Form.Item
            label="Nama"
            name="name"
            rules={[{ required: true, message: "Nama harus diisi" }]}
          >
            <Input placeholder="Nama gudang" />
          </Form.Item>

          <Form.Item label="Alamat" name="address">
            <Input.TextArea rows={2} placeholder="Opsional" />
          </Form.Item>

          <Form.Item label="Aktif" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch />
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
