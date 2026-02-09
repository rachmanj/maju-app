"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select, DatePicker, InputNumber } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { format } from "date-fns";

export default function NewConsignmentReceiptPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: number; code: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: number; code: string; name: string; base_unit_id: number }[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);
  const [items, setItems] = useState<{ product_id: number; quantity: number; unit_id: number }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/consignment/suppliers?limit=500").then((r) => r.ok ? r.json() : { suppliers: [] }).then((d: { suppliers?: { id: number; code: string; name: string }[] }) => setSuppliers(d.suppliers || [])),
      fetch("/api/inventory/warehouses?all=true").then((r) => r.ok ? r.json() : []).then(setWarehouses),
      fetch("/api/inventory/products?limit=1000").then((r) => r.ok ? r.json() : { products: [] }).then((d: { products?: { id: number; code: string; name: string; base_unit_id: number }[] }) => setProducts(d.products || [])),
      fetch("/api/inventory/units").then((r) => r.ok ? r.json() : []).then(setUnits),
    ]).then(() => {});
  }, []);

  const addRow = () => setItems((prev) => [...prev, { product_id: products[0]?.id || 0, quantity: 1, unit_id: units[0]?.id || 0 }]);
  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: string, value: number) => {
    setItems((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      const p = products.find((x) => x.id === next[idx].product_id);
      if (field === "product_id" && p) next[idx].unit_id = p.base_unit_id;
      return next;
    });
  };

  const onFinish = async (values: { supplier_id: number; warehouse_id: number; receipt_date: any; notes?: string }) => {
    if (items.length === 0) {
      message.warning("Tambahkan minimal satu barang");
      return;
    }
    setLoading(true);
    try {
      const receipt_date = values.receipt_date?.format?.("YYYY-MM-DD") ?? format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/inventory/consignment/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, receipt_date, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Penerimaan berhasil dicatat");
      router.push("/dashboard/inventory/consignment/receipts");
    } catch (e: any) {
      message.error(e.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Penerimaan Barang Konsinyasi</h1>
        <p className="text-muted-foreground">Catat barang masuk dari supplier</p>
      </div>
      <Card title="Data Penerimaan">
        <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-2xl">
          <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}>
            <Select options={suppliers.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))} placeholder="Pilih supplier" />
          </Form.Item>
          <Form.Item name="warehouse_id" label="Gudang" rules={[{ required: true }]}>
            <Select options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))} placeholder="Pilih gudang" />
          </Form.Item>
          <Form.Item name="receipt_date" label="Tanggal" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Keterangan">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Barang</span>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addRow}>Tambah baris</Button>
          </div>
          <div className="space-y-2">
            {items.map((row, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded border p-2">
                <Select
                  className="w-48"
                  value={row.product_id}
                  onChange={(v) => updateRow(idx, "product_id", v)}
                  options={products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                  placeholder="Produk"
                />
                <InputNumber min={0.001} value={row.quantity} onChange={(v) => updateRow(idx, "quantity", v ?? 0)} placeholder="Jumlah" className="w-24" />
                <Select
                  className="w-24"
                  value={row.unit_id}
                  onChange={(v) => updateRow(idx, "unit_id", v ?? 0)}
                  options={units.map((u) => ({ value: u.id, label: u.code }))}
                />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(idx)} />
              </div>
            ))}
          </div>

          <Form.Item className="mt-4">
            <Button type="primary" htmlType="submit" loading={loading}>Simpan</Button>
            <Button className="ml-2" onClick={() => router.back()}>Batal</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
