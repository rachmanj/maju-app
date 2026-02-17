"use client";

import { useEffect, useState } from "react";
import { Form, Checkbox, Button, App, Card } from "antd";
import { useSession } from "next-auth/react";

export function NotificationPreferencesForm() {
  const { data: session } = useSession();
  const { message } = App.useApp();
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
        const res = await fetch("/api/settings/notification-preferences");
        if (res.ok) {
          const data = await res.json();
          form.setFieldsValue({
            loan_reminder: data.loan_reminder ?? true,
            savings_reminder: data.savings_reminder ?? true,
            stock_alert: data.stock_alert ?? true,
          });
        }
      } catch {
        message.error("Gagal memuat preferensi notifikasi");
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [session?.user?.id, form, message]);

  const onSubmit = async (values: {
    loan_reminder: boolean;
    savings_reminder: boolean;
    stock_alert: boolean;
  }) => {
    if (!session?.user?.id) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/settings/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }
      message.success("Preferensi notifikasi berhasil disimpan");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Preferensi Notifikasi">
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        className="max-w-md"
        disabled={loading}
      >
        <Form.Item name="loan_reminder" valuePropName="checked">
          <Checkbox>Pengingat jatuh tempo pinjaman</Checkbox>
        </Form.Item>
        <Form.Item name="savings_reminder" valuePropName="checked">
          <Checkbox>Pengingat simpanan</Checkbox>
        </Form.Item>
        <Form.Item name="stock_alert" valuePropName="checked">
          <Checkbox>Alert stok barang</Checkbox>
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
