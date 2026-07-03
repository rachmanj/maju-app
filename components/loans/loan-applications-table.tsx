"use client";

import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, InputNumber, Input, App, Radio, Space } from "antd";
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
    form.setFieldsValue({
      interest_method: "flat_total",
      interest_rate: 12.6,
      monthly_amount: undefined,
    });
    setApproveModalOpen(true);
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        interest_method: values.interest_method,
        disbursed_date: undefined,
      };
      if (values.interest_method === "manual") {
        body.monthly_amount = values.monthly_amount;
      } else {
        body.interest_rate = values.interest_rate;
      }
      const r = await fetch(`/api/loans/applications/${approvingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="interest_method" label="Metode Perhitungan">
            <Radio.Group>
              <Radio value="flat_total">Flat (Total) — Bunga % untuk seluruh tenor</Radio>
              <Radio value="flat">Flat (Tahunan) — Bunga % per tahun</Radio>
              <Radio value="manual">Manual — Input angsuran per bulan</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.interest_method !== curr.interest_method}>
            {({ getFieldValue }) =>
              getFieldValue("interest_method") !== "manual" ? (
                <Form.Item
                  label={getFieldValue("interest_method") === "flat" ? "Bunga (% per tahun)" : "Bunga (% total untuk seluruh tenor)"}
                  required
                >
                  <Space.Compact block className="w-full">
                    <Form.Item
                      name="interest_rate"
                      noStyle
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
                      <InputNumber className="w-full" min={0} max={100} step={0.1} style={{ width: "100%" }} />
                    </Form.Item>
                    <Input style={{ width: 48 }} defaultValue="%" disabled />
                  </Space.Compact>
                </Form.Item>
              ) : (
                <Form.Item
                  name="monthly_amount"
                  label="Angsuran per bulan (Rp)"
                  rules={[
                    { required: true, message: "Angsuran per bulan wajib diisi" },
                    {
                      validator: (_, v) => {
                        if (v != null && v <= 0) return Promise.reject(new Error("Angsuran harus > 0"));
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <InputNumber
                    className="w-full"
                    min={1}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={((v: string | undefined) => Number(String(v ?? "").replace(/,/g, "")) || 0) as any}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
