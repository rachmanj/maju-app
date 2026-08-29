import { Card, Row, Col } from "antd";
import { UserOutlined, WalletOutlined, CreditCardOutlined, RiseOutlined } from "@ant-design/icons";
import { prisma } from "@/lib/db/prisma";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";

export const dynamic = 'force-dynamic';

const ACTIVE_LOAN_STATUSES = ['approved', 'disbursed', 'active'] as const;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'] as const;

function buildEmptyMonthlySales(): { label: string; total: number }[] {
  const result: { label: string; total: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    result.push({ label, total: 0 });
  }
  return result;
}

async function getDashboardStats() {
  try {
    const [memberCount, savingsAgg, loanCount, loanSum] = await Promise.all([
      prisma.members.count({ where: { deleted_at: null, status: 'active' } }),
      prisma.savings_accounts.aggregate({ _sum: { balance: true } }),
      prisma.loans.count({ where: { status: { in: [...ACTIVE_LOAN_STATUSES] } } }),
      prisma.loans.aggregate({
        where: { status: { in: [...ACTIVE_LOAN_STATUSES] } },
        _sum: { principal_amount: true },
      }),
    ]);
    return {
      memberCount,
      savingsTotal: Number(savingsAgg._sum.balance ?? 0),
      loanCount,
      loanTotal: Number(loanSum._sum.principal_amount ?? 0),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      memberCount: 0,
      savingsTotal: 0,
      loanCount: 0,
      loanTotal: 0,
    };
  }
}

async function getMonthlySales(): Promise<{ label: string; total: number }[]> {
  try {
    const rows = await prisma.$queryRaw<{ bulan: string; total: unknown }[]>`
      SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS bulan, SUM(total_amount) AS total
      FROM pos_transactions
      WHERE status = 'completed'
        AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY bulan
    `;

    const totalByMonth = new Map<string, number>();
    for (const row of rows) {
      totalByMonth.set(row.bulan, Number(row.total ?? 0));
    }

    const result: { label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      result.push({ label, total: totalByMonth.get(key) ?? 0 });
    }
    return result;
  } catch (error) {
    console.error("Error fetching monthly POS sales:", error);
    return buildEmptyMonthlySales();
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const [stats, monthlySales] = await Promise.all([getDashboardStats(), getMonthlySales()]);

  const statCards = [
    {
      title: "Anggota Aktif",
      value: stats.memberCount,
      suffix: "orang",
      icon: <UserOutlined className="text-teal-500" />,
    },
    {
      title: "Total Simpanan",
      value: formatCurrency(stats.savingsTotal),
      icon: <WalletOutlined className="text-emerald-500" />,
    },
    {
      title: "Pinjaman Aktif",
      value: stats.loanCount,
      suffix: "pinjaman",
      icon: <CreditCardOutlined className="text-blue-500" />,
    },
    {
      title: "Total Pinjaman",
      value: formatCurrency(stats.loanTotal),
      icon: <RiseOutlined className="text-violet-500" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          Dashboard
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Ringkasan aktivitas koperasi
        </p>
      </div>

      <Row gutter={[20, 20]}>
        {statCards.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card
              className="overflow-hidden border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md"
              styles={{ body: { padding: "20px 24px" } }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    {stat.title}
                  </span>
                  <span className="shrink-0 text-lg">{stat.icon}</span>
                </div>
                <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
                  <span className="truncate text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="shrink-0 text-sm text-[hsl(var(--muted-foreground))]">
                      {stat.suffix}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        ))}
        <Col span={24}>
          <Card
            title="Penjualan POS 12 Bulan"
            className="border-[hsl(var(--border))] shadow-sm"
            styles={{ body: { padding: "16px 24px 24px" } }}
          >
            <MonthlySalesChart data={monthlySales} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
