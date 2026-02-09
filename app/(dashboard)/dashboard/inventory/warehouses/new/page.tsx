"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App } from "antd";

export default function NewWarehousePage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: { code: string; name: string; address?: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inventory/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal membuat gudang");
      }

      message.success("Gudang berhasil dibuat");
      router.push("/dashboard/inventory/warehouses");
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tambah Gudang Baru</h1>
        <p className="text-muted-foreground">Daftarkan gudang baru</p>
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
