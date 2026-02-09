"use client";

import { useEffect, useState } from "react";
import { Button, Card, Table, Badge, Space, Select } from "antd";
import { PlusOutlined, EyeOutlined, CheckOutlined } from "@ant-design/icons";
import Link from "next/link";
import { App } from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  description?: string;
  status: string;
  posted_at?: string;
  created_at: string;
}

export default function JournalListPage() {
  const { message } = App.useApp();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(status && { status }),
        ...(dateRange?.[0] && { from_date: dateRange[0] }),
        ...(dateRange?.[1] && { to_date: dateRange[1] }),
      });
      const res = await fetch(`/api/journal?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    } catch (e: any) {
      message.error(e.message || "Gagal memuat jurnal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [page, status, dateRange]);

  const handlePost = async (id: number) => {
    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      message.success("Jurnal berhasil diposting");
      fetchEntries();
    } catch (e: any) {
      message.error(e.message || "Gagal posting");
    }
  };

  const columns: ColumnsType<JournalEntry> = [
    {
      title: "No. Jurnal",
      dataIndex: "entry_number",
      key: "entry_number",
      render: (t) => <span className="font-mono">{t}</span>,
    },
    {
      title: "Tanggal",
      dataIndex: "entry_date",
      key: "entry_date",
      render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-",
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Badge
          status={s === "posted" ? "success" : "warning"}
          text={s === "posted" ? "Posted" : "Draft"}
        />
      ),
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, r) => (
        <Space>
          <Link href={`/dashboard/accounting/journal/${r.id}`}>
            <Button type="link" icon={<EyeOutlined />} size="small" />
          </Link>
          {r.status === "draft" && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => handlePost(r.id)}
            >
              Post
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            Jurnal Umum
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Daftar jurnal akuntansi
          </p>
        </div>
        <Link href="/dashboard/accounting/journal/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Entri Baru
          </Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-4">
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 120 }}
            value={status}
            onChange={setStatus}
            options={[
              { value: "draft", label: "Draft" },
              { value: "posted", label: "Posted" },
            ]}
          />
        </div>
        <Table
          columns={columns}
          dataSource={entries}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showTotal: (t) => `Total ${t} jurnal`,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
