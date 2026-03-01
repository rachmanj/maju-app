"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Table,
  Spin,
  Button,
  Descriptions,
  Badge,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  App,
} from "antd";
import { ArrowLeftOutlined, DollarOutlined, DeleteOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import type { ColumnsType } from "antd/es/table";

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

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: session } = useSession();
  const id = params.id as string;
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const canDelete = hasPermission(roles, PERMISSIONS.LOAN_DELETE);
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [debitAccounts, setDebitAccounts] = useState<{ id: number; code: string; name: string }[]>([]);
  const [form] = Form.useForm();

  const fetchLoan = async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/loans/${id}`);
      if (!r.ok) {
        if (r.status === 404) {
          setLoan(null);
          return;
        }
        throw new Error("Gagal memuat data pinjaman");
      }
      const data = await r.json();
      setLoan(data);
    } catch {
      setLoan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoan();
  }, [id]);

  useEffect(() => {
    if (paymentModalOpen) {
      fetch("/api/loans/payments/debit-accounts")
        .then((r) => r.json())
        .then((data) => {
          const accounts = Array.isArray(data) ? data : [];
          setDebitAccounts(accounts);
          if (accounts.length > 0) {
            form.setFieldsValue({ debit_account_id: accounts[0].id });
          }
        })
        .catch(() => setDebitAccounts([]));
    }
  }, [paymentModalOpen, form]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const handleSubmitPayment = async (values: {
    payment_amount: number;
    principal_amount: number;
    interest_amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string;
    notes?: string;
    loan_schedule_id?: number;
    debit_account_id?: number;
  }) => {
    setPaymentSubmitting(true);
    try {
      const r = await fetch(`/api/loans/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_amount: values.payment_amount,
          principal_amount: values.principal_amount,
          interest_amount: values.interest_amount,
          payment_date: values.payment_date,
          payment_method: values.payment_method || "cash",
          reference_number: values.reference_number || undefined,
          notes: values.notes || undefined,
          loan_schedule_id: values.loan_schedule_id || undefined,
          debit_account_id: values.debit_account_id || undefined,
        }),
      });

      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Gagal mencatat pembayaran");
      }

      message.success("Pembayaran berhasil dicatat");
      setPaymentModalOpen(false);
      form.resetFields();
      fetchLoan();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Hapus Pinjaman?",
      content: `Pinjaman ${loan?.loan_number} beserta jadwal angsuran dan riwayat pembayaran akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          const r = await fetch(`/api/loans/${id}`, { method: "DELETE" });
          if (!r.ok) {
            const err = await r.json();
            throw new Error(err.error || "Gagal menghapus");
          }
          message.success("Pinjaman berhasil dihapus");
          router.push("/dashboard/loans");
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Terjadi kesalahan");
          throw err;
        }
      },
    });
  };

  const openPaymentModal = (schedule?: ScheduleRow) => {
    if (schedule) {
      const remaining = Number(schedule.installment_amount) - Number(schedule.paid_amount ?? 0);
      form.setFieldsValue({
        loan_schedule_id: schedule.id,
        payment_amount: remaining > 0 ? remaining : undefined,
        principal_amount: Number(schedule.principal_amount),
        interest_amount: Number(schedule.interest_amount),
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "cash",
        debit_account_id: undefined,
      });
    } else {
      form.setFieldsValue({
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "cash",
        debit_account_id: undefined,
      });
    }
    setPaymentModalOpen(true);
  };

  const scheduleColumns: ColumnsType<ScheduleRow> = [
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
    {
      title: "Aksi",
      key: "action",
      render: (_: unknown, record: ScheduleRow) =>
        record.status !== "paid" ? (
          <Button type="link" size="small" onClick={() => openPaymentModal(record)}>
            Bayar
          </Button>
        ) : null,
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
      <div className="space-y-6">
        <Link href="/dashboard/loans">
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
  const canPay = (loan.status === "active" || loan.status === "approved") && loan.schedules?.length > 0;
  const totalBunga = (loan.schedules || []).reduce((sum, s) => sum + Number(s.interest_amount ?? 0), 0);
  const totalPokok = loan.principal_amount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/loans">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pinjaman {loan.loan_number}</h1>
            <p className="text-muted-foreground">Detail pinjaman</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canPay && (
            <Button type="primary" icon={<DollarOutlined />} onClick={() => openPaymentModal()}>
              Catat Pembayaran
            </Button>
          )}
          {canDelete && (
            <Button type="primary" danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Hapus Pinjaman
            </Button>
          )}
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
          <Descriptions.Item label="Total Pokok">{formatRupiah(totalPokok)}</Descriptions.Item>
          <Descriptions.Item label="Total Bunga">{formatRupiah(totalBunga)}</Descriptions.Item>
          <Descriptions.Item label="Bunga">{loan.interest_rate}%</Descriptions.Item>
          <Descriptions.Item label="Tenor">{loan.term_months} bulan</Descriptions.Item>
          <Descriptions.Item label="Tanggal Disetujui">
            {loan.approved_date ? new Date(loan.approved_date).toLocaleDateString("id-ID") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tanggal Disbursement">
            {loan.disbursed_date ? new Date(loan.disbursed_date).toLocaleDateString("id-ID") : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Jadwal Angsuran">
        <Table
          rowKey="id"
          columns={scheduleColumns}
          dataSource={loan.schedules || []}
          pagination={false}
          locale={{ emptyText: "Tidak ada jadwal" }}
        />
      </Card>

      <Modal
        title="Catat Pembayaran"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitPayment}>
          <Form.Item name="loan_schedule_id" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item
            name="payment_amount"
            label="Jumlah Pembayaran (Rp)"
            rules={[{ required: true, message: "Jumlah wajib diisi" }]}
          >
            <InputNumber
              className="w-full"
              min={1}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={((v: string | undefined) => Number(String(v ?? "").replace(/,/g, "")) || 0) as any}
            />
          </Form.Item>
          <Form.Item
            name="principal_amount"
            label="Pokok (Rp)"
            rules={[{ required: true, message: "Pokok wajib diisi" }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={((v: string | undefined) => Number(String(v ?? "").replace(/,/g, "")) || 0) as any}
            />
          </Form.Item>
          <Form.Item
            name="interest_amount"
            label="Bunga (Rp)"
            rules={[{ required: true, message: "Bunga wajib diisi" }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={((v: string | undefined) => Number(String(v ?? "").replace(/,/g, "")) || 0) as any}
            />
          </Form.Item>
          <Form.Item
            name="payment_date"
            label="Tanggal Pembayaran"
            rules={[{ required: true, message: "Tanggal wajib diisi" }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item name="debit_account_id" label="Akun Debit (Kas/Bank)">
            <Select
              placeholder="Pilih akun Kas atau Bank (default: Kas)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={debitAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="payment_method" label="Metode Pembayaran">
            <Select
              options={[
                { value: "cash", label: "Tunai" },
                { value: "transfer", label: "Transfer" },
                { value: "savings", label: "Potong Simpanan" },
                { value: "salary_deduction", label: "Potong Gaji" },
              ]}
            />
          </Form.Item>
          <Form.Item name="reference_number" label="No. Referensi">
            <Input placeholder="Opsional" />
          </Form.Item>
          <Form.Item name="notes" label="Catatan">
            <Input.TextArea rows={2} placeholder="Opsional" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={paymentSubmitting}>
              Simpan Pembayaran
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
