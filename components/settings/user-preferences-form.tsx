"use client";

import { useEffect, useState } from "react";
import { Form, Select, Button, App, Card } from "antd";
import { useSession } from "next-auth/react";
import { useAntdTheme } from "@/components/providers/use-antd-theme";

export function UserPreferencesForm() {
  const { data: session } = useSession();
  const { message } = App.useApp();
  const { isDark, toggleTheme } = useAntdTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/settings/user-preferences");
        if (res.ok) {
          const data = await res.json();
          form.setFieldsValue({
            theme: data.theme ?? (isDark ? "dark" : "light"),
            language: data.language ?? "id",
          });
        }
      } catch {
        message.error("Gagal memuat preferensi");
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [session?.user?.id, form, message]);

  const onSubmit = async (values: { theme: string; language: string }) => {
    if (!session?.user?.id) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/settings/user-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: values.theme,
          language: values.language,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }

      if (values.theme === "dark" && !isDark) {
        toggleTheme();
      } else if (values.theme === "light" && isDark) {
        toggleTheme();
      }
      localStorage.setItem("theme", values.theme);

      message.success("Preferensi berhasil disimpan");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Preferensi Pengguna">
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        className="max-w-md"
        disabled={loading}
      >
        <Form.Item
          label="Tema"
          name="theme"
          rules={[{ required: true, message: "Pilih tema" }]}
        >
          <Select
            options={[
              { label: "Terang", value: "light" },
              { label: "Gelap", value: "dark" },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Bahasa"
          name="language"
          rules={[{ required: true, message: "Pilih bahasa" }]}
        >
          <Select
            options={[
              { label: "Indonesia", value: "id" },
              { label: "English", value: "en" },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Simpan
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
