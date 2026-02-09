"use client";

import { useEffect, useState } from "react";
import { Button, Table, Input, Badge, Space, App } from "antd";
import { SearchOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

interface Member {
  id: number;
  nik: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  joined_date?: string;
}

export function MembersTable() {
  const { message } = App.useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });

      const response = await fetch(`/api/members?${params}`);
      if (!response.ok) throw new Error("Failed to fetch members");

      const data = await response.json();
      setMembers(data.members);
      setTotal(data.total);
    } catch (error: any) {
      message.error(error.message || "Gagal memuat data anggota");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, search]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; status: "success" | "warning" | "error" | "default" }> = {
      active: { text: "Aktif", status: "success" },
      pending: { text: "Menunggu", status: "warning" },
      inactive: { text: "Tidak Aktif", status: "default" },
      resigned: { text: "Keluar", status: "error" },
    };

    const statusInfo = statusMap[status] || { text: status, status: "default" };
    return <Badge status={statusInfo.status} text={statusInfo.text} />;
  };

  const columns: ColumnsType<Member> = [
    {
      title: "NIK",
      dataIndex: "nik",
      key: "nik",
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: "Nama",
      dataIndex: "name",
      key: "name",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (text) => text || "-",
    },
    {
      title: "Telepon",
      dataIndex: "phone",
      key: "phone",
      render: (text) => text || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusBadge(status),
    },
    {
      title: "Tanggal Bergabung",
      dataIndex: "joined_date",
      key: "joined_date",
      render: (date) =>
        date ? new Date(date).toLocaleDateString("id-ID") : "-",
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space>
          <Link href={`/dashboard/members/${record.id}`}>
            <Button type="link" icon={<EyeOutlined />} />
          </Link>
          <Link href={`/dashboard/members/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />} />
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cari anggota..."
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
        dataSource={members}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total: total,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} anggota`,
          onChange: (page) => setPage(page),
        }}
      />
    </div>
  );
}
