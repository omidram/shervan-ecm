"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDate, fmtNum } from "@/lib/format";

export function IndexChart({ points }: { points: { t: string; hi: number }[] }) {
  if (points.length < 2) return <p className="muted">—</p>;
  return (
    <div className="chart-frame" dir="ltr">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="hiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3dbe8a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3dbe8a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1d3042" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8ea6bb", fontSize: 11 }} minTickGap={28} tickLine={false} axisLine={false} />
          <YAxis domain={[30, 100]} tick={{ fill: "#8ea6bb", fontSize: 11 }} width={36} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#101c28", border: "1px solid #24384c", borderRadius: 10, color: "#e7eef4" }} />
          <Area type="monotone" dataKey="hi" stroke="#3dbe8a" strokeWidth={2.2} fill="url(#hiFill)" baseValue={30} dot={{ r: 3 }} name="HI" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderBars({ points }: { points: { name: string; amp: number }[] }) {
  if (!points.length) return <p className="muted">—</p>;
  return (
    <div className="chart-frame" dir="ltr">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1d3042" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#8ea6bb", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8ea6bb", fontSize: 11 }} width={36} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#101c28", border: "1px solid #24384c", borderRadius: 10, color: "#e7eef4" }} />
          <Bar dataKey="amp" fill="#e3a63a" radius={[4, 4, 0, 0]} name="ips" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({
  points,
  unit,
}: {
  points: { t: Date; measured: number; reference: number }[];
  unit: string;
}) {
  if (points.length < 2) return <p className="muted">—</p>;
  const spanValues = points.flatMap((point) => [point.measured, point.reference]);
  const low = Math.min(...spanValues);
  const high = Math.max(...spanValues);
  const span = Math.max(high - low, 1);
  const raw = span / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
  const axisMin = Math.floor((low - span * 0.08) / step) * step;
  const axisMax = Math.ceil((high + span * 0.08) / step) * step;
  const data = points.map((point) => ({
    t: fmtDate(point.t),
    measured: Number(point.measured.toFixed(2)),
    reference: Number(point.reference.toFixed(2)),
  }));
  return (
    <div className="chart-frame" dir="ltr">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="measuredFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e3a63a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#e3a63a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1d3042" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8ea6bb", fontSize: 11 }} minTickGap={36} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#8ea6bb", fontSize: 11 }}
            width={52}
            tickLine={false}
            axisLine={false}
            domain={[axisMin, axisMax]}
            tickFormatter={(value: number) => fmtNum(value, Math.abs(value) < 10 ? 1 : 0)}
          />
          <Tooltip
            contentStyle={{ background: "#101c28", border: "1px solid #24384c", borderRadius: 10, color: "#e7eef4" }}
            labelStyle={{ color: "#8ea6bb" }}
            formatter={(value: number, name: string) => [`${fmtNum(Number(value), 2)} ${unit}`, name === "measured" ? "Measured" : "Reference"]}
          />
          <Area type="monotone" dataKey="measured" stroke="#e3a63a" strokeWidth={2.2} fill="url(#measuredFill)" baseValue="dataMin" dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="reference" stroke="#8fd0ef" strokeDasharray="6 4" strokeWidth={1.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
