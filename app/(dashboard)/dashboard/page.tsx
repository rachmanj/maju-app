import { Card, Row, Col } from "antd";
import { UserOutlined, WalletOutlined, CreditCardOutlined, RiseOutlined } from "@ant-design/icons";
import { prisma } from "@/lib/db/prisma";

async function getDashboardStats() {
  try {
    const [memberCount, savingsAgg, loanCount, loanSum] = await Promise.all([
      prisma.members.count({ where: { deleted_at: null, status: 'active' } }),
      prisma.savings_accounts.aggregate({ _sum: { balance: true } }),
      prisma.loans.count({ where: { status: 'active' } }),
      prisma.loans.aggregate({ where: { status: 'active' }, _sum: { principal_amount: true } }),
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

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
      </Row>
    </div>
  );
}
