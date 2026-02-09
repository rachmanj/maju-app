"use client";

import { useState } from "react";
import { Card, Button, Table, Tabs, Input } from "antd";
import { format } from "date-fns";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtCur = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function DailyReportsPage() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState("pos");
  const [posData, setPosData] = useState<any>(null);
  const [cashData, setCashData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (type: "pos" | "cash" | "stock") => {
    setLoading(true);
    try {
      const base = "/api/reports/daily";
      const url = type === "pos" ? `${base}/pos-sales` : type === "cash" ? `${base}/cash` : `${base}/stock-movements`;
      const res = await fetch(`${url}?date=${date}`);
      const data = await res.json();
      if (res.ok) {
        if (type === "pos") setPosData(data);
        else if (type === "cash") setCashData(data);
        else setStockData(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Laporan Harian</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">POS, Kas, dan Mutasi Stok per tanggal</p>
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm">Tanggal</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button type="primary" onClick={() => loadReport(activeTab as any)} loading={loading}>
            Tampilkan
          </Button>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k); if (k === "pos" && !posData) loadReport("pos"); else if (k === "cash" && !cashData) loadReport("cash"); else if (k === "stock" && !stockData) loadReport("stock"); }}
          items={[
            {
              key: "pos",
              label: "Penjualan POS",
              children: (
                <div className="space-y-4">
                  {posData && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Jumlah Transaksi</p>
                          <p className="text-xl font-semibold">{posData.transactionCount}</p>
                        </div>
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Penjualan</p>
                          <p className="text-xl font-semibold">{fmtCur(posData.totalAmount)}</p>
                        </div>
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Per Metode Bayar</p>
                          <ul className="mt-1 text-sm">
                            {posData.byPaymentMethod?.map((m: any) => (
                              <li key={m.method}>{m.method}: {fmtCur(m.amount)} ({m.count})</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Table
                        size="small"
                        rowKey="transaction_number"
                        dataSource={posData.items ?? []}
                        columns={[
                          { title: "No. Transaksi", dataIndex: "transaction_number", width: 140 },
                          { title: "Anggota", dataIndex: "member_name" },
                          { title: "Total", dataIndex: "total_amount", align: "right", render: fmtCur },
                          { title: "Pembayaran", dataIndex: "payment_methods" },
                        ]}
                        pagination={false}
                      />
                    </>
                  )}
                  {!posData && !loading && <p className="text-[hsl(var(--muted-foreground))]">Pilih tanggal dan klik Tampilkan.</p>}
                </div>
              ),
            },
            {
              key: "cash",
              label: "Kas Harian",
              children: (
                <div className="space-y-4">
                  {cashData && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Kas (POS Cash)</p>
                          <p className="text-xl font-semibold">{fmtCur(cashData.posCash)}</p>
                        </div>
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Per Metode</p>
                          <ul className="mt-1 text-sm">
                            {cashData.paymentBreakdown?.map((m: any) => (
                              <li key={m.method}>{m.method}: {fmtCur(m.amount)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </>
                  )}
                  {!cashData && !loading && <p className="text-[hsl(var(--muted-foreground))]">Pilih tanggal dan klik Tampilkan.</p>}
                </div>
              ),
            },
            {
              key: "stock",
              label: "Mutasi Stok",
              children: (
                <div className="space-y-4">
                  {stockData && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Jumlah Mutasi</p>
                          <p className="text-xl font-semibold">{stockData.totalMovements}</p>
                        </div>
                        <div className="rounded border p-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Per Jenis</p>
                          <ul className="mt-1 text-sm">
                            {stockData.byType?.map((t: any) => (
                              <li key={t.movement_type}>{t.movement_type}: {t.count}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Table
                        size="small"
                        rowKey="movement_number"
                        dataSource={stockData.items ?? []}
                        columns={[
                          { title: "No. Mutasi", dataIndex: "movement_number", width: 120 },
                          { title: "Jenis", dataIndex: "movement_type", width: 100 },
                          { title: "Gudang", dataIndex: "warehouse_name" },
                          { title: "Produk", dataIndex: "product_name" },
                          { title: "Qty", dataIndex: "quantity", align: "right", width: 80 },
                          { title: "Satuan", dataIndex: "unit_code", width: 80 },
                        ]}
                        pagination={{ pageSize: 15 }}
                      />
                    </>
                  )}
                  {!stockData && !loading && <p className="text-[hsl(var(--muted-foreground))]">Pilih tanggal dan klik Tampilkan.</p>}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
