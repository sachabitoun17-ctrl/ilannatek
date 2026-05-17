"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { day: string; bookings: number; cancels: number };

export function BookingsChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D4" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6E6555" }} />
        <YAxis tick={{ fontSize: 10, fill: "#6E6555" }} width={28} />
        <Tooltip contentStyle={{ border: "1px solid #DDD5C5", borderRadius: 0, fontSize: 12 }} />
        <Bar dataKey="bookings" name="Réservations" fill="#1C1C1A" radius={[2, 2, 0, 0]} />
        <Bar dataKey="cancels" name="Annulations" fill="#DDD5C5" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
