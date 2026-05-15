"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { month: string; revenue: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#db2777" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#db2777" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v) => `${(v / 100).toFixed(0)} €`}
          tick={{ fontSize: 11 }}
          width={56}
        />
        <Tooltip
          formatter={(v: unknown) => [`${(Number(v) / 100).toFixed(2)} €`, "CA"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#db2777"
          strokeWidth={2}
          fill="url(#colorRev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
