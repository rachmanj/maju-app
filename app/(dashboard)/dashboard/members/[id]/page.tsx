"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Descriptions, Button, Spin, App, Table, Badge, Row, Col, Statistic, Modal } from "antd";
import { ArrowLeftOutlined, EditOutlined, WalletOutlined, CreditCardOutlined, EyeOutlined, ShoppingOutlined } from "@ant-design/icons";
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

interface PosTransaction {
  id: number;
  transaction_number: string;
  transaction_date: string;
  warehouse_name: string;
  total_amount: number;
  payment_methods: string;
}

interface PosDetail {
  id: number;
  transaction_number: string;
  transaction_date: string;
  warehouse_name: string;
  warehouse_code: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  payment_methods: string;
  items: {
    id: number;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_code: string;
    unit_price: number;
    discount_amount: number;
    total_amount: number;
  }[];
  payments: { payment_method: string; amount: number }[];
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
  const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
  const [posTotal, setPosTotal] = useState(0);
  const [posPage, setPosPage] = useState(1);
  const [posLoading, setPosLoading] = useState(false);
  const [posDetail, setPosDetail] = useState<PosDetail | null>(null);
  const [posDetailLoading, setPosDetailLoading] = useState(false);
  const [posDetailOpen, setPosDetailOpen] = useState(false);

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

  const fetchPosTransactions = useCallback(async (memberId: number, page = 1) => {
    setPosLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/pos-transactions?page=${page}&limit=10`);
      if (!res.ok) {
        setPosTransactions([]);
        setPosTotal(0);
        return;
      }
      const data = await res.json();
      setPosTransactions(data.transactions || []);
      setPosTotal(data.total || 0);
    } catch {
      setPosTransactions([]);
      setPosTotal(0);
    } finally {
      setPosLoading(false);
    }
  }, []);

  const openPosDetail = async (memberId: number, transactionId: number) => {
    setPosDetailOpen(true);
    setPosDetailLoading(true);
    setPosDetail(null);
    try {
      const res = await fetch(`/api/members/${memberId}/pos-transactions/${transactionId}`);
      if (res.ok) {
        setPosDetail(await res.json());
      }
    } finally {
      setPosDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  useEffect(() => {
    if (member?.id) {
      fetchSavingsAndLoans(member.id);
      fetchPosTransactions(member.id, posPage);
    }
  }, [member?.id, posPage, fetchSavingsAndLoans, fetchPosTransactions]);

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

  const posColumns: ColumnsType<PosTransaction> = [
    {
      title: "No. Transaksi",
      dataIndex: "transaction_number",
      key: "transaction_number",
      render: (v) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (v) => (v ? new Date(v).toLocaleString("id-ID") : "-"),
    },
    { title: "Gudang", dataIndex: "warehouse_name", key: "warehouse_name" },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v) => formatCurrency(Number(v)),
    },
    { title: "Pembayaran", dataIndex: "payment_methods", key: "payment_methods" },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => member && openPosDetail(member.id, record.id)}
        />
      ),
    },
  ];

  const posItemColumns: ColumnsType<PosDetail["items"][number]> = [
    { title: "Kode", dataIndex: "product_code", key: "product_code", width: 100 },
    { title: "Produk", dataIndex: "product_name", key: "product_name" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code", width: 80 },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v) => formatCurrency(Number(v)),
    },
    {
      title: "Subtotal",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v) => formatCurrency(Number(v)),
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

      <Card
        title={
          <span>
            <ShoppingOutlined className="mr-2" />
            Transaksi POS
          </span>
        }
        extra={
          <Link href="/dashboard/pos/laporan-transaksi">
            <Button type="link" size="small">
              Laporan POS
            </Button>
          </Link>
        }
        loading={posLoading}
      >
        {posTransactions.length > 0 ? (
          <Table
            dataSource={posTransactions}
            columns={posColumns}
            rowKey="id"
            size="small"
            pagination={{
              current: posPage,
              pageSize: 10,
              total: posTotal,
              onChange: setPosPage,
              showSizeChanger: false,
            }}
          />
        ) : (
          <p className="text-muted-foreground mb-0">Belum ada transaksi POS</p>
        )}
      </Card>

      <Modal
        title={posDetail?.transaction_number ?? "Detail Transaksi POS"}
        open={posDetailOpen}
        onCancel={() => {
          setPosDetailOpen(false);
          setPosDetail(null);
        }}
        footer={null}
        width={800}
      >
        {posDetailLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : posDetail ? (
          <div className="space-y-4">
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
              <Descriptions.Item label="Tanggal">
                {posDetail.transaction_date
                  ? new Date(posDetail.transaction_date).toLocaleString("id-ID")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Gudang">
                {posDetail.warehouse_code} — {posDetail.warehouse_name}
              </Descriptions.Item>
              <Descriptions.Item label="Subtotal">{formatCurrency(posDetail.subtotal)}</Descriptions.Item>
              <Descriptions.Item label="Diskon">{formatCurrency(posDetail.discount_amount)}</Descriptions.Item>
              <Descriptions.Item label="Total">{formatCurrency(posDetail.total_amount)}</Descriptions.Item>
              <Descriptions.Item label="Pembayaran">{posDetail.payment_methods}</Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="id"
              columns={posItemColumns}
              dataSource={posDetail.items}
              pagination={false}
              size="small"
              locale={{ emptyText: "Tidak ada barang" }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground">Transaksi tidak ditemukan</p>
        )}
      </Modal>
    </div>
  );
}
