"use client";

import { useEffect, useState } from "react";
import { Table, DatePicker, Select, Input, Space, App } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  created_at: string | null;
}

export function AuditLogsTable() {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [filters, setFilters] = useState<{
    entity_type?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
  }>({});

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.action && { action: filters.action }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
      });

      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          message.error("Anda tidak memiliki akses");
          return;
        }
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal memuat audit log";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const columns: ColumnsType<AuditLog> = [
    {
      title: "Waktu",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (val: string | null) =>
        val ? dayjs(val).format("DD/MM/YYYY HH:mm:ss") : "-",
    },
    {
      title: "User",
      dataIndex: "user_name",
      key: "user_name",
      render: (val: string | null) => val || "-",
    },
    {
      title: "Aksi",
      dataIndex: "action",
      key: "action",
      width: 180,
      render: (val: string) => <span className="font-mono text-sm">{val}</span>,
    },
    {
      title: "Entitas",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 120,
    },
    {
      title: "ID",
      dataIndex: "entity_id",
      key: "entity_id",
      width: 80,
      render: (val: number | null) => (val != null ? String(val) : "-"),
    },
    {
      title: "IP",
      dataIndex: "ip_address",
      key: "ip_address",
      width: 120,
      render: (val: string | null) => val || "-",
    },
    {
      title: "Detail",
      key: "detail",
      render: (_: unknown, record: AuditLog) => {
        const hasOld = record.old_values && Object.keys(record.old_values as object).length > 0;
        const hasNew = record.new_values && Object.keys(record.new_values as object).length > 0;
        if (!hasOld && !hasNew) return "-";
        return (
          <details className="text-xs">
            <summary className="cursor-pointer text-teal-400 hover:underline">
              Lihat nilai
            </summary>
            <div className="mt-1 space-y-1 font-mono">
              {hasOld ? (
                <div>
                  <span className="text-red-400">old:</span>{" "}
                  {JSON.stringify(record.old_values)}
                </div>
              ) : null}
              {hasNew ? (
                <div>
                  <span className="text-green-400">new:</span>{" "}
                  {JSON.stringify(record.new_values)}
                </div>
              ) : null}
            </div>
          </details>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Space wrap className="mb-4">
        <Select
          placeholder="Tipe entitas"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => setFilters((f) => ({ ...f, entity_type: v ?? undefined }))}
        >
          <Select.Option value="user">user</Select.Option>
          <Select.Option value="member">member</Select.Option>
          <Select.Option value="loan">loan</Select.Option>
          <Select.Option value="savings">savings</Select.Option>
          <Select.Option value="journal_entry">journal_entry</Select.Option>
          <Select.Option value="cash_expense">cash_expense</Select.Option>
          <Select.Option value="stock">stock</Select.Option>
          <Select.Option value="settings">settings</Select.Option>
        </Select>
        <Input
          placeholder="Aksi (e.g. user.create)"
          allowClear
          style={{ width: 180 }}
          onPressEnter={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            setFilters((f) => ({ ...f, action: v || undefined }));
          }}
        />
        <DatePicker.RangePicker
          placeholder={["Dari", "Sampai"]}
          onChange={(dates) =>
            setFilters((f) => ({
              ...f,
              from_date: dates?.[0] ? dates[0].format("YYYY-MM-DD") : undefined,
              to_date: dates?.[1] ? dates[1].format("YYYY-MM-DD") : undefined,
            }))
          }
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} log`,
          onChange: setPage,
        }}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
