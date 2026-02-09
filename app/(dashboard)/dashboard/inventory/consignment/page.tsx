import { Card, Row, Col } from "antd";
import { TeamOutlined, InboxOutlined, DatabaseOutlined, DollarOutlined, ShoppingOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function ConsignmentPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          Konsinyasi
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Supplier, penerimaan barang, stok konsinyasi, penjualan, dan settlement
        </p>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/consignment/suppliers">
            <Card hoverable className="border-[hsl(var(--border))]" styles={{ body: { padding: "24px" } }}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-violet-100 p-3 dark:bg-violet-900/30">
                  <TeamOutlined className="text-2xl text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">Supplier</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Data supplier konsinyasi</p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/consignment/receipts">
            <Card hoverable className="border-[hsl(var(--border))]" styles={{ body: { padding: "24px" } }}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/30">
                  <InboxOutlined className="text-2xl text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">Penerimaan</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Barang masuk konsinyasi</p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/consignment/stock">
            <Card hoverable className="border-[hsl(var(--border))]" styles={{ body: { padding: "24px" } }}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                  <DatabaseOutlined className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">Stok Konsinyasi</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Stok per supplier & gudang</p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/consignment/sales">
            <Card hoverable className="border-[hsl(var(--border))]" styles={{ body: { padding: "24px" } }}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <ShoppingOutlined className="text-2xl text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">Penjualan</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Daftar penjualan konsinyasi</p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/consignment/settlements">
            <Card hoverable className="border-[hsl(var(--border))]" styles={{ body: { padding: "24px" } }}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                  <DollarOutlined className="text-2xl text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">Settlement</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Penyelesaian dengan supplier</p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
}
