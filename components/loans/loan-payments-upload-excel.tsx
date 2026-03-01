"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button, Modal, Upload, App, Table, Select } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

interface DebitAccount {
  id: number;
  code: string;
  name: string;
}

interface UploadResult {
  row: number;
  status: "success" | "error";
  message?: string;
  paymentNumber?: string;
}

export function LoanPaymentsUploadExcel() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const canUpload = hasPermission(roles, PERMISSIONS.LOAN_PAYMENT);

  if (!canUpload) return null;
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);
  const [debitAccountId, setDebitAccountId] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<{
    successCount: number;
    failedCount: number;
    results: UploadResult[];
  } | null>(null);

  const fetchDebitAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/loans/payments/debit-accounts");
      const data = await res.json();
      if (res.ok) setDebitAccounts(data ?? []);
    } catch {
      setDebitAccounts([]);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) fetchDebitAccounts();
  }, [modalOpen, fetchDebitAccounts]);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    if (!(file instanceof File)) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (debitAccountId != null) {
        formData.append("debit_account_id", String(debitAccountId));
      }
      const res = await fetch("/api/loans/payments/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      setResult({
        successCount: data.successCount ?? 0,
        failedCount: data.failedCount ?? 0,
        results: data.results ?? [],
      });
      message.success(data.message ?? "Import selesai");
      onSuccess?.(data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("loans-refresh"));
      }
    } catch (e) {
      message.error((e as Error).message);
      onError?.(e as Error);
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    { title: "Baris", dataIndex: "row", key: "row", width: 80 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => (s === "success" ? "Berhasil" : "Gagal"),
    },
    {
      title: "No. Pembayaran",
      dataIndex: "paymentNumber",
      key: "paymentNumber",
      render: (v: string) => v ?? "-",
    },
    { title: "Pesan", dataIndex: "message", key: "message", render: (v: string) => v ?? "-" },
  ];

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={() => setModalOpen(true)}>
        Upload Pembayaran
      </Button>
      <Modal
        title="Upload Pembayaran Pinjaman (Excel)"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setResult(null);
        }}
        footer={null}
        width={700}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import pembayaran angsuran pinjaman via Excel. Kolom wajib: <strong>no pinjaman</strong>,{" "}
            <strong>angsuran ke</strong>, <strong>tanggal pembayaran</strong>. Opsional: jumlah pembayaran (default:
            sisa angsuran), metode pembayaran (cash/transfer/savings/salary_deduction), referensi, catatan.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Akun Debit (Kas/Bank)</label>
            <Select
              className="w-full"
              placeholder="Pilih akun Kas atau Bank untuk jurnal"
              allowClear
              showSearch
              optionFilterProp="label"
              options={debitAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }))}
              value={debitAccountId}
              onChange={(v) => setDebitAccountId(v ?? undefined)}
            />
          </div>
          <div className="flex gap-2 mb-2">
            <Button
              icon={<DownloadOutlined />}
              href="/api/loans/payments/upload/template"
              download="template_pembayaran_pinjaman.xlsx"
              target="_blank"
            >
              Unduh Template
            </Button>
          </div>
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls"
            maxCount={1}
            customRequest={handleUpload}
            disabled={uploading}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 48 }} />
            </p>
            <p className="ant-upload-text">Klik atau seret file Excel ke sini</p>
            <p className="ant-upload-hint">.xlsx atau .xls</p>
          </Upload.Dragger>
          {uploading && <p className="text-sm">Memproses...</p>}
          {result && (
            <div className="mt-4">
              <p className="font-medium">
                {result.successCount} berhasil, {result.failedCount} gagal
              </p>
              {result.results.length > 0 && (
                <Table
                  size="small"
                  columns={columns}
                  dataSource={result.results.filter((r) => r.status === "error")}
                  rowKey="row"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: "Semua baris berhasil diproses" }}
                />
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
