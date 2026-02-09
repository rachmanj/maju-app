"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Descriptions, Table, Button, Spin, App } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { format } from "date-fns";

const statusLabel: Record<string, string> = { draft: "Draft", confirmed: "Dikonfirmasi", paid: "Dibayar" };

export default function ConsignmentSettlementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<{
    settlement_number: string;
    supplier_name: string;
    settlement_date: string;
    total_sales_amount: number;
    total_commission: number;
    net_payable: number;
    status: string;
    notes?: string;
    sales: { product_code: string; product_name: string; quantity: number; unit_price: number; total_amount: number; commission_amount: number; sale_date: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/inventory/consignment/settlements/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => message.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id, message]);

  if (loading || !data) return <div className="flex items-center justify-center min-h-[200px]"><Spin /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard/inventory/consignment/settlements")}>Kembali</Button>
        <div>
          <h1 className="text-2xl font-bold">{data.settlement_number}</h1>
          <p className="text-muted-foreground">Settlement • {data.supplier_name}</p>
        </div>
      </div>
      <Card title="Detail">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="No. Settlement">{data.settlement_number}</Descriptions.Item>
          <Descriptions.Item label="Tanggal">{data.settlement_date ? format(new Date(data.settlement_date), "dd/MM/yyyy") : "-"}</Descriptions.Item>
          <Descriptions.Item label="Supplier">{data.supplier_name}</Descriptions.Item>
          <Descriptions.Item label="Status">{statusLabel[data.status] || data.status}</Descriptions.Item>
          <Descriptions.Item label="Total Penjualan">{(Number(data.total_sales_amount)).toLocaleString("id-ID")}</Descriptions.Item>
          <Descriptions.Item label="Total Komisi">{(Number(data.total_commission)).toLocaleString("id-ID")}</Descriptions.Item>
          <Descriptions.Item label="Bersih Dibayar">{(Number(data.net_payable)).toLocaleString("id-ID")}</Descriptions.Item>
          <Descriptions.Item label="Keterangan">{data.notes || "-"}</Descriptions.Item>
        </Descriptions>
        <div className="mt-4">
          <h4 className="mb-2 font-medium">Detail Penjualan</h4>
          <Table
            dataSource={data.sales}
            rowKey={(r, i) => `${r.product_code}-${i}`}
            size="small"
            columns={[
              { title: "Tanggal", dataIndex: "sale_date", key: "sale_date", render: (d) => d ? format(new Date(d), "dd/MM/yyyy") : "-" },
              { title: "Produk", key: "product", render: (_, r) => `${r.product_code} - ${r.product_name}` },
              { title: "Jumlah", dataIndex: "quantity", key: "quantity", align: "right" },
              { title: "Harga", dataIndex: "unit_price", key: "unit_price", align: "right", render: (p) => Number(p).toLocaleString("id-ID") },
              { title: "Total", dataIndex: "total_amount", key: "total_amount", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
              { title: "Komisi", dataIndex: "commission_amount", key: "commission_amount", align: "right", render: (a) => Number(a).toLocaleString("id-ID") },
            ]}
            pagination={false}
          />
        </div>
      </Card>
    </div>
  );
}
