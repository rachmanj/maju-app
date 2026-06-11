"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Input, App, Modal, Form, Switch, Space, Select, Tag, Typography } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, DisconnectOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Popconfirm } from "antd";

interface DeviceRow {
  id: number;
  device_token: string | null;
  is_paired: boolean;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  name: string | null;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  is_active: boolean;
}

function formatCountdown(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Kedaluwarsa";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isPairingCodeActive(record: DeviceRow): boolean {
  if (!record.pairing_code || !record.pairing_expires_at) return false;
  return new Date(record.pairing_expires_at).getTime() > Date.now();
}

export function POSSelfServiceDevicesTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pairingLoadingId, setPairingLoadingId] = useState<number | null>(null);
  const [unpairLoadingId, setUnpairLoadingId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/pos-self-service-devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : []);
      }
    } catch {
      message.error("Gagal memuat data device");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/warehouses?all=true");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.warehouses || [];
        setWarehouses(list);
      }
    } catch {
      message.error("Gagal memuat gudang");
    }
  }, [message]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (modalOpen) fetchWarehouses();
  }, [modalOpen, fetchWarehouses]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: DeviceRow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name || "",
      warehouse_id: record.warehouse_id,
      is_active: record.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        const res = await fetch(`/api/settings/pos-self-service-devices/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name || undefined,
            warehouse_id: values.warehouse_id,
            is_active: values.is_active,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengubah device");
        }
        message.success("Device berhasil diubah");
      } else {
        const res = await fetch("/api/settings/pos-self-service-devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name || undefined,
            warehouse_id: values.warehouse_id,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menambahkan device");
        }
        message.success("Device berhasil ditambahkan");
      }
      setModalOpen(false);
      fetchDevices();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/pos-self-service-devices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus device");
      message.success("Device berhasil dihapus");
      fetchDevices();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  };

  const handleGeneratePairingCode = async (id: number) => {
    try {
      setPairingLoadingId(id);
      const res = await fetch(`/api/settings/pos-self-service-devices/${id}/generate-pairing-code`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat kode pairing");
      message.success(`Kode pairing: ${data.pairing_code}`);
      fetchDevices();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setPairingLoadingId(null);
    }
  };

  const handleUnpair = async (id: number) => {
    try {
      setUnpairLoadingId(id);
      const res = await fetch(`/api/settings/pos-self-service-devices/${id}/unpair`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencabut pairing");
      message.success("Pairing device berhasil dicabut");
      fetchDevices();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setUnpairLoadingId(null);
    }
  };

  const columns: ColumnsType<DeviceRow> = [
    { title: "Nama", dataIndex: "name", key: "name", render: (t) => t || "-" },
    {
      title: "Gudang",
      key: "warehouse",
      render: (_, r) => (r.warehouse_code ? `${r.warehouse_code} - ${r.warehouse_name || ""}` : r.warehouse_name || "-"),
    },
    {
      title: "Status Pairing",
      key: "pairing_status",
      render: (_, record) =>
        record.is_paired ? <Tag color="green">Terpasang</Tag> : <Tag>Belum Dipasangkan</Tag>,
    },
    {
      title: "Kode Pairing",
      key: "pairing_code",
      render: (_, record) => {
        void now;
        if (isPairingCodeActive(record)) {
          const countdown = formatCountdown(record.pairing_expires_at);
          return (
            <Space direction="vertical" size={0}>
              <Typography.Text className="font-mono text-base">{record.pairing_code}</Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                Berlaku {countdown}
              </Typography.Text>
            </Space>
          );
        }
        return (
          <Button
            size="small"
            icon={<LinkOutlined />}
            loading={pairingLoadingId === record.id}
            onClick={() => handleGeneratePairingCode(record.id)}
          >
            Generate Kode
          </Button>
        );
      },
    },
    {
      title: "Aktif",
      dataIndex: "is_active",
      key: "is_active",
      render: (v) => (v !== false ? "Aktif" : "Nonaktif"),
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Ubah
          </Button>
          {record.is_paired && (
            <Popconfirm
              title="Cabut pairing device ini?"
              description="PC harus dipasangkan ulang dengan kode pairing baru."
              onConfirm={() => handleUnpair(record.id)}
              okText="Ya"
              cancelText="Batal"
            >
              <Button
                type="link"
                size="small"
                icon={<DisconnectOutlined />}
                loading={unpairLoadingId === record.id}
              >
                Cabut Pairing
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="Hapus device ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Daftar device POS Self-Service (route /pos). Setiap device dipasangkan ke satu gudang menggunakan kode pairing.
        </p>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Tambah Device
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 900 }}
      />
      <Modal
        title={editingId ? "Ubah Device POS Self-Service" : "Tambah Device POS Self-Service"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="Nama (opsional)" name="name">
            <Input placeholder="Mis. POS Kantor Utama" />
          </Form.Item>
          <Form.Item
            label="Gudang"
            name="warehouse_id"
            rules={[{ required: true, message: "Gudang wajib dipilih" }]}
          >
            <Select
              placeholder="Pilih gudang"
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.code} - ${w.name}`,
              }))}
            />
          </Form.Item>
          {editingId != null && (
            <Form.Item label="Aktif" name="is_active" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
