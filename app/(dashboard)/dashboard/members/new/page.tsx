"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select } from "antd";

interface MemberFormData {
  member_number: string;
  nik?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string;
  project_id?: number;
  department_id?: number;
}

interface ProjectOption {
  id: number;
  code: string;
  name: string;
}

interface DepartmentOption {
  id: number;
  code: string;
  name: string;
}

export default function NewMemberPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/departments").then((r) => (r.ok ? r.json() : [])),
    ]).then(([p, d]) => {
      setProjects(Array.isArray(p) ? p : []);
      setDepartments(Array.isArray(d) ? d : []);
    });
  }, []);

  const onSubmit = async (values: MemberFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          member_number: values.member_number?.trim(),
          nik: values.nik?.trim() || undefined,
          email: values.email || undefined,
          project_id: values.project_id || undefined,
          department_id: values.department_id || undefined,
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
              label="Nomor Anggota"
              name="member_number"
              rules={[{ required: true, message: "Nomor anggota wajib diisi" }]}
            >
              <Input placeholder="Unik, wajib" />
            </Form.Item>
            <Form.Item
              label="NIK"
              name="nik"
            >
              <Input placeholder="Opsional, unik jika diisi" />
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
            <Form.Item label="Proyek" name="project_id">
              <Select
                allowClear
                placeholder="Pilih proyek"
                options={projects.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
              />
            </Form.Item>
            <Form.Item label="Departemen" name="department_id">
              <Select
                allowClear
                placeholder="Pilih departemen"
                options={departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` }))}
              />
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
