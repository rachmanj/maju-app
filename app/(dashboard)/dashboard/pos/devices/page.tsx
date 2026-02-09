"use client";

import { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";

type Device = { id: number; code: string; name: string; is_active: boolean };

export default function POSDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pos/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch {
      message.error("Gagal memuat device");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch("/api/pos/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal daftar device");
      message.success("Device terdaftar");
      setModalOpen(false);
      form.resetFields();
      fetchDevices();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message || "Gagal daftar device");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Device> = [
    { title: "Kode", dataIndex: "code", key: "code" },
    { title: "Nama", dataIndex: "name", key: "name" },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (v) => (v ? "Aktif" : "Nonaktif"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS Devices</h1>
          <p className="text-muted-foreground">Daftar device yang terdaftar untuk POS</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Daftar Device
        </Button>
      </div>

      <Card className="border-[hsl(var(--border))]">
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title="Daftar Device Baru"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Kode" rules={[{ required: true }]}>
            <Input placeholder="Contoh: POS-01" />
          </Form.Item>
          <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
            <Input placeholder="Contoh: Kasir 1" />
          </Form.Item>
          <Form.Item name="device_fingerprint" label="Device Fingerprint (opsional)">
            <Input placeholder="Opsional" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
