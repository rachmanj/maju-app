"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Spin } from "antd";

interface MemberFormData {
  nik: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string;
}

interface Member extends MemberFormData {
  id: number;
  status: string;
  joined_date?: string;
}

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMember = async () => {
      const id = params.id as string;
      if (!id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/members/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            message.error("Anggota tidak ditemukan");
            router.push("/dashboard/members");
            return;
          }
          throw new Error("Failed to fetch member");
        }
        const member: Member = await response.json();
        form.setFieldsValue({
          nik: member.nik,
          name: member.name,
          email: member.email || "",
          phone: member.phone || "",
          address: member.address || "",
          job_title: member.job_title || "",
        });
      } catch (error: any) {
        message.error(error.message || "Gagal memuat data anggota");
        router.push("/dashboard/members");
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [params.id, form, message, router]);

  const onSubmit = async (values: MemberFormData) => {
    const id = params.id as string;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
          job_title: values.job_title || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mengubah anggota");
      }

      message.success("Anggota berhasil diperbarui");
      router.push(`/dashboard/members/${id}`);
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ubah Anggota</h1>
        <p className="text-muted-foreground">Perbarui data anggota koperasi</p>
      </div>

      <Card title="Data Anggota">
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          className="space-y-4"
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px] py-12">
              <Spin size="large" />
            </div>
          ) : (
          <>
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
              <Button type="primary" htmlType="submit" loading={submitting}>
                Simpan
              </Button>
              <Button onClick={() => router.back()} disabled={submitting}>
                Batal
              </Button>
            </div>
          </Form.Item>
          </>
          )}
        </Form>
      </Card>
    </div>
  );
}
