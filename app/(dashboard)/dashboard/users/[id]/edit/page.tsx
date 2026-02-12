"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Form, Input, Button, Card, App, Checkbox, Select, Spin } from "antd";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

interface Role {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  is_active: boolean | null;
  user_roles: { role_id: number }[];
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session) {
      const userRoles = (session.user as { roles?: string[] })?.roles ?? [];
      if (!hasPermission(userRoles, PERMISSIONS.ADMIN_USERS)) {
        router.push("/dashboard");
        return;
      }
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/roles");
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
        }
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const id = params.id as string;
      if (!id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            message.error("Pengguna tidak ditemukan");
            router.push("/dashboard/users");
            return;
          }
          throw new Error("Failed to fetch user");
        }
        const user: User = await response.json();
        form.setFieldsValue({
          email: user.email,
          name: user.name,
          phone: user.phone || "",
          is_active: user.is_active ?? true,
          role_ids: user.user_roles?.map((ur) => ur.role_id) ?? [],
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memuat data pengguna";
        message.error(msg);
        router.push("/dashboard/users");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params.id, form, message, router]);

  const onSubmit = async (values: {
    email: string;
    password?: string;
    name: string;
    phone?: string;
    is_active: boolean;
    role_ids: number[];
  }) => {
    const id = params.id as string;
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        email: values.email,
        name: values.name,
        phone: values.phone || undefined,
        is_active: values.is_active,
        role_ids: values.role_ids,
      };
      if (values.password) body.password = values.password;

      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal memperbarui pengguna");
      }

      message.success("Pengguna berhasil diperbarui");
      router.push("/dashboard/users");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || !session) {
    return <div className="p-6">Memuat...</div>;
  }

  const userRoles = (session.user as { roles?: string[] })?.roles ?? [];
  if (!hasPermission(userRoles, PERMISSIONS.ADMIN_USERS)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ubah Pengguna</h1>
        <p className="text-muted-foreground">Perbarui data pengguna dan role</p>
      </div>

      <Card title="Data Pengguna">
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
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: "Email wajib diisi" },
                    { type: "email", message: "Format email tidak valid" },
                  ]}
                >
                  <Input type="email" placeholder="nama@example.com" />
                </Form.Item>

                <Form.Item
                  label="Password (kosongkan jika tidak diubah)"
                  name="password"
                >
                  <Input.Password placeholder="••••••••" />
                </Form.Item>

                <Form.Item
                  label="Nama Lengkap"
                  name="name"
                  rules={[{ required: true, message: "Nama wajib diisi" }]}
                >
                  <Input placeholder="Nama pengguna" />
                </Form.Item>

                <Form.Item label="Telepon" name="phone">
                  <Input placeholder="08xxxxxxxxxx" />
                </Form.Item>
              </div>

              <Form.Item
                label="Role"
                name="role_ids"
                rules={[{ required: true, message: "Minimal satu role harus dipilih" }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Pilih role"
                  loading={rolesLoading}
                  options={roles.map((r) => ({
                    label: `${r.name} (${r.code})`,
                    value: r.id,
                  }))}
                />
              </Form.Item>

              <Form.Item name="is_active" valuePropName="checked">
                <Checkbox>Akun aktif</Checkbox>
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
