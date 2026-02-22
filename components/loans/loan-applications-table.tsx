"use client";

import { useEffect, useState } from "react";
import { Button, Table, Badge, Modal, Form, InputNumber, App } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface Application {
  id: number;
  application_number: string;
  member_name: string;
  member_nik: string;
  requested_amount: number;
  requested_term_months: number;
  purpose: string | null;
  status: string | null;
  applied_at: string | null;
}

export function LoanApplicationsTable() {
  const { message } = App.useApp();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const r = await fetch("/api/loans/applications?status=pending&limit=50");
      if (!r.ok) throw new Error("Gagal memuat pengajuan");
      const data = await r.json();
      setApplications(data.applications || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const openApproveModal = (app: Application) => {
    setApprovingId(app.id);
    form.setFieldsValue({ interest_rate: 12 });
    setApproveModalOpen(true);
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const r = await fetch(`/api/loans/applications/${approvingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest_rate: values.interest_rate }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Gagal menyetujui");
      }
      message.success("Pinjaman berhasil disetujui");
      setApproveModalOpen(false);
      setApprovingId(null);
      form.resetFields();
      fetchApplications();
      window.dispatchEvent(new CustomEvent("loans-refresh"));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Application> = [
    {
      title: "No. Pengajuan",
      dataIndex: "application_number",
      key: "application_number",
      render: (t) => <span className="font-mono">{t}</span>,
    },
    {
      title: "Anggota",
      key: "member",
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.member_name}</div>
          <div className="text-sm text-muted-foreground">{r.member_nik}</div>
        </div>
      ),
    },
    {
      title: "Jumlah",
      dataIndex: "requested_amount",
      key: "requested_amount",
      render: (v) => formatCurrency(v),
    },
    {
      title: "Tenor",
      dataIndex: "requested_term_months",
      key: "requested_term_months",
      render: (m) => `${m} bulan`,
    },
    {
      title: "Tanggal",
      dataIndex: "applied_at",
      key: "applied_at",
      render: (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-"),
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => openApproveModal(record)}>
          Setujui
        </Button>
      ),
    },
  ];

  return (
    <>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={applications}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: "Tidak ada pengajuan menunggu" }}
      />
      <Modal
        title="Setujui Pengajuan Pinjaman"
        open={approveModalOpen}
        onCancel={() => { setApproveModalOpen(false); setApprovingId(null); }}
        onOk={handleApprove}
        confirmLoading={submitting}
        okText="Setujui & Disbursement"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="interest_rate"
            label="Bunga (% per tahun)"
            rules={[
              { required: true, message: "Bunga wajib diisi" },
              {
                validator: (_, v) => {
                  if (v != null && (v < 0 || v > 100)) return Promise.reject(new Error("Bunga 0–100%"));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber className="w-full" min={0} max={100} step={0.5} addonAfter="%" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
