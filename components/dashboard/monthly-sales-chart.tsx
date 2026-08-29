"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlySalesDatum {
  label: string;
  total: number;
}

interface MonthlySalesChartProps {
  data: MonthlySalesDatum[];
}

function formatCompactAmount(value: number): string {
  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    return `${jt.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (value >= 1_000) {
    const rb = value / 1_000;
    return `${rb.toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  }
  return value.toLocaleString("id-ID");
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompactAmount}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Penjualan"]}
          labelFormatter={(label) => `Bulan: ${label}`}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        />
        <Bar dataKey="total" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
