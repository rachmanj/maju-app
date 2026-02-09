"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Form, App } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("Email atau password salah");
      } else {
        message.success("Login berhasil");
        window.location.href = "/dashboard";
      }
    } catch (error) {
      message.error("Terjadi kesalahan saat login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" title={<h1 className="text-2xl font-bold mb-0">Koperasi Maju ERP</h1>}>
        <p className="text-muted-foreground mb-6">Masuk ke akun Anda</p>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email harus diisi" },
              { type: "email", message: "Format email tidak valid" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="nama@example.com"
              disabled={isLoading}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password harus diisi" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              Masuk
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
