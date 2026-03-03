"use client";

import { useEffect, useState } from "react";
import { Button, Table, Badge, Space, App, Modal } from "antd";
import { EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
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
  const { data: session } = useSession();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const canDelete = hasPermission(roles, PERMISSIONS.LOAN_DELETE);
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

  useEffect(() => {
    const onRefresh = () => fetchLoans();
    window.addEventListener("loans-refresh", onRefresh);
    return () => window.removeEventListener("loans-refresh", onRefresh);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = (record: Loan) => {
    Modal.confirm({
      title: "Hapus Pinjaman?",
      content: `Pinjaman ${record.loan_number} beserta jadwal angsuran dan riwayat pembayaran akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          const r = await fetch(`/api/loans/${record.id}`, { method: "DELETE" });
          if (!r.ok) {
            const err = await r.json();
            throw new Error(err.error || "Gagal menghapus");
          }
          message.success("Pinjaman berhasil dihapus");
          fetchLoans();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Terjadi kesalahan");
          throw err;
        }
      },
    });
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
        <Space>
          <Link href={`/dashboard/loans/${record.id}`}>
            <Button type="link" icon={<EyeOutlined />} title="Lihat detail" />
          </Link>
          {canDelete && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              title="Hapus pinjaman"
            />
          )}
        </Space>
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
