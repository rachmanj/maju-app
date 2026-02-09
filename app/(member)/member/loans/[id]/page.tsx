"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Table, Spin, Button } from "antd";
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

export default function MemberLoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/member-portal/loans/${id}/schedules`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSchedules(Array.isArray(d) ? d : []);
      })
      .catch(() => setSchedules([]))
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/member/loans">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Kembali
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Jadwal Angsuran · Pinjaman #{id}</h1>
      </div>
      <Card title="Jadwal Angsuran" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={schedules}
          pagination={false}
          locale={{ emptyText: "Tidak ada jadwal" }}
        />
      </Card>
    </div>
  );
}
