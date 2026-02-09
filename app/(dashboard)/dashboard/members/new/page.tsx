"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App } from "antd";

interface MemberFormData {
  nik: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string;
  project_id?: number;
}

export default function NewMemberPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: MemberFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal membuat anggota");
      }

      message.success("Anggota berhasil dibuat");
      router.push("/dashboard/members");
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tambah Anggota Baru</h1>
        <p className="text-muted-foreground">Registrasi anggota baru ke koperasi</p>
      </div>

      <Card title="Data Anggota">
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item
              label="NIK"
              name="nik"
              rules={[
                { required: true, message: "NIK harus diisi" },
                { len: 16, message: "NIK harus 16 digit" },
              ]}
            >
              <Input placeholder="16 digit NIK" maxLength={16} />
            </Form.Item>

            <Form.Item
              label="Nama Lengkap"
              name="name"
              rules={[{ required: true, message: "Nama lengkap harus diisi" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { type: "email", message: "Format email tidak valid" },
              ]}
            >
              <Input type="email" placeholder="nama@example.com" />
            </Form.Item>

            <Form.Item label="Telepon" name="phone">
              <Input />
            </Form.Item>

            <Form.Item label="Jabatan" name="job_title">
              <Input />
            </Form.Item>
          </div>

          <Form.Item label="Alamat" name="address">
            <Input.TextArea rows={3} placeholder="Alamat lengkap" />
          </Form.Item>

          <Form.Item>
            <div className="flex gap-4">
              <Button type="primary" htmlType="submit" loading={isLoading}>
                Simpan
              </Button>
              <Button onClick={() => router.back()} disabled={isLoading}>
                Batal
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
