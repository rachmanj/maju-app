"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  DatePicker,
  Select,
  Space,
  Typography,
  message,
  Modal,
  Descriptions,
  Spin,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileExcelOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import dayjs, { Dayjs } from "dayjs";

type TxRow = {
  id: number;
  transaction_number: string;
  transaction_date: string;
  member_id: number;
  member_number: string | null;
  member_name: string;
  warehouse_code: string;
  warehouse_name: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_methods: string;
};

type TxDetail = TxRow & {
  warehouse_code: string;
  notes: string | null;
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
};

export default function PosLaporanTransaksiPage() {
  const { data: session } = useSession();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const canManagePos = hasPermission(roles, PERMISSIONS.POS_DELETE);

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [memberId, setMemberId] = useState<number | undefined>(undefined);
  const [members, setMembers] = useState<{ id: number; label: string }[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [data, setData] = useState<TxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TxDetail | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMembers = useCallback(async (q: string) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/members?limit=50&search=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const json = await res.json();
      const list = json.members ?? json.data ?? [];
      setMembers(
        (Array.isArray(list) ? list : []).map((m: { id: number; name: string; member_number?: string | null }) => ({
          id: Number(m.id),
          label: `${m.member_number ? `${m.member_number} — ` : ""}${m.name}`,
        }))
      );
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchMembers(memberSearch), 300);
    return () => clearTimeout(t);
  }, [memberSearch, fetchMembers]);

  useEffect(() => {
    const [from, to] = range;
    if (!from || !to) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          fromDate: from.format("YYYY-MM-DD"),
          toDate: to.format("YYYY-MM-DD"),
        });
        if (memberId != null) params.set("memberId", String(memberId));
        const res = await fetch(`/api/pos/transactions?${params}`);
        if (!res.ok) throw new Error("Gagal memuat data");
        const json = await res.json();
        const rows = (json.transactions ?? []).map(
          (r: TxRow & { transaction_date: string | Date }) => ({
            ...r,
            transaction_date:
              typeof r.transaction_date === "string"
                ? r.transaction_date
                : new Date(r.transaction_date).toISOString(),
          })
        );
        if (!cancelled) {
          setData(rows);
          setTotal(json.total ?? 0);
        }
      } catch (e: unknown) {
        if (!cancelled) message.error(e instanceof Error ? e.message : "Gagal memuat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, memberId, page, pageSize, refreshKey]);

  const handleExport = () => {
    const [from, to] = range;
    if (!from || !to) {
      message.warning("Pilih rentang tanggal");
      return;
    }
    const params = new URLSearchParams({
      fromDate: from.format("YYYY-MM-DD"),
      toDate: to.format("YYYY-MM-DD"),
    });
    if (memberId != null) params.set("memberId", String(memberId));
    window.open(`/api/pos/transactions/export?${params}`, "_blank");
  };

  const openDetail = async (transactionId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/pos/transactions/${transactionId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Gagal memuat detail transaksi");
      }
      setDetail(await res.json());
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Gagal memuat detail transaksi");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = (record: TxRow) => {
    Modal.confirm({
      title: "Hapus transaksi POS?",
      content: (
        <div>
          <p>
            Transaksi <strong>{record.transaction_number}</strong> ({record.member_name}) akan dihapus
            permanen.
          </p>
          <p className="mb-0 text-sm text-muted-foreground">
            Stok barang akan dikembalikan. Piutang, simpanan, dan jurnal terkait akan dibatalkan.
          </p>
        </div>
      ),
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        setDeletingId(record.id);
        try {
          const res = await fetch(`/api/pos/transactions/${record.id}`, { method: "DELETE" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || "Gagal menghapus transaksi");
          message.success("Transaksi berhasil dihapus");
          setRefreshKey((k) => k + 1);
        } catch (e: unknown) {
          message.error(e instanceof Error ? e.message : "Gagal menghapus transaksi");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const itemColumns: ColumnsType<TxDetail["items"][number]> = [
    { title: "Kode", dataIndex: "product_code", key: "product_code", width: 100 },
    { title: "Produk", dataIndex: "product_name", key: "product_name" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code", width: 80 },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v: number) => fmtMoney(v),
    },
    {
      title: "Subtotal",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v: number) => fmtMoney(v),
    },
  ];

  const columns: ColumnsType<TxRow> = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      width: 170,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
    { title: "No. Transaksi", dataIndex: "transaction_number", width: 140 },
    { title: "No. Anggota", dataIndex: "member_number", width: 120, render: (v) => v ?? "—" },
    { title: "Nama Anggota", dataIndex: "member_name", ellipsis: true },
    { title: "Gudang", dataIndex: "warehouse_name", width: 140, ellipsis: true },
    { title: "Subtotal", dataIndex: "subtotal", align: "right", width: 120, render: (v: number) => fmtMoney(v) },
    { title: "Diskon", dataIndex: "discount_amount", align: "right", width: 100, render: (v: number) => fmtMoney(v) },
    { title: "Total", dataIndex: "total_amount", align: "right", width: 120, render: (v: number) => fmtMoney(v) },
    { title: "Pembayaran", dataIndex: "payment_methods", width: 140 },
    ...(canManagePos
      ? [
          {
            title: "Aksi",
            key: "action",
            width: 100,
            fixed: "right" as const,
            render: (_: unknown, record: TxRow) => (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  title="Lihat detail"
                  onClick={() => openDetail(record.id)}
                />
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  title="Hapus transaksi"
                  loading={deletingId === record.id}
                  onClick={() => handleDelete(record)}
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <Typography.Title level={3} className="mb-1!">
          Laporan Transaksi POS
        </Typography.Title>
        <Typography.Text type="secondary">
          Filter berdasarkan tanggal dan anggota. Ekspor ke Excel berisi ringkasan transaksi dan detail barang per baris.
        </Typography.Text>
      </div>

      <Card>
        <Space wrap className="mb-4 w-full" size="middle" align="start">
          <div>
            <div className="mb-1 text-sm text-muted-foreground">Periode</div>
            <DatePicker.RangePicker
              value={range[0] && range[1] ? [range[0], range[1]] : null}
              onChange={(d) => {
                setRange(d ? [d[0], d[1]] : [null, null]);
                setPage(1);
              }}
              format="DD/MM/YYYY"
              allowClear={false}
            />
          </div>
          <div className="min-w-[260px]">
            <div className="mb-1 text-sm text-muted-foreground">Anggota (opsional)</div>
            <Select
              showSearch
              allowClear
              placeholder="Semua anggota"
              optionFilterProp="label"
              loading={loadingMembers}
              onSearch={setMemberSearch}
              onClear={() => {
                setMemberId(undefined);
                setPage(1);
              }}
              value={memberId}
              onChange={(v) => {
                setMemberId(v ?? undefined);
                setPage(1);
              }}
              options={members.map((m) => ({ value: m.id, label: m.label }))}
              filterOption={false}
              style={{ width: "100%" }}
            />
          </div>
          <div className="pt-6">
            <Button icon={<FileExcelOutlined />} onClick={handleExport}>
              Ekspor Excel
            </Button>
          </div>
        </Space>

        <Table<TxRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: canManagePos ? 1200 : 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} transaksi`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps ?? 20);
            },
          }}
        />
      </Card>

      <Modal
        title={detail?.transaction_number ?? "Detail Transaksi POS"}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        footer={null}
        width={800}
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
              <Descriptions.Item label="Tanggal">
                {detail.transaction_date
                  ? new Date(detail.transaction_date).toLocaleString("id-ID")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Anggota">
                {detail.member_number ? `${detail.member_number} — ` : ""}
                {detail.member_name}
              </Descriptions.Item>
              <Descriptions.Item label="Gudang">
                {detail.warehouse_code} — {detail.warehouse_name}
              </Descriptions.Item>
              <Descriptions.Item label="Pembayaran">{detail.payment_methods}</Descriptions.Item>
              <Descriptions.Item label="Subtotal">{fmtMoney(detail.subtotal)}</Descriptions.Item>
              <Descriptions.Item label="Diskon">{fmtMoney(detail.discount_amount)}</Descriptions.Item>
              <Descriptions.Item label="Total">{fmtMoney(detail.total_amount)}</Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="id"
              columns={itemColumns}
              dataSource={detail.items}
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
