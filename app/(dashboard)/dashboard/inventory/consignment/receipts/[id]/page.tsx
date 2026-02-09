"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Descriptions, Table, Button, Spin, App } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { format } from "date-fns";

export default function ConsignmentReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<{ receipt_number: string; supplier_name: string; warehouse_name: string; receipt_date: string; notes?: string; items: { product_code: string; product_name: string; unit_code: string; quantity: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/inventory/consignment/receipts/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => message.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id, message]);

  if (loading || !data) return <div className="flex items-center justify-center min-h-[200px]"><Spin /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard/inventory/consignment/receipts")}>Kembali</Button>
        <div>
          <h1 className="text-2xl font-bold">{data.receipt_number}</h1>
          <p className="text-muted-foreground">Penerimaan konsinyasi • {data.supplier_name}</p>
        </div>
      </div>
      <Card title="Detail">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="No. Penerimaan">{data.receipt_number}</Descriptions.Item>
          <Descriptions.Item label="Tanggal">{data.receipt_date ? format(new Date(data.receipt_date), "dd/MM/yyyy") : "-"}</Descriptions.Item>
          <Descriptions.Item label="Supplier">{data.supplier_name}</Descriptions.Item>
          <Descriptions.Item label="Gudang">{data.warehouse_name}</Descriptions.Item>
          <Descriptions.Item label="Keterangan" span={2}>{data.notes || "-"}</Descriptions.Item>
        </Descriptions>
        <div className="mt-4">
          <h4 className="mb-2 font-medium">Barang</h4>
          <Table
            dataSource={data.items}
            rowKey="product_code"
            size="small"
            columns={[
              { title: "Kode", dataIndex: "product_code", key: "product_code" },
              { title: "Nama", dataIndex: "product_name", key: "product_name" },
              { title: "Jumlah", dataIndex: "quantity", key: "quantity", align: "right" },
              { title: "Satuan", dataIndex: "unit_code", key: "unit_code" },
            ]}
            pagination={false}
          />
        </div>
      </Card>
    </div>
  );
}
