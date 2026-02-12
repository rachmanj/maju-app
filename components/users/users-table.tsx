"use client";

import { useEffect, useState } from "react";
import { Button, Table, Input, Badge, Space, App, Popconfirm } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

interface User {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  roles: { code: string; name: string }[];
}

export function UsersTable() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          message.error("Anda tidak memiliki akses");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal memuat data pengguna";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal menghapus pengguna");
      }
      message.success("Pengguna berhasil dihapus");
      fetchUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Nama",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Telepon",
      dataIndex: "phone",
      key: "phone",
      render: (text) => text || "-",
    },
    {
      title: "Role",
      dataIndex: "roles",
      key: "roles",
      render: (roles: { code: string; name: string }[]) => (
        <Space wrap>
          {roles?.map((r) => (
            <Badge key={r.code} status="default" text={r.name} />
          ))}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive: boolean | null) => (
        <Badge
          status={isActive ? "success" : "default"}
          text={isActive ? "Aktif" : "Nonaktif"}
        />
      ),
    },
    {
      title: "Login Terakhir",
      dataIndex: "last_login_at",
      key: "last_login_at",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString("id-ID") : "-",
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space>
          <Link href={`/dashboard/users/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />} />
          </Link>
          <Popconfirm
            title="Hapus pengguna?"
            description="Data pengguna akan dihapus secara permanen."
            onConfirm={() => handleDelete(record.id)}
            okText="Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cari pengguna..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total: total,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} pengguna`,
          onChange: (p) => setPage(p),
        }}
      />
    </div>
  );
}
