"use client";

import { useState } from "react";
import { Modal, Form, Input, Button, App } from "antd";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengubah password");
      }

      message.success("Password berhasil diubah");
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
      title="Ubah Password"
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        <Form.Item
          label="Password Saat Ini"
          name="currentPassword"
          rules={[{ required: true, message: "Password saat ini wajib diisi" }]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>

        <Form.Item
          label="Password Baru"
          name="newPassword"
          rules={[
            { required: true, message: "Password baru wajib diisi" },
            { min: 6, message: "Password minimal 6 karakter" },
          ]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>

        <Form.Item
          label="Konfirmasi Password Baru"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Konfirmasi password wajib diisi" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Password tidak cocok"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="••••••••" />
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
