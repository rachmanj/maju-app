"use client";

import { useEffect, useState } from "react";
import { Button, Table, Badge, Space, App } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

interface Loan {
  id: number;
  loan_number: string;
  member_name: string;
  member_nik: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  approved_date?: string;
}

export function LoansTable() {
  const { message } = App.useApp();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      const response = await fetch(`/api/loans?${params}`);
      if (!response.ok) throw new Error("Failed to fetch loans");

      const data = await response.json();
      setLoans(data.loans);
      setTotal(data.total);
    } catch (error: any) {
      message.error(error.message || "Gagal memuat data pinjaman");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [page]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; status: "success" | "warning" | "error" | "processing" | "default" }> = {
      active: { text: "Aktif", status: "success" },
      approved: { text: "Disetujui", status: "processing" },
      pending: { text: "Menunggu", status: "warning" },
      completed: { text: "Lunas", status: "default" },
      defaulted: { text: "Macet", status: "error" },
    };

    const statusInfo = statusMap[status] || { text: status, status: "default" };
    return <Badge status={statusInfo.status} text={statusInfo.text} />;
  };

  const columns: ColumnsType<Loan> = [
    {
      title: "No. Pinjaman",
      dataIndex: "loan_number",
      key: "loan_number",
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: "Anggota",
      key: "member",
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.member_name}</div>
          <div className="text-sm text-muted-foreground">{record.member_nik}</div>
        </div>
      ),
    },
    {
      title: "Pokok",
      dataIndex: "principal_amount",
      key: "principal_amount",
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Bunga",
      dataIndex: "interest_rate",
      key: "interest_rate",
      render: (rate) => `${rate}%`,
    },
    {
      title: "Tenor",
      dataIndex: "term_months",
      key: "term_months",
      render: (months) => `${months} bulan`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusBadge(status),
    },
    {
      title: "Tanggal Disetujui",
      dataIndex: "approved_date",
      key: "approved_date",
      render: (date) =>
        date ? new Date(date).toLocaleDateString("id-ID") : "-",
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Link href={`/dashboard/loans/${record.id}`}>
          <Button type="link" icon={<EyeOutlined />} />
        </Link>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={loans}
      rowKey="id"
      loading={loading}
      pagination={{
        current: page,
        pageSize: 20,
        total: total,
        showSizeChanger: false,
        showTotal: (total) => `Total ${total} pinjaman`,
        onChange: (page) => setPage(page),
      }}
    />
  );
}
