"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select, InputNumber, Switch } from "antd";

export default function EditConsignmentSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/inventory/consignment/suppliers/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) form.setFieldsValue({ ...data, is_active: data.is_active !== false });
        setLoadingData(false);
      });
  }, [id, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/consignment/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Supplier berhasil diubah");
      router.push("/dashboard/inventory/consignment/suppliers");
    } catch (e: any) {
      message.error(e.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="flex items-center justify-center min-h-[200px]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ubah Supplier Konsinyasi</h1>
        <p className="text-muted-foreground">Edit data supplier</p>
      </div>
      <Card title="Data Supplier">
        <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-xl">
          <Form.Item name="code" label="Kode" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
            <Input />
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
          <Form.Item name="commission_type" label="Tipe Komisi">
            <Select options={[{ value: "percentage", label: "Persentase" }, { value: "fixed", label: "Tetap per unit" }]} />
          </Form.Item>
          <Form.Item name="commission_value" label="Nilai Komisi" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="is_active" label="Aktif" valuePropName="checked">
            <Switch />
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
