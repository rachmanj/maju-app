"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Input, App, Modal, Form, Space, Badge, Select, Switch } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Popconfirm } from "antd";

interface CategoryRow {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  parent_code?: string;
  parent_name?: string;
  is_active: boolean;
}

export function CategoriesTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(includeInactive && { include_inactive: "true" }),
      });
      const res = await fetch(`/api/settings/categories?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setTotal(data.total || 0);
      }
    } catch {
      message.error("Gagal memuat data kategori");
    } finally {
      setLoading(false);
    }
  }, [page, search, includeInactive, message]);

  const fetchAllCategories = useCallback(async () => {
    const res = await fetch("/api/settings/categories?limit=500&include_inactive=true");
    if (res.ok) {
      const data = await res.json();
      setAllCategories(data.categories || []);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (modalOpen) fetchAllCategories();
  }, [modalOpen, fetchAllCategories]);

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: CategoryRow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      parent_id: record.parent_id ?? undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        const res = await fetch(`/api/settings/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            parent_id: values.parent_id ?? null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengubah kategori");
        }
        message.success("Kategori berhasil diubah");
      } else {
        const res = await fetch("/api/settings/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            parent_id: values.parent_id ?? null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membuat kategori");
        }
        message.success("Kategori berhasil dibuat");
      }
      setModalOpen(false);
      fetchCategories();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menonaktifkan kategori");
      message.success("Kategori berhasil dinonaktifkan");
      fetchCategories();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  };

  const parentOptions = allCategories
    .filter((c) => !editingId || c.id !== editingId)
    .map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));

  const getParentName = (record: CategoryRow) => {
    if (!record.parent_id) return "-";
    if (record.parent_code && record.parent_name) return `${record.parent_code} - ${record.parent_name}`;
    const p = allCategories.find((c) => c.id === record.parent_id) || categories.find((c) => c.id === record.parent_id);
    return p ? `${p.code} - ${p.name}` : "-";
  };

  const columns: ColumnsType<CategoryRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name" },
    {
      title: "Induk",
      dataIndex: "parent_id",
      key: "parent_id",
      render: (_, record) => getParentName(record),
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
            title="Nonaktifkan kategori ini? Produk yang memakai kategori ini tidak akan terpengaruh."
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
            placeholder="Cari kategori (kode, nama)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
            allowClear
          />
          <label className="flex items-center gap-2">
            <Switch checked={includeInactive} onChange={(v) => { setIncludeInactive(v); setPage(1); }} />
            <span className="text-sm">Tampilkan nonaktif</span>
          </label>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Tambah Kategori
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `Total ${t} kategori`,
          onChange: (p) => setPage(p),
        }}
      />
      <Modal
        title={editingId ? "Ubah Kategori" : "Tambah Kategori"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="Kode" name="code" rules={[{ required: true, message: "Kode harus diisi" }]}>
            <Input placeholder="Kode unik (mis. FNB, ATK)" disabled={!!editingId} />
          </Form.Item>
          <Form.Item label="Nama" name="name" rules={[{ required: true, message: "Nama harus diisi" }]}>
            <Input placeholder="Nama kategori (mis. Makanan & Minuman)" />
          </Form.Item>
          <Form.Item label="Kategori induk" name="parent_id">
            <Select
              allowClear
              placeholder="Opsional - pilih kategori induk"
              options={parentOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
