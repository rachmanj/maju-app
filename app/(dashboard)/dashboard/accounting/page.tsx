import { Card, Row, Col } from "antd";
import { BookOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function AccountingPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          Akuntansi
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Kelola jurnal dan laporan keuangan
        </p>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/accounting/journal">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/30">
                  <UnorderedListOutlined className="text-2xl text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Jurnal Umum
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Lihat dan kelola jurnal
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/accounting/journal/new">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <PlusOutlined className="text-2xl text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Entri Jurnal Baru
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Buat jurnal manual
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Link href="/dashboard/accounting/reports">
            <Card
              hoverable
              className="border-[hsl(var(--border))]"
              styles={{ body: { padding: "24px" } }}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                  <BookOutlined className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Laporan Keuangan
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Trial Balance, Buku Besar
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
