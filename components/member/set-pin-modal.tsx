"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, App } from "antd";
import { SafetyOutlined } from "@ant-design/icons";

interface SetPinModalProps {
  open: boolean;
  onClose: () => void;
}

export function SetPinModal({ open, onClose }: SetPinModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setHasPin(null);
      fetch("/api/member-portal/pin")
        .then((r) => r.json())
        .then((d) => setHasPin(d.hasPin ?? false))
        .catch(() => setHasPin(false));
    }
  }, [open, form]);

  const handleSubmit = async (values: {
    currentPin?: string;
    newPin: string;
    confirmPin: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/member-portal/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: hasPin ? values.currentPin : undefined,
          newPin: values.newPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan PIN");
      }

      message.success("PIN berhasil disimpan");
      form.resetFields();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <SafetyOutlined className="mr-2" />
          {hasPin === null ? "Atur PIN" : hasPin ? "Ubah PIN POS" : "Set PIN POS"}
        </span>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
        PIN digunakan untuk pembayaran Potong Gaji di kasir POS. Simpan PIN Anda dengan aman.
      </p>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        {hasPin && (
          <Form.Item
            label="PIN Saat Ini"
            name="currentPin"
            rules={[{ required: true, message: "PIN saat ini wajib diisi" }]}
          >
            <Input.Password
              placeholder="••••"
              maxLength={8}
              autoComplete="off"
            />
          </Form.Item>
        )}

        <Form.Item
          label={hasPin ? "PIN Baru" : "PIN"}
          name="newPin"
          rules={[
            { required: true, message: "PIN wajib diisi" },
            { min: 4, message: "PIN minimal 4 digit" },
            { max: 8, message: "PIN maksimal 8 digit" },
            {
              pattern: /^\d+$/,
              message: "PIN hanya boleh berisi angka",
            },
          ]}
        >
          <Input.Password
            placeholder="4–8 digit angka"
            maxLength={8}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          label="Konfirmasi PIN"
          name="confirmPin"
          dependencies={["newPin"]}
          rules={[
            { required: true, message: "Konfirmasi PIN wajib diisi" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPin") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("PIN tidak cocok"));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder="Ulangi PIN"
            maxLength={8}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end gap-2">
            <Button onClick={handleCancel}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Simpan
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
