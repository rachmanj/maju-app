"use client";

import { useEffect, useState } from "react";
import { Form, Input, Button, App, Spin } from "antd";
interface CooperativeConfig {
  id?: number;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

export function CooperativeConfigForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/settings/cooperative-config");
        if (res.ok) {
          const data: CooperativeConfig = await res.json();
          form.setFieldsValue({
            name: data.name ?? "",
            address: data.address ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            logo_url: data.logo_url ?? "",
          });
        }
      } catch {
        message.error("Gagal memuat konfigurasi koperasi");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form, message]);

  const onSubmit = async (values: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo_url: string;
  }) => {
    try {
      setSubmitting(true);
      const response = await fetch("/api/settings/cooperative-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name || undefined,
          address: values.address || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          logo_url: values.logo_url || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal menyimpan konfigurasi");
      }

      message.success("Konfigurasi koperasi berhasil disimpan");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      className="max-w-xl space-y-4"
    >
      <Form.Item label="Nama Koperasi" name="name">
        <Input placeholder="Koperasi Maju" />
      </Form.Item>

      <Form.Item label="Alamat" name="address">
        <Input.TextArea rows={3} placeholder="Alamat lengkap koperasi" />
      </Form.Item>

      <Form.Item label="Telepon" name="phone">
        <Input placeholder="08xxxxxxxxxx" />
      </Form.Item>

      <Form.Item
        label="Email"
        name="email"
        rules={[{ type: "email", message: "Format email tidak valid" }]}
      >
        <Input type="email" placeholder="info@koperasimaju.com" />
      </Form.Item>

      <Form.Item label="URL Logo" name="logo_url">
        <Input placeholder="https://example.com/logo.png" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Simpan
        </Button>
      </Form.Item>
    </Form>
  );
}
