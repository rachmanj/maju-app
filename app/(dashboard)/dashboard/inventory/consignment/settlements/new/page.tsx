"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Button, Card, App, Select, DatePicker } from "antd";
import { format } from "date-fns";

interface UnsettledSale {
  id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_amount: number;
  sale_date: string;
}

export default function NewConsignmentSettlementPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: number; code: string; name: string }[]>([]);
  const [unsettled, setUnsettled] = useState<UnsettledSale[]>([]);
  const [supplierId, setSupplierId] = useState<number | undefined>();

  useEffect(() => {
    fetch("/api/inventory/consignment/suppliers?limit=500").then((r) => r.ok ? r.json() : { suppliers: [] }).then((d: { suppliers?: { id: number; code: string; name: string }[] }) => setSuppliers(d.suppliers || []));
  }, []);

  useEffect(() => {
    if (!supplierId) { setUnsettled([]); return; }
    fetch(`/api/inventory/consignment/sales/unsettled?supplier_id=${supplierId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setUnsettled);
  }, [supplierId]);

  const onFinish = async (values: { supplier_id: number; settlement_date: any }) => {
    const sale_ids = unsettled.map((s) => s.id);
    if (sale_ids.length === 0) {
      message.warning("Tidak ada penjualan yang belum disettlement untuk supplier ini");
      return;
    }
    setLoading(true);
    try {
      const settlement_date = values.settlement_date?.format?.("YYYY-MM-DD") ?? format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/inventory/consignment/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: values.supplier_id, settlement_date, sale_ids }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Settlement berhasil dibuat");
      router.push("/dashboard/inventory/consignment/settlements");
    } catch (e: any) {
      message.error(e.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const totalSales = unsettled.reduce((s, x) => s + Number(x.total_amount), 0);
  const totalCommission = unsettled.reduce((s, x) => s + Number(x.commission_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Buat Settlement</h1>
        <p className="text-muted-foreground">Pilih supplier dan penjualan yang akan disettlement</p>
      </div>
      <Card title="Data Settlement">
        <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-xl">
          <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}>
            <Select
              placeholder="Pilih supplier"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              onChange={setSupplierId}
            />
          </Form.Item>
          <Form.Item name="settlement_date" label="Tanggal Settlement" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          {supplierId && (
            <div className="mb-4 rounded border p-4">
              <h4 className="mb-2 font-medium">Penjualan belum disettlement ({unsettled.length})</h4>
              {unsettled.length === 0 ? (
                <p className="text-muted-foreground">Tidak ada penjualan yang belum disettlement.</p>
              ) : (
                <>
                  <ul className="list-inside list-disc text-sm">
                    {unsettled.slice(0, 10).map((s) => (
                      <li key={s.id}>{s.product_code} - {Number(s.total_amount).toLocaleString("id-ID")} (komisi: {Number(s.commission_amount).toLocaleString("id-ID")})</li>
                    ))}
                    {unsettled.length > 10 && <li>... dan {unsettled.length - 10} lainnya</li>}
                  </ul>
                  <p className="mt-2 font-medium">Total penjualan: {totalSales.toLocaleString("id-ID")} | Total komisi: {totalCommission.toLocaleString("id-ID")} | Bersih: {(totalSales - totalCommission).toLocaleString("id-ID")}</p>
                </>
              )}
            </div>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={unsettled.length === 0}>Buat Settlement</Button>
            <Button className="ml-2" onClick={() => router.back()}>Batal</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
