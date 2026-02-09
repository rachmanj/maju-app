"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, App, Select, DatePicker, Modal, Form, InputNumber } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface SaleRow {
  id: number;
  product_code: string;
  product_name: string;
  unit_code: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_amount: number;
  sale_date: string;
  settlement_id?: number;
}

export default function ConsignmentSalesPage() {
  const { message } = App.useApp();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState<{ id: number; code: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: number; code: string; name: string; base_unit_id: number }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/consignment/suppliers?limit=500").then((r) => r.ok ? r.json() : { suppliers: [] }).then((d: { suppliers?: { id: number; code: string; name: string }[] }) => setSuppliers(d.suppliers || [])),
      fetch("/api/inventory/products?limit=1000").then((r) => r.ok ? r.json() : { products: [] }).then((d: { products?: { id: number; code: string; name: string; base_unit_id: number }[] }) => setProducts(d.products || [])),
      fetch("/api/inventory/warehouses?all=true").then((r) => r.ok ? r.json() : []).then(setWarehouses),
      fetch("/api/inventory/units").then((r) => r.ok ? r.json() : []).then(setUnits),
    ]).then(() => {});
  }, []);

  const fetchSales = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (supplierId) params.set("supplier_id", String(supplierId));
    fetch(`/api/inventory/consignment/sales?${params}`)
      .then((r) => (r.ok ? r.json() : { sales: [], total: 0 }))
      .then((d) => { setSales(d.sales); setTotal(d.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, [page, supplierId]);

  const onAddSale = async (values: any) => {
    setSubmitting(true);
    try {
      const sale_date = values.sale_date?.format?.("YYYY-MM-DD") ?? format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/inventory/consignment/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, sale_date }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Penjualan dicatat");
      setModalOpen(false);
      form.resetFields();
      fetchSales();
    } catch (e: any) {
      message.error(e.message || "Gagal mencatat penjualan");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<SaleRow> = [
    { title: "Tanggal", dataIndex: "sale_date", key: "sale_date", render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
    { title: "Produk", key: "product", render: (_, r) => `${r.product_code} - ${r.product_name}` },
    { title: "Jumlah", dataIndex: "quantity", key: "quantity", align: "right" },
    { title: "Satuan", dataIndex: "unit_code", key: "unit_code" },
    { title: "Harga", dataIndex: "unit_price", key: "unit_price", align: "right", render: (p) => Number(p).toLocaleString("id-ID") },
    { title: "Total", dataIndex: "total_amount", key: "total_amount", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
    { title: "Komisi", dataIndex: "commission_amount", key: "commission_amount", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
    { title: "Settlement", dataIndex: "settlement_id", key: "settlement_id", render: (id) => (id ? "Ya" : "Belum") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Penjualan Konsinyasi</h1>
          <p className="text-muted-foreground">Daftar penjualan barang konsinyasi</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Catat Penjualan</Button>
      </div>
      <Card title="Daftar Penjualan">
        <div className="mb-4">
          <Select placeholder="Semua supplier" allowClear className="w-56" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        <Table columns={columns} dataSource={sales} rowKey="id" loading={loading} pagination={{ current: page, pageSize: 20, total, onChange: setPage }} />
      </Card>

      <Modal title="Catat Penjualan Konsinyasi" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={480}>
        <Form form={form} layout="vertical" onFinish={onAddSale} initialValues={{ quantity: 1, unit_price: 0 }}>
          <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}>
            <Select options={suppliers.map((s) => ({ value: s.id, label: s.name }))} placeholder="Pilih supplier" />
          </Form.Item>
          <Form.Item name="product_id" label="Produk" rules={[{ required: true }]}>
            <Select
              options={products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
              placeholder="Pilih produk"
              onChange={(_, opt: any) => {
                const p = products.find((x) => x.id === opt?.value);
                if (p) form.setFieldsValue({ unit_id: p.base_unit_id });
              }}
            />
          </Form.Item>
          <Form.Item name="warehouse_id" label="Gudang" rules={[{ required: true }]}>
            <Select options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="Pilih gudang" />
          </Form.Item>
          <Form.Item name="unit_id" label="Satuan" rules={[{ required: true }]}>
            <Select options={units.map((u) => ({ value: u.id, label: u.code }))} placeholder="Satuan" />
          </Form.Item>
          <Form.Item name="quantity" label="Jumlah" rules={[{ required: true }]}>
            <InputNumber min={0.001} className="w-full" />
          </Form.Item>
          <Form.Item name="unit_price" label="Harga satuan" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="sale_date" label="Tanggal" initialValue={new Date()}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>Simpan</Button>
            <Button className="ml-2" onClick={() => setModalOpen(false)}>Batal</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
