"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Input, App, Modal, Form, Space, Switch, Badge } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Popconfirm } from "antd";

interface UnitRow {
  id: number;
  code: string;
  name: string;
  is_default_base: boolean;
  is_active: boolean;
}

export function UnitsTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(includeInactive && { include_inactive: "true" }),
      });
      const res = await fetch(`/api/settings/units?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUnits(data.units || []);
        setTotal(data.total || 0);
      }
    } catch {
      message.error("Gagal memuat data satuan");
    } finally {
      setLoading(false);
    }
  }, [page, search, includeInactive, message]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: UnitRow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      is_default_base: record.is_default_base,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        const res = await fetch(`/api/settings/units/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengubah satuan");
        }
        message.success("Satuan berhasil diubah");
      } else {
        const res = await fetch("/api/settings/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membuat satuan");
        }
        message.success("Satuan berhasil dibuat");
      }
      setModalOpen(false);
      fetchUnits();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/units/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menonaktifkan satuan");
      message.success("Satuan berhasil dinonaktifkan");
      fetchUnits();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  };

  const columns: ColumnsType<UnitRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name" },
    {
      title: "Satuan dasar default",
      dataIndex: "is_default_base",
      key: "is_default_base",
      render: (v) => (v ? <Badge status="success" text="Ya" /> : "-"),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (v) => <Badge status={v ? "success" : "default"} text={v ? "Aktif" : "Nonaktif"} />,
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} disabled={!record.is_active}>
            Ubah
          </Button>
          <Popconfirm
            title="Nonaktifkan satuan ini? Produk yang memakai satuan ini tidak akan terpengaruh."
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={!record.is_active}>
              Nonaktifkan
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Cari satuan (kode, nama)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
            allowClear
          />
          <label className="flex items-center gap-2">
            <Switch checked={includeInactive} onChange={setIncludeInactive} />
            <span className="text-sm">Tampilkan nonaktif</span>
          </label>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Tambah Satuan
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={units}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `Total ${t} satuan`,
          onChange: (p) => setPage(p),
        }}
      />
      <Modal
        title={editingId ? "Ubah Satuan" : "Tambah Satuan"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="Kode" name="code" rules={[{ required: true, message: "Kode harus diisi" }]}>
            <Input placeholder="Kode unik (mis. PCS, DOZ)" disabled={!!editingId} />
          </Form.Item>
          <Form.Item label="Nama" name="name" rules={[{ required: true, message: "Nama harus diisi" }]}>
            <Input placeholder="Nama satuan (mis. Pieces, Lusin)" />
          </Form.Item>
          <Form.Item
            name="is_default_base"
            valuePropName="checked"
            initialValue={false}
            label="Jadikan satuan dasar default"
          >
            <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
