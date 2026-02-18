"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Input, App, Modal, Form, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Popconfirm } from "antd";

interface DepartmentRow {
  id: number;
  code: string;
  name: string;
}

export function DepartmentsTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const res = await fetch(`/api/settings/departments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
        setTotal(data.total || 0);
      }
    } catch {
      message.error("Gagal memuat data departemen");
    } finally {
      setLoading(false);
    }
  }, [page, search, message]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: DepartmentRow) => {
    setEditingId(record.id);
    form.setFieldsValue({ code: record.code, name: record.name });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        const res = await fetch(`/api/settings/departments/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengubah departemen");
        }
        message.success("Departemen berhasil diubah");
      } else {
        const res = await fetch("/api/settings/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membuat departemen");
        }
        message.success("Departemen berhasil dibuat");
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/departments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus departemen");
      message.success("Departemen berhasil dihapus");
      fetchDepartments();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  };

  const columns: ColumnsType<DepartmentRow> = [
    { title: "Kode", dataIndex: "code", key: "code", render: (t) => <span className="font-mono">{t}</span> },
    { title: "Nama", dataIndex: "name", key: "name" },
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
            title="Hapus departemen ini?"
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
          placeholder="Cari departemen..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Tambah Departemen
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={departments}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `Total ${t} departemen`,
          onChange: (p) => setPage(p),
        }}
      />
      <Modal
        title={editingId ? "Ubah Departemen" : "Tambah Departemen"}
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
            <Input placeholder="Nama departemen" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
