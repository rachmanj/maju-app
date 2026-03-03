"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Input, App, Modal, Form, Switch, Space, Select } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Popconfirm } from "antd";

interface DeviceRow {
  id: number;
  ip_address: string;
  name: string | null;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  is_active: boolean;
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

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: DeviceRow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ip_address: record.ip_address,
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
            ip_address: values.ip_address,
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
            ip_address: values.ip_address,
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

  const columns: ColumnsType<DeviceRow> = [
    { title: "IP Address", dataIndex: "ip_address", key: "ip_address", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name", render: (t) => t || "-" },
    {
      title: "Gudang",
      key: "warehouse",
      render: (_, r) => (r.warehouse_code ? `${r.warehouse_code} - ${r.warehouse_name || ""}` : r.warehouse_name || "-"),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (v) => (v !== false ? "Aktif" : "Nonaktif"),
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Ubah
          </Button>
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
          Daftar IP address yang diizinkan mengakses POS Self-Service (route /pos). Setiap IP terhubung ke satu gudang.
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
          <Form.Item
            label="IP Address"
            name="ip_address"
            rules={[{ required: true, message: "IP address wajib diisi" }]}
          >
            <Input placeholder="127.0.0.1 atau 192.168.1.100" disabled={!!editingId} />
          </Form.Item>
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
