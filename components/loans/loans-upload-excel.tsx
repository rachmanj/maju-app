"use client";

import { useState } from "react";
import { Button, Modal, Upload, App, Table } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

interface UploadResult {
  row: number;
  status: "success" | "error";
  message?: string;
  loanNumber?: string;
}

export function LoansUploadExcel() {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    failedCount: number;
    results: UploadResult[];
  } | null>(null);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    if (!(file instanceof File)) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/loans/upload", {
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
      title: "No. Pinjaman",
      dataIndex: "loanNumber",
      key: "loanNumber",
      render: (v: string) => v ?? "-",
    },
    { title: "Pesan", dataIndex: "message", key: "message", render: (v: string) => v ?? "-" },
  ];

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={() => setModalOpen(true)}>
        Upload Excel
      </Button>
      <Modal
        title="Upload Pinjaman (Opening Balance / Migrasi)"
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
            Import pinjaman opening balance atau migrasi dari sistem lama. Kolom wajib:{" "}
            <strong>nomor anggota</strong>, <strong>pokok</strong>, <strong>tenor</strong>. Opsional: sisa pokok,
            angsuran terakhir dibayar (Mode B), bunga persen, metode bunga (flat/flat_total/manual), tanggal cair,
            angsuran per bulan (untuk manual).
          </p>
          <div className="flex gap-2 mb-2">
            <Button
              icon={<DownloadOutlined />}
              href="/api/loans/upload/template"
              download="template_pinjaman.xlsx"
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
