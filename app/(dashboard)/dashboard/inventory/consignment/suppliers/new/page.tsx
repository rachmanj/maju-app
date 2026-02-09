"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select, InputNumber } from "antd";

export default function NewConsignmentSupplierPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/consignment/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Supplier berhasil dibuat");
      router.push("/dashboard/inventory/consignment/suppliers");
    } catch (e: any) {
      message.error(e.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tambah Supplier Konsinyasi</h1>
        <p className="text-muted-foreground">Data supplier baru</p>
      </div>
      <Card title="Data Supplier">
        <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-xl">
          <Form.Item name="code" label="Kode" rules={[{ required: true }]}>
            <Input placeholder="Kode unik" />
          </Form.Item>
          <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
            <Input placeholder="Nama supplier" />
          </Form.Item>
          <Form.Item name="contact_person" label="Kontak">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telepon">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Alamat">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="commission_type" label="Tipe Komisi" initialValue="percentage">
            <Select options={[{ value: "percentage", label: "Persentase" }, { value: "fixed", label: "Tetap per unit" }]} />
          </Form.Item>
          <Form.Item name="commission_value" label="Nilai Komisi" rules={[{ required: true }]} initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>Simpan</Button>
            <Button className="ml-2" onClick={() => router.back()}>Batal</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
