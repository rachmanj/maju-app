"use client";

import { useEffect, useState } from "react";
import { Card, Table, Select, DatePicker, Button, App } from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface MovementRow {
  id: number;
  movement_number: string;
  movement_type: string;
  warehouse_name: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_code: string;
  to_warehouse_name?: string;
  notes?: string;
  movement_date: string;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  in: "Masuk",
  out: "Keluar",
  transfer: "Transfer",
  adjustment: "Penyesuaian",
};

export default function StockMovementsPage() {
  const { message } = App.useApp();
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | undefined>();
  const [movementType, setMovementType] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/inventory/warehouses?all=true")
      .then((r) => (r.ok ? r.json() : []))
      .then(setWarehouses);
  }, []);

  const fetchMovements = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(warehouseId && { warehouse_id: warehouseId.toString() }),
      ...(movementType && { movement_type: movementType }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    });
    fetch(`/api/inventory/stock/movements?${params}`)
      .then((r) => (r.ok ? r.json() : { movements: [], total: 0 }))
      .then((data) => {
        setMovements(data.movements);
        setTotal(data.total);
      })
      .catch(() => message.error("Gagal memuat riwayat mutasi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMovements();
  }, [page, warehouseId, movementType, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, movementType, dateFrom, dateTo]);

  const columns: ColumnsType<MovementRow> = [
    { title: "No. Mutasi", dataIndex: "movement_number", key: "movement_number", render: (t) => <span className="font-mono text-xs">{t}</span> },
    { title: "Tanggal", dataIndex: "movement_date", key: "movement_date", render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
    { title: "Jenis", dataIndex: "movement_type", key: "movement_type", render: (t) => typeLabels[t] || t },
    { title: "Gudang", dataIndex: "warehouse_name", key: "warehouse_name" },
    { title: "Produk", key: "product", render: (_, r) => `${r.product_code} - ${r.product_name}` },
    { title: "Jumlah", dataIndex: "quantity", key: "quantity", align: "right", render: (q) => Number(q) },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code" },
    { title: "Gudang Tujuan", dataIndex: "to_warehouse_name", key: "to_warehouse_name", render: (t) => t || "-" },
    { title: "Keterangan", dataIndex: "notes", key: "notes", ellipsis: true, render: (t) => t || "-" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Riwayat Mutasi Stok</h1>
        <p className="text-muted-foreground">Daftar mutasi stok (masuk, keluar, transfer, penyesuaian)</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Select
            placeholder="Semua gudang"
            allowClear
            className="w-[200px]"
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
          />
          <Select
            placeholder="Semua jenis"
            allowClear
            className="w-[140px]"
            value={movementType}
            onChange={setMovementType}
            options={[
              { value: "in", label: "Masuk" },
              { value: "out", label: "Keluar" },
              { value: "transfer", label: "Transfer" },
              { value: "adjustment", label: "Penyesuaian" },
            ]}
          />
          <DatePicker.RangePicker
            allowClear
            onChange={(dates) => {
              if (!dates || dates.length !== 2) {
                setDateFrom(undefined);
                setDateTo(undefined);
                return;
              }
              setDateFrom(format(dates[0]!.toDate(), "yyyy-MM-dd"));
              setDateTo(format(dates[1]!.toDate(), "yyyy-MM-dd"));
            }}
          />
          <Button type="primary" onClick={fetchMovements}>
            Terapkan
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={movements}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showTotal: (t) => `Total ${t} mutasi`,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
