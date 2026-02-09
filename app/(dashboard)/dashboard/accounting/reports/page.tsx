"use client";

import { useEffect, useState } from "react";
import { Card, Table, DatePicker, Select, Button, Tabs, Space } from "antd";
import { App } from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

export default function ReportsPage() {
  const { message } = App.useApp();
  const [coa, setCoa] = useState<{ id: number; code: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState("trial-balance");
  const [fromDate, setFromDate] = useState<string>(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [trialData, setTrialData] = useState<any[]>([]);
  const [glData, setGlData] = useState<any>(null);
  const [payrollData, setPayrollData] = useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [profitLossData, setProfitLossData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetch("/api/accounting/coa")
      .then((r) => r.json())
      .then(setCoa)
      .catch(() => message.error("Gagal memuat COA"));
  }, []);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accounting/reports/trial-balance?from_date=${fromDate}&to_date=${toDate}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTrialData(data.data || []);
    } catch {
      message.error("Gagal memuat Trial Balance");
    } finally {
      setLoading(false);
    }
  };

  const loadGeneralLedger = async () => {
    if (!accountId) {
      message.warning("Pilih akun terlebih dahulu");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accounting/reports/general-ledger?account_id=${accountId}&from_date=${fromDate}&to_date=${toDate}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setGlData(data);
    } catch {
      message.error("Gagal memuat Buku Besar");
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollDeduction = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accounting/reports/payroll-deduction?month=${month}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPayrollData(data);
    } catch {
      message.error("Gagal memuat Laporan Potongan Gaji");
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceSheet = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accounting/reports/balance-sheet?as_of_date=${asOfDate}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setBalanceSheetData(data);
    } catch {
      message.error("Gagal memuat Neraca");
    } finally {
      setLoading(false);
    }
  };

  const loadProfitLoss = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accounting/reports/profit-loss?from_date=${fromDate}&to_date=${toDate}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProfitLossData(data);
    } catch {
      message.error("Gagal memuat Laba Rugi");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
  const toDateStr = (d: any) =>
    d?.format?.("YYYY-MM-DD") ?? format(new Date(d?.toString() ?? ""), "yyyy-MM-dd");
  const toMonthStr = (d: any) =>
    d?.format?.("YYYY-MM") ?? format(new Date(d?.toString() ?? ""), "yyyy-MM");

  const trialColumns: ColumnsType<any> = [
    { title: "Kode", dataIndex: "code", key: "code", width: 100 },
    { title: "Nama Akun", dataIndex: "name", key: "name" },
    { title: "Debit", dataIndex: "debit", key: "debit", align: "right", render: fmt },
    { title: "Kredit", dataIndex: "credit", key: "credit", align: "right", render: fmt },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          Laporan Keuangan
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Trial Balance, Buku Besar, Neraca, Laba Rugi, Potongan Gaji
        </p>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "trial-balance",
              label: "Trial Balance",
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="mb-1 block text-sm">Dari Tanggal</label>
                      <DatePicker
                        onChange={(d) => d && setFromDate(toDateStr(d))}
                        format="DD/MM/YYYY"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Sampai Tanggal</label>
                      <DatePicker
                        onChange={(d) => d && setToDate(toDateStr(d))}
                        format="DD/MM/YYYY"
                      />
                    </div>
                    <Button type="primary" onClick={loadTrialBalance} loading={loading}>
                      Tampilkan
                    </Button>
                  </div>
                  <Table
                    columns={trialColumns}
                    dataSource={trialData}
                    rowKey="account_id"
                    loading={loading}
                    pagination={false}
                    size="small"
                    summary={() => {
                      const tD = trialData.reduce((s, r) => s + (r.debit || 0), 0);
                      const tC = trialData.reduce((s, r) => s + (r.credit || 0), 0);
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2} align="right">
                              <strong>Total</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              {fmt(tD)}
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              {fmt(tC)}
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </div>
              ),
            },
            {
              key: "general-ledger",
              label: "Buku Besar",
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[250px]">
                      <label className="mb-1 block text-sm">Akun</label>
                      <Select
                        placeholder="Pilih akun"
                        className="w-full"
                        showSearch
                        optionFilterProp="label"
                        value={accountId}
                        onChange={setAccountId}
                        options={coa.map((a) => ({
                          value: a.id,
                          label: `${a.code} - ${a.name}`,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Dari - Sampai</label>
                      <Space>
                        <DatePicker
                          format="DD/MM/YYYY"
                          onChange={(d) => d && setFromDate(toDateStr(d))}
                        />
                        <DatePicker
                          format="DD/MM/YYYY"
                          onChange={(d) => d && setToDate(toDateStr(d))}
                        />
                      </Space>
                    </div>
                    <Button type="primary" onClick={loadGeneralLedger} loading={loading}>
                      Tampilkan
                    </Button>
                  </div>
                  {glData && (
                    <>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        {glData.account?.code} - {glData.account?.name}
                      </div>
                      <Table
                        columns={[
                          { title: "No. Jurnal", dataIndex: "entry_number", key: "en", width: 120 },
                          { title: "Tanggal", dataIndex: "entry_date", key: "ed", width: 110, render: (d: string) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
                          { title: "Debit", dataIndex: "debit", key: "debit", align: "right", render: (v: number) => v > 0 ? fmt(v) : "-" },
                          { title: "Kredit", dataIndex: "credit", key: "credit", align: "right", render: (v: number) => v > 0 ? fmt(v) : "-" },
                          { title: "Saldo", dataIndex: "balance", key: "balance", align: "right", render: fmt },
                        ]}
                        dataSource={glData.lines || []}
                        rowKey={(_, i) => String(i)}
                        pagination={false}
                        size="small"
                      />
                      <div className="text-right text-sm font-medium">
                        Total Debit: {fmt(glData.totalDebit)} | Total Kredit: {fmt(glData.totalCredit)} | Saldo Akhir: {fmt(glData.balance)}
                      </div>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: "payroll-deduction",
              label: "Potongan Gaji",
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="mb-1 block text-sm">Bulan</label>
                      <DatePicker
                        picker="month"
                        format="MM/YYYY"
                        onChange={(d) => d && setMonth(toMonthStr(d))}
                      />
                    </div>
                    <Button type="primary" onClick={loadPayrollDeduction} loading={loading}>
                      Tampilkan
                    </Button>
                  </div>
                  {payrollData && (
                    <>
                      <Table
                        columns={[
                          { title: "NIK", dataIndex: "nik", key: "nik", width: 120 },
                          { title: "Nama", dataIndex: "name", key: "name" },
                          { title: "Simpanan Wajib", dataIndex: "simpanan_wajib", key: "sw", align: "right", render: fmt },
                          { title: "Angsuran Pinjaman", dataIndex: "loan_installment", key: "li", align: "right", render: fmt },
                          { title: "Total Potongan", dataIndex: "total", key: "total", align: "right", render: fmt },
                        ]}
                        dataSource={payrollData.members || []}
                        rowKey="member_id"
                        pagination={false}
                        size="small"
                      />
                      {payrollData.summary && (
                        <div className="mt-4 text-right text-sm font-medium">
                          Total Simpanan Wajib: {fmt(payrollData.summary.total_simpanan_wajib)} |
                          Total Angsuran: {fmt(payrollData.summary.total_loan_installment)} |
                          Total Potongan: {fmt(payrollData.summary.total)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ),
            },
            {
              key: "balance-sheet",
              label: "Neraca",
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="mb-1 block text-sm">Tanggal</label>
                      <DatePicker
                        format="DD/MM/YYYY"
                        onChange={(d) => d && setAsOfDate(toDateStr(d))}
                      />
                    </div>
                    <Button type="primary" onClick={loadBalanceSheet} loading={loading}>
                      Tampilkan
                    </Button>
                  </div>
                  {balanceSheetData && (
                    <>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div>
                          <h4 className="mb-2 font-medium">Aset</h4>
                          <Table
                            size="small"
                            dataSource={balanceSheetData.assets}
                            columns={[
                              { title: "Kode", dataIndex: "code", width: 80 },
                              { title: "Nama", dataIndex: "name" },
                              { title: "Jumlah", dataIndex: "amount", align: "right", render: fmt },
                            ]}
                            rowKey="code"
                            pagination={false}
                          />
                          <p className="mt-2 text-right font-medium">Total: {fmt(balanceSheetData.totalAssets)}</p>
                        </div>
                        <div>
                          <h4 className="mb-2 font-medium">Kewajiban</h4>
                          <Table
                            size="small"
                            dataSource={balanceSheetData.liabilities}
                            columns={[
                              { title: "Kode", dataIndex: "code", width: 80 },
                              { title: "Nama", dataIndex: "name" },
                              { title: "Jumlah", dataIndex: "amount", align: "right", render: fmt },
                            ]}
                            rowKey="code"
                            pagination={false}
                          />
                          <p className="mt-2 text-right font-medium">Total: {fmt(balanceSheetData.totalLiabilities)}</p>
                        </div>
                        <div>
                          <h4 className="mb-2 font-medium">Ekuitas</h4>
                          <Table
                            size="small"
                            dataSource={balanceSheetData.equity}
                            columns={[
                              { title: "Kode", dataIndex: "code", width: 80 },
                              { title: "Nama", dataIndex: "name" },
                              { title: "Jumlah", dataIndex: "amount", align: "right", render: fmt },
                            ]}
                            rowKey="code"
                            pagination={false}
                          />
                          <p className="mt-2 text-right font-medium">Total: {fmt(balanceSheetData.totalEquity)}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: "profit-loss",
              label: "Laba Rugi",
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="mb-1 block text-sm">Dari - Sampai</label>
                      <Space>
                        <DatePicker format="DD/MM/YYYY" onChange={(d) => d && setFromDate(toDateStr(d))} />
                        <DatePicker format="DD/MM/YYYY" onChange={(d) => d && setToDate(toDateStr(d))} />
                      </Space>
                    </div>
                    <Button type="primary" onClick={loadProfitLoss} loading={loading}>
                      Tampilkan
                    </Button>
                  </div>
                  {profitLossData && (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <h4 className="mb-2 font-medium">Pendapatan</h4>
                          <Table
                            size="small"
                            dataSource={profitLossData.revenue}
                            columns={[
                              { title: "Kode", dataIndex: "code", width: 80 },
                              { title: "Nama", dataIndex: "name" },
                              { title: "Jumlah", dataIndex: "amount", align: "right", render: fmt },
                            ]}
                            rowKey="code"
                            pagination={false}
                          />
                          <p className="mt-2 text-right font-medium">Total: {fmt(profitLossData.totalRevenue)}</p>
                        </div>
                        <div>
                          <h4 className="mb-2 font-medium">Beban</h4>
                          <Table
                            size="small"
                            dataSource={profitLossData.expenses}
                            columns={[
                              { title: "Kode", dataIndex: "code", width: 80 },
                              { title: "Nama", dataIndex: "name" },
                              { title: "Jumlah", dataIndex: "amount", align: "right", render: fmt },
                            ]}
                            rowKey="code"
                            pagination={false}
                          />
                          <p className="mt-2 text-right font-medium">Total: {fmt(profitLossData.totalExpenses)}</p>
                        </div>
                      </div>
                      <p className="text-right text-lg font-semibold">
                        Laba/(Rugi) Bersih: {fmt(profitLossData.netIncome)}
                      </p>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
