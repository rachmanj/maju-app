"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Spin, Button, Descriptions, Badge } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";

interface ScheduleRow {
  id: number;
  installment_number: number;
  due_date: string;
  installment_amount: number;
  principal_amount: number;
  interest_amount: number;
  paid_amount: number;
  status: string;
}

interface LoanDetail {
  id: number;
  loan_number: string;
  member_name: string;
  member_nik: string;
  member_number?: string | null;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  approved_date?: string;
  disbursed_date?: string;
  schedules: ScheduleRow[];
}

const statusMap: Record<string, { text: string; status: "success" | "warning" | "error" | "processing" | "default" }> = {
  active: { text: "Aktif", status: "success" },
  approved: { text: "Disetujui", status: "processing" },
  pending: { text: "Menunggu", status: "warning" },
  completed: { text: "Lunas", status: "default" },
  defaulted: { text: "Macet", status: "error" },
};

export default function MemberLoanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/member-portal/loans/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setLoan(d);
      })
      .catch(() => setLoan(null))
      .finally(() => setLoading(false));
  }, [id]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const columns = [
    { title: "Angsuran ke", dataIndex: "installment_number", key: "installment_number", width: 100 },
    {
      title: "Jatuh Tempo",
      dataIndex: "due_date",
      key: "due_date",
      render: (v: string) => (v ? new Date(v).toLocaleDateString("id-ID") : "-"),
    },
    {
      title: "Angsuran",
      dataIndex: "installment_amount",
      key: "installment_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Pokok",
      dataIndex: "principal_amount",
      key: "principal_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Bunga",
      dataIndex: "interest_amount",
      key: "interest_amount",
      render: (v: number) => formatRupiah(Number(v)),
    },
    {
      title: "Dibayar",
      dataIndex: "paid_amount",
      key: "paid_amount",
      render: (v: number) => formatRupiah(Number(v ?? 0)),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => (s === "paid" ? "Lunas" : "Belum"),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/member/loans">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Kembali
          </Button>
        </Link>
        <Card>
          <p className="text-muted-foreground">Pinjaman tidak ditemukan.</p>
        </Card>
      </div>
    );
  }

  const statusInfo = statusMap[loan.status] || { text: loan.status, status: "default" as const };
  const totalBunga = (loan.schedules || []).reduce((sum, s) => sum + Number(s.interest_amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/member/loans">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Pinjaman {loan.loan_number}</h1>
          <p className="text-muted-foreground text-sm">Detail pinjaman</p>
        </div>
      </div>

      <Card title="Informasi Pinjaman">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="No. Pinjaman">{loan.loan_number}</Descriptions.Item>
          <Descriptions.Item label="No. Anggota">{loan.member_number ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Anggota">
            {loan.member_name} ({loan.member_nik})
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Badge status={statusInfo.status} text={statusInfo.text} />
          </Descriptions.Item>
          <Descriptions.Item label="Total Pokok">{formatRupiah(loan.principal_amount)}</Descriptions.Item>
          <Descriptions.Item label="Total Bunga">{formatRupiah(totalBunga)}</Descriptions.Item>
          <Descriptions.Item label="Bunga">{loan.interest_rate}%</Descriptions.Item>
          <Descriptions.Item label="Tenor">{loan.term_months} bulan</Descriptions.Item>
          <Descriptions.Item label="Tanggal Disetujui">
            {loan.approved_date ? new Date(loan.approved_date).toLocaleDateString("id-ID") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tanggal Pencairan">
            {loan.disbursed_date ? new Date(loan.disbursed_date).toLocaleDateString("id-ID") : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Jadwal Angsuran">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={loan.schedules || []}
          pagination={false}
          locale={{ emptyText: "Tidak ada jadwal" }}
        />
      </Card>
    </div>
  );
}
