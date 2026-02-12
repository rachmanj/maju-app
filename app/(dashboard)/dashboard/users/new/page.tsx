"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Form, Input, Button, Card, App, Checkbox, Select } from "antd";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

interface Role {
  id: number;
  code: string;
  name: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session) {
      const roles = (session.user as { roles?: string[] })?.roles ?? [];
      if (!hasPermission(roles, PERMISSIONS.ADMIN_USERS)) {
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

  const onSubmit = async (values: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    is_active: boolean;
    role_ids: number[];
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: values.phone || undefined,
          is_active: values.is_active ?? true,
          role_ids: values.role_ids,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal membuat pengguna");
      }

      message.success("Pengguna berhasil dibuat");
      router.push("/dashboard/users");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    } finally {
      setIsLoading(false);
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
        <h1 className="text-3xl font-bold">Tambah Pengguna Baru</h1>
        <p className="text-muted-foreground">Buat akun pengguna baru untuk sistem</p>
      </div>

      <Card title="Data Pengguna">
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          className="space-y-4"
        >
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
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Password wajib diisi" },
                { min: 6, message: "Password minimal 6 karakter" },
              ]}
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
              options={roles.map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))}
            />
          </Form.Item>

          <Form.Item name="is_active" valuePropName="checked" initialValue={true}>
            <Checkbox>Akun aktif</Checkbox>
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
