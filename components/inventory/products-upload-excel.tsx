"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Upload, App, Table } from "antd";
import { UploadOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

interface UploadResult {
  row: number;
  status: "success" | "error";
  message?: string;
}

interface Batch {
  id: number;
  filename: string | null;
  productCount: number;
  successCount: number;
  failedCount: number;
  uploadedAt: string;
  actualProductCount: number;
}

export function ProductsUploadExcel() {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [result, setResult] = useState<{
    successCount: number;
    failedCount: number;
    results: UploadResult[];
  } | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/products/upload/batches");
      const data = await res.json();
      if (res.ok) setBatches(data.batches ?? []);
    } catch {
      setBatches([]);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) fetchBatches();
  }, [modalOpen, fetchBatches]);

  const handleDeleteBatch = (batch: Batch) => {
    Modal.confirm({
      title: "Batalkan Batch Ini?",
      content: `Batch "${batch.filename ?? "Upload"}" (${batch.actualProductCount} produk) akan dihapus. Produk dalam batch akan dinonaktifkan (soft delete). Tindakan ini tidak dapat dibatalkan.`,
      okText: "Ya, Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        setDeletingBatchId(batch.id);
        try {
          const res = await fetch(`/api/inventory/products/upload/batches/${batch.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal menghapus batch");
          message.success(data.message ?? "Batch telah dihapus");
          fetchBatches();
          setResult(null);
          window.dispatchEvent(new CustomEvent("products-refresh"));
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
      const res = await fetch("/api/inventory/products/upload", {
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
      window.dispatchEvent(new CustomEvent("products-refresh"));
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
      <Button icon={<UploadOutlined />} onClick={() => setModalOpen(true)}>
        Upload Excel
      </Button>
      <Modal
        title="Upload Data Produk (Excel)"
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
                    title: "Produk",
                    key: "products",
                    render: (_: unknown, r: Batch) => `${r.actualProductCount} (${r.successCount} berhasil)`,
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
            Format Excel: Baris pertama header. Kolom wajib: <strong>kode</strong>, <strong>nama</strong>,{" "}
            <strong>satuan</strong> (PCS, KG, dll). Opsional: kategori, barcode, deskripsi, min_stok, harga_jual.
          </p>
          <div className="flex gap-2 mb-2">
            <Button
              icon={<DownloadOutlined />}
              href="/api/inventory/products/upload/template"
              download="template_produk.xlsx"
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
