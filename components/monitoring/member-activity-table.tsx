"use client";

import { useEffect, useState } from "react";
import { Table, DatePicker, Input, Space, App } from "antd";
import type { ColumnsType } from "antd/es/table";

interface MemberActivityStat {
  member_id: number;
  member_name: string;
  nik: string;
  last_login: string | null;
  savings_count: number;
  loan_payments_count: number;
  orders_count: number;
  pos_count: number;
  last_activity: string | null;
}

export function MemberActivityTable() {
  const { message } = App.useApp();
  const [stats, setStats] = useState<MemberActivityStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{
    from_date?: string;
    to_date?: string;
    search?: string;
  }>({});

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
        ...(filters.search && { search: filters.search }),
      });
      const res = await fetch(`/api/monitoring/member-activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data.stats);
      setTotal(data.total);
    } catch {
      message.error("Gagal memuat statistik aktivitas anggota");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [page, filters]);

  const columns: ColumnsType<MemberActivityStat> = [
    { title: "Nama", dataIndex: "member_name", key: "member_name" },
    { title: "NIK", dataIndex: "nik", key: "nik", width: 140 },
    {
      title: "Login Terakhir",
      dataIndex: "last_login",
      key: "last_login",
      render: (v: string | null) =>
        v ? new Date(v).toLocaleString("id-ID") : "-",
    },
    {
      title: "Simpanan",
      dataIndex: "savings_count",
      key: "savings_count",
      width: 90,
      align: "right",
    },
    {
      title: "Angsuran",
      dataIndex: "loan_payments_count",
      key: "loan_payments_count",
      width: 90,
      align: "right",
    },
    {
      title: "Pesanan",
      dataIndex: "orders_count",
      key: "orders_count",
      width: 90,
      align: "right",
    },
    {
      title: "POS",
      dataIndex: "pos_count",
      key: "pos_count",
      width: 70,
      align: "right",
    },
  ];

  return (
    <div className="space-y-4">
      <Space wrap>
        <Input
          placeholder="Cari nama atau NIK"
          allowClear
          style={{ width: 200 }}
          onPressEnter={(e) =>
            setFilters((f) => ({
              ...f,
              search: (e.target as HTMLInputElement).value.trim() || undefined,
            }))
          }
        />
        <DatePicker.RangePicker
          placeholder={["Dari", "Sampai"]}
          onChange={(dates) =>
            setFilters((f) => ({
              ...f,
              from_date: dates?.[0]?.format("YYYY-MM-DD"),
              to_date: dates?.[1]?.format("YYYY-MM-DD"),
            }))
          }
        />
      </Space>
      <Table
        rowKey="member_id"
        columns={columns}
        dataSource={stats}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `Total ${t} anggota`,
          onChange: setPage,
        }}
      />
    </div>
  );
}
