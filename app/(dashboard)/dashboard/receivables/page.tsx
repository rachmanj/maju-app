"use client";

import { useState, useEffect } from "react";
import { Card, Table, Select, message, Row, Col, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined } from "@ant-design/icons";

type Receivable = {
  id: number;
  member_name: string;
  transaction_number: string;
  amount: number;
  due_month: number;
  due_year: number;
  status: string;
  paid_at: Date | null;
};

export default function ReceivablesPage() {
  const [data, setData] = useState<{ receivables: Receivable[]; total: number }>({
    receivables: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [page, setPage] = useState(1);
  const [payrollData, setPayrollData] = useState<{
    members: { member_id: number; member_name: string; total_receivable: number }[];
    total: number;
  } | null>(null);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(status && { status }),
        ...(year && { year: String(year) }),
        ...(month && { month: String(month) }),
      });
      const res = await fetch(`/api/receivables?${params}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      message.error("Gagal memuat piutang");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollDeduction = async () => {
    try {
      const res = await fetch(`/api/receivables/payroll-deduction?year=${year}&month=${month}`);
      if (res.ok) {
        const d = await res.json();
        setPayrollData(d);
      }
    } catch {
      message.error("Gagal memuat data potongan gaji");
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [page, status, year, month]);

  useEffect(() => {
    fetchPayrollDeduction();
  }, [year, month]);

  const columns: ColumnsType<Receivable> = [
    { title: "Anggota", dataIndex: "member_name", key: "member_name" },
    { title: "No. Transaksi", dataIndex: "transaction_number", key: "transaction_number" },
    {
      title: "Jumlah",
      dataIndex: "amount",
      key: "amount",
      render: (v) => `Rp ${Number(v).toLocaleString("id-ID")}`,
    },
    {
      title: "Jatuh Tempo",
      key: "due",
      render: (_, r) => `${r.due_month}/${r.due_year}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <span className={s === "paid" ? "text-green-600" : "text-amber-600"}>
          {s === "paid" ? "Lunas" : "Belum Lunas"}
        </span>
      ),
    },
  ];

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Piutang Anggota</h1>
        <p className="text-muted-foreground">Piutang dari pembelian Potong Gaji</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Filter" className="border-[hsl(var(--border))]">
            <div className="flex flex-wrap gap-2">
              <Select
                placeholder="Tahun"
                value={year}
                onChange={setYear}
                options={[year - 1, year, year + 1].map((y) => ({ value: y, label: String(y) }))}
                style={{ width: 100 }}
              />
              <Select
                placeholder="Bulan"
                value={month}
                onChange={setMonth}
                options={months}
                style={{ width: 140 }}
              />
              <Select
                placeholder="Status"
                value={status || undefined}
                onChange={(v) => setStatus(v || "")}
                options={[
                  { value: "", label: "Semua" },
                  { value: "pending", label: "Belum Lunas" },
                  { value: "paid", label: "Lunas" },
                ]}
                style={{ width: 140 }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Potongan Gaji Bulanan" className="border-[hsl(var(--border))]">
            {payrollData && (
              <div>
                <Typography.Text>
                  Total piutang bulan {months.find((m) => m.value === month)?.label} {year}:{" "}
                  <strong>Rp {payrollData.total.toLocaleString("id-ID")}</strong>
                </Typography.Text>
                {payrollData.members.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-sm">
                    {payrollData.members.map((m) => (
                      <li key={m.member_id}>
                        {m.member_name}: Rp {m.total_receivable.toLocaleString("id-ID")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card className="border-[hsl(var(--border))]">
        <Table
          columns={columns}
          dataSource={data.receivables}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total: data.total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
