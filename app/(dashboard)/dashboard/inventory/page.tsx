import { Card, Row, Col } from "antd";
import { InboxOutlined, ShopOutlined, DatabaseOutlined, TeamOutlined, HistoryOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          Inventory
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Kelola produk, gudang, dan stok
        </p>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/products">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/30">
                  <InboxOutlined className="text-2xl text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Produk
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Daftar produk dan kategori
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/warehouses">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <ShopOutlined className="text-2xl text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Gudang
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Kelola gudang dan lokasi
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/stock">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                  <DatabaseOutlined className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Stok
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Stok per gudang & mutasi
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/stock/movements">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                  <HistoryOutlined className="text-2xl text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Riwayat Mutasi
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Daftar mutasi stok
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/inventory/consignment">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-violet-100 p-3 dark:bg-violet-900/30">
                  <TeamOutlined className="text-2xl text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Konsinyasi
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Supplier, penerimaan, settlement
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
}
