"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Descriptions, Button, Spin, App, Table, Badge, Row, Col, Statistic } from "antd";
import { ArrowLeftOutlined, EditOutlined, WalletOutlined, CreditCardOutlined, EyeOutlined } from "@ant-design/icons";
import Link from "next/link";
import { MemberApprovalButton } from "@/components/members/member-approval-button";
import type { ColumnsType } from "antd/es/table";

interface Member {
  id: number;
  member_number?: string;
  barcode?: string;
  purchase_limit?: number;
  order_limit?: number | null;
  nik: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string;
  status: string;
  joined_date?: string;
  project_name?: string;
  project_code?: string;
  department_name?: string;
  department_code?: string;
  created_at?: string;
}

interface SavingsAccount {
  id: number;
  account_number?: string;
  balance: number;
  savings_type_code?: string;
  savings_type_name?: string;
}

interface Loan {
  id: number;
  loan_number: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  approved_date?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [savings, setSavings] = useState<SavingsAccount[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [loansLoading, setLoansLoading] = useState(false);

  const fetchMember = useCallback(async () => {
    const id = params.id as string;
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/members/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          message.error("Anggota tidak ditemukan");
          router.push("/dashboard/members");
          return;
        }
        throw new Error("Failed to fetch member");
      }
      const data = await response.json();
      setMember(data);
    } catch (error: any) {
      message.error(error.message || "Gagal memuat data anggota");
      router.push("/dashboard/members");
    } finally {
      setLoading(false);
    }
  }, [params.id, message, router]);

  const fetchSavingsAndLoans = useCallback(async (memberId: number) => {
    setSavingsLoading(true);
    setLoansLoading(true);

    try {
      const [savingsRes, loansRes] = await Promise.all([
        fetch(`/api/savings?member_id=${memberId}`),
        fetch(`/api/loans?member_id=${memberId}&limit=10`),
      ]);

      if (savingsRes.ok) {
        const data = await savingsRes.json();
        setSavings(Array.isArray(data) ? data : []);
      } else {
        setSavings([]);
      }

      if (loansRes.ok) {
        const data = await loansRes.json();
        setLoans(data.loans || []);
      } else {
        setLoans([]);
      }
    } catch {
      setSavings([]);
      setLoans([]);
    } finally {
      setSavingsLoading(false);
      setLoansLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  useEffect(() => {
    if (member?.id) {
      fetchSavingsAndLoans(member.id);
    }
  }, [member?.id, fetchSavingsAndLoans]);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: "Aktif",
      pending: "Menunggu",
      inactive: "Tidak Aktif",
      resigned: "Keluar",
    };
    return map[status] || status;
  };

  const getLoanStatusBadge = (status: string) => {
    const map: Record<string, { text: string; status: "success" | "warning" | "error" | "processing" | "default" }> = {
      active: { text: "Aktif", status: "success" },
      approved: { text: "Disetujui", status: "processing" },
      pending: { text: "Menunggu", status: "warning" },
      completed: { text: "Lunas", status: "default" },
      defaulted: { text: "Macet", status: "error" },
    };
    const info = map[status] || { text: status, status: "default" as const };
    return <Badge status={info.status} text={info.text} />;
  };

  const totalSavings = savings.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const savingsColumns: ColumnsType<SavingsAccount> = [
    { title: "Jenis", dataIndex: "savings_type_name", key: "type", render: (v) => v || "-" },
    { title: "No. Rekening", dataIndex: "account_number", key: "account_number", render: (v) => <span className="font-mono">{v || "-"}</span> },
    { title: "Saldo", dataIndex: "balance", key: "balance", render: (v) => formatCurrency(Number(v || 0)) },
  ];

  const loanColumns: ColumnsType<Loan> = [
    { title: "No. Pinjaman", dataIndex: "loan_number", key: "loan_number", render: (v) => <span className="font-mono">{v}</span> },
    { title: "Pokok", dataIndex: "principal_amount", key: "principal_amount", render: (v) => formatCurrency(Number(v)) },
    { title: "Bunga", dataIndex: "interest_rate", key: "interest_rate", render: (v) => `${v}%` },
    { title: "Tenor", dataIndex: "term_months", key: "term_months", render: (v) => `${v} bulan` },
    { title: "Status", dataIndex: "status", key: "status", render: (v) => getLoanStatusBadge(v) },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Link href={`/dashboard/loans/${record.id}`}>
          <Button type="link" size="small" icon={<EyeOutlined />} />
        </Link>
      ),
    },
  ];

  if (loading || !member) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/dashboard/members")}
          >
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{member.name}</h1>
            <p className="text-muted-foreground">
              Detail anggota{member.nik ? ` • NIK ${member.nik}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {member.status === "pending" && (
            <MemberApprovalButton
              memberId={member.id}
              onSuccess={() => setMember({ ...member, status: "active" })}
            />
          )}
          <Link href={`/dashboard/members/${member.id}/edit`}>
            <Button type="primary" icon={<EditOutlined />}>
              Ubah
            </Button>
          </Link>
        </div>
      </div>

      <Card title="Data Anggota">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Nomor Anggota">
            <span className="font-mono">{member.member_number || "-"}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Barcode POS">
            <span className="font-mono">{member.barcode || "-"}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Batas Belanja (POS)">
            {member.purchase_limit != null ? formatCurrency(member.purchase_limit) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Batas Pemesanan">
            {member.order_limit != null ? formatCurrency(member.order_limit) : "Tidak ada batas"}
          </Descriptions.Item>
          <Descriptions.Item label="NIK">
            <span className="font-mono">{member.nik || "-"}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Nama Lengkap">{member.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{member.email || "-"}</Descriptions.Item>
          <Descriptions.Item label="Telepon">{member.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label="Jabatan">{member.job_title || "-"}</Descriptions.Item>
          <Descriptions.Item label="Status">{getStatusLabel(member.status)}</Descriptions.Item>
          <Descriptions.Item label="Proyek">
            {member.project_name
              ? `${member.project_code || ""} - ${member.project_name}`.trim()
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Departemen">
            {member.department_name
              ? `${member.department_code || ""} - ${member.department_name}`.trim()
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tanggal Bergabung" span={2}>
            {member.joined_date
              ? new Date(member.joined_date).toLocaleDateString("id-ID")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Alamat" span={2}>
            {member.address || "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <WalletOutlined className="mr-2" />
                Simpanan
              </span>
            }
            extra={
              <Link href="/dashboard/savings">
                <Button type="link" size="small">
                  Ke Simpanan
                </Button>
              </Link>
            }
            loading={savingsLoading}
          >
            {savings.length > 0 ? (
              <>
                <Statistic
                  title="Total Saldo"
                  value={totalSavings}
                  formatter={(v) => formatCurrency(Number(v))}
                  className="mb-4"
                />
                <Table
                  dataSource={savings}
                  columns={savingsColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </>
            ) : (
              <p className="text-muted-foreground mb-0">Belum ada rekening simpanan</p>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <CreditCardOutlined className="mr-2" />
                Pinjaman
              </span>
            }
            extra={
              <Link href="/dashboard/loans">
                <Button type="link" size="small">
                  Ke Pinjaman
                </Button>
              </Link>
            }
            loading={loansLoading}
          >
            {loans.length > 0 ? (
              <Table
                dataSource={loans}
                columns={loanColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <p className="text-muted-foreground mb-0">Belum ada pinjaman</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
