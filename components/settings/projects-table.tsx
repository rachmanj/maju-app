"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Input, App, Modal, Form, Switch, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Popconfirm } from "antd";

interface ProjectRow {
  id: number;
  code: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

export function ProjectsTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const res = await fetch(`/api/settings/projects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setTotal(data.total || 0);
      }
    } catch {
      message.error("Gagal memuat data proyek");
    } finally {
      setLoading(false);
    }
  }, [page, search, message]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: ProjectRow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      address: record.address || "",
      is_active: record.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        const res = await fetch(`/api/settings/projects/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            address: values.address || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengubah proyek");
        }
        message.success("Proyek berhasil diubah");
      } else {
        const res = await fetch("/api/settings/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            address: values.address || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membuat proyek");
        }
        message.success("Proyek berhasil dibuat");
      }
      setModalOpen(false);
      fetchProjects();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus proyek");
      message.success("Proyek berhasil dihapus");
      fetchProjects();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  };

  const columns: ColumnsType<ProjectRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name" },
    { title: "Alamat", dataIndex: "address", key: "address", render: (t) => t || "-" },
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
            title="Hapus proyek ini?"
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
        <Input
          placeholder="Cari proyek..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Tambah Proyek
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `Total ${t} proyek`,
          onChange: (p) => setPage(p),
        }}
      />
      <Modal
        title={editingId ? "Ubah Proyek" : "Tambah Proyek"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="Kode" name="code" rules={[{ required: true, message: "Kode harus diisi" }]}>
            <Input placeholder="Kode unik" disabled={!!editingId} />
          </Form.Item>
          <Form.Item label="Nama" name="name" rules={[{ required: true, message: "Nama harus diisi" }]}>
            <Input placeholder="Nama proyek" />
          </Form.Item>
          <Form.Item label="Alamat" name="address">
            <Input.TextArea rows={2} placeholder="Opsional" />
          </Form.Item>
          <Form.Item label="Aktif" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
