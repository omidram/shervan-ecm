"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tip = { background: "#101c28", border: "1px solid #24384c", borderRadius: 10, color: "#e7eef4" };

export function MonthLine({ points, name, color }: { points: { t: string; value: number }[]; name: string; color: string }) {
  if (points.length < 2) return <p className="muted">—</p>;
  return (
    <div className="chart-frame" dir="ltr">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1d3042" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8ea6bb", fontSize: 11 }} minTickGap={24} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8ea6bb", fontSize: 11 }} width={48} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tip} />
          <Line type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NamedBars({ points, name }: { points: { name: string; value: number }[]; name: string }) {
  if (!points.length) return <p className="muted">—</p>;
  return (
    <div className="chart-frame" dir="ltr">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1d3042" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#8ea6bb", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8ea6bb", fontSize: 11 }} width={48} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tip} />
          <Bar dataKey="value" name={name} fill="#e3a63a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
