"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Spin, Select, InputNumber } from "antd";

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
  purchase_limit?: number;
  order_limit?: number | null;
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
          member_number: member.member_number || "",
          nik: member.nik ?? "",
          name: member.name,
          email: member.email || "",
          phone: member.phone || "",
          address: member.address || "",
          job_title: member.job_title || "",
          project_id: (member as { project_id?: number }).project_id || undefined,
          department_id: (member as { department_id?: number }).department_id || undefined,
          purchase_limit: (member as { purchase_limit?: number }).purchase_limit ?? undefined,
          order_limit: (member as { order_limit?: number | null }).order_limit ?? undefined,
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
          member_number: values.member_number?.trim(),
          nik: values.nik?.trim() || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
          job_title: values.job_title || undefined,
          project_id: values.project_id || undefined,
          department_id: values.department_id || undefined,
          purchase_limit: values.purchase_limit ?? undefined,
          order_limit: values.order_limit != null ? values.order_limit : null,
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
            <Form.Item
              label="Batas Belanja (POS)"
              name="purchase_limit"
              tooltip="Limit pembelanjaan untuk Potong Gaji di kasir POS. Kosongkan atau 0 = tidak ada limit."
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="Rp 0"
                formatter={(v) =>
                  v != null && !Number.isNaN(Number(v))
                    ? `Rp ${Number(v).toLocaleString("id-ID")}`
                    : ""
                }
                parser={((v: string | undefined) => (v ? Number(v.replace(/[^\d]/g, "")) : 0)) as any}
              />
            </Form.Item>
            <Form.Item
              label="Batas Pemesanan"
              name="order_limit"
              tooltip="Limit nilai pesanan di Portal Anggota (menu Pemesanan). Kosongkan = tidak ada batas."
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="Tidak ada batas"
                formatter={(v) =>
                  v != null && !Number.isNaN(Number(v))
                    ? `Rp ${Number(v).toLocaleString("id-ID")}`
                    : ""
                }
                parser={((v: string | undefined) => (v ? Number(v.replace(/[^\d]/g, "")) : undefined)) as any}
              />
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
