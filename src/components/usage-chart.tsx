"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function UsageChart({ points }: { points: { t: string; hours: number; cycles: number }[] }) {
  if (points.length < 2) return <p className="muted">—</p>;
  return (
    <div className="chart-frame" dir="ltr">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1d3042" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8ea6bb", fontSize: 11 }} minTickGap={24} tickLine={false} axisLine={false} />
          <YAxis yAxisId="h" tick={{ fill: "#8ea6bb", fontSize: 11 }} width={42} tickLine={false} axisLine={false} />
          <YAxis yAxisId="c" orientation="right" tick={{ fill: "#d39a32", fontSize: 11 }} width={36} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#101c28", border: "1px solid #24384c", borderRadius: 10, color: "#e7eef4" }} />
          <Legend />
          <Line yAxisId="h" type="monotone" dataKey="hours" name="Flight hours" stroke="#3d7dff" strokeWidth={2} dot={false} />
          <Line yAxisId="c" type="monotone" dataKey="cycles" name="Cycles" stroke="#e3a63a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
