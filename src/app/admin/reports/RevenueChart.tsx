"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Point = { month: string; encaisse: number; realise: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colorEncaisse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1C1C1A" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#1C1C1A" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorRealise" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#A07B3A" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#A07B3A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D4" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6E6555", letterSpacing: "0.06em" }} />
        <YAxis
          tickFormatter={(v) => `${(v / 100).toFixed(0)} €`}
          tick={{ fontSize: 10, fill: "#6E6555" }}
          width={58}
        />
        <Tooltip
          formatter={(v: unknown, name: unknown) => [
            `${(Number(v) / 100).toFixed(2)} €`,
            name === "encaisse" ? "CA encaissé" : "CA réalisé",
          ]}
          contentStyle={{ border: "1px solid #DDD5C5", borderRadius: 0, fontSize: 12 }}
        />
        <Legend
          formatter={(v) => (v === "encaisse" ? "CA encaissé" : "CA réalisé")}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Area
          type="monotone"
          dataKey="encaisse"
          stroke="#1C1C1A"
          strokeWidth={2}
          fill="url(#colorEncaisse)"
        />
        <Area
          type="monotone"
          dataKey="realise"
          stroke="#A07B3A"
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="url(#colorRealise)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
