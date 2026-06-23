"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Upload, App, Table, Select } from "antd";
import { UploadOutlined, DownloadOutlined, DeleteOutlined, MinusCircleOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

interface CreditAccount {
  id: number;
  code: string;
  name: string;
}

interface UploadResult {
  row: number;
  status: "success" | "error";
  message?: string;
}

interface Batch {
  id: number;
  filename: string | null;
  transactionCount: number;
  successCount: number;
  failedCount: number;
  uploadedAt: string;
  actualTransactionCount: number;
}

export function SavingsReduceSukarelaExcel() {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);
  const [creditAccountId, setCreditAccountId] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<{
    successCount: number;
    failedCount: number;
    results: UploadResult[];
  } | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/savings/batches?type=sukarela_reduction");
      const data = await res.json();
      if (res.ok) setBatches(data.batches ?? []);
    } catch {
      setBatches([]);
    }
  }, []);

  const fetchCreditAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/savings/debit-accounts");
      const data = await res.json();
      if (res.ok) setCreditAccounts(data ?? []);
    } catch {
      setCreditAccounts([]);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) {
      fetchBatches();
      fetchCreditAccounts();
    }
  }, [modalOpen, fetchBatches, fetchCreditAccounts]);

  const handleDeleteBatch = (batch: Batch) => {
    Modal.confirm({
      title: "Hapus Batch Ini?",
      content: `Batch "${batch.filename ?? "Upload"}" (${batch.actualTransactionCount} transaksi) akan dihapus. Saldo rekening akan disesuaikan. Tindakan ini tidak dapat dibatalkan.`,
      okText: "Ya, Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        setDeletingBatchId(batch.id);
        try {
          const res = await fetch(`/api/savings/batches/${batch.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal menghapus batch");
          message.success(data.message ?? "Batch telah dihapus");
          fetchBatches();
          setResult(null);
        } catch (e) {
          message.error((e as Error).message);
        } finally {
          setDeletingBatchId(null);
        }
      },
    });
  };

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    if (!(file instanceof File)) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (creditAccountId != null) {
        formData.append("credit_account_id", String(creditAccountId));
      }
      const res = await fetch("/api/savings/sukarela-reduction/upload", {
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
      fetchBatches();
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
    { title: "Pesan", dataIndex: "message", key: "message", render: (v: string) => v ?? "-" },
  ];

  return (
    <>
      <Button icon={<MinusCircleOutlined />} onClick={() => setModalOpen(true)}>
        Pengurangan Sukarela (Excel)
      </Button>
      <Modal
        title="Pengurangan Simpanan Sukarela (Excel)"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setResult(null);
        }}
        footer={null}
        width={700}
      >
        <div className="space-y-4">
          {batches.length > 0 && (
            <div>
              <p className="font-medium mb-2">Batch Upload</p>
              <Table
                size="small"
                dataSource={batches}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: "File",
                    dataIndex: "filename",
                    key: "filename",
                    render: (v: string) => v ?? "-",
                  },
                  {
                    title: "Tanggal",
                    dataIndex: "uploadedAt",
                    key: "uploadedAt",
                    render: (v: string) => (v ? new Date(v).toLocaleString("id-ID") : "-"),
                  },
                  {
                    title: "Transaksi",
                    key: "tx",
                    render: (_: unknown, r: Batch) => `${r.actualTransactionCount} (${r.successCount} berhasil)`,
                  },
                  {
                    title: "",
                    key: "action",
                    width: 80,
                    render: (_: unknown, r: Batch) => (
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deletingBatchId === r.id}
                        onClick={() => handleDeleteBatch(r)}
                      >
                        Hapus
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Format Excel: Baris pertama header. Kolom wajib: <strong>nomor anggota</strong>,{" "}
            <strong>amount</strong>. Opsional: <strong>tanggal transaksi</strong>.
            Satu anggota boleh muncul di banyak baris; setiap baris diproses berurutan sebagai pengurangan terpisah.
            Pengurangan per baris dilakukan dari Simpanan Sukarela Reguler terlebih dahulu, kemudian Simpanan Sukarela SHU
            jika masih ada sisa.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Akun Kas/Bank (Kredit)</label>
            <Select
              className="w-full"
              placeholder="Pilih akun Kas atau Bank (default: Kas di Kasir)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={creditAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }))}
              value={creditAccountId}
              onChange={(v) => setCreditAccountId(v ?? undefined)}
            />
          </div>
          <div className="flex gap-2 mb-2">
            <Button
              icon={<DownloadOutlined />}
              href="/api/savings/sukarela-reduction/template"
              download="template_pengurangan_sukarela.xlsx"
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
