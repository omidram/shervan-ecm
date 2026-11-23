"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { healthColor } from "@/lib/health-color";
import { fmtNum } from "@/lib/format";

export function HealthRows({
  rows,
}: {
  rows: { href?: string; code: string; label: string; value: number | null }[];
}) {
  return (
    <div className="health-list">
      {rows.map((row) => {
        const width = row.value == null ? 0 : Math.max(0, Math.min(100, row.value));
        const body = (
          <>
            <span className="health-name"><i style={{ background: healthColor(row.value) }} />{row.code}</span>
            <span className="health-track"><i style={{ width: `${width}%`, background: healthColor(row.value) }} /></span>
            <b className="num">{row.value == null ? "—" : fmtNum(row.value, 0)}</b>
            <span className="health-note">{row.label}</span>
          </>
        );
        return row.href ? (
          <a key={row.code} className="health-row" href={row.href}>{body}</a>
        ) : (
          <div key={row.code} className="health-row">{body}</div>
        );
      })}
    </div>
  );
}

export function Dial({
  label,
  value,
  unit,
  min,
  max,
  higherIsBetter = true,
}: {
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  higherIsBetter?: boolean;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const score = higherIsBetter ? pct : 1 - pct;
  const color = score >= 0.62 ? "#3dbe8a" : score >= 0.38 ? "#e3a63a" : "#e26a5c";
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const dash = 0.75 * circ;
  return (
    <div className="dial" dir="ltr">
      <svg viewBox="0 0 84 84" aria-hidden>
        <circle className="ring-track" cx="42" cy="42" r={radius} strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.125} />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${dash * pct} ${circ}`}
          strokeDashoffset={circ * 0.125}
          transform="rotate(90 42 42)"
        />
      </svg>
      <b className="num ring-val">{value == null ? "—" : fmtNum(value, Math.abs(value) < 10 ? 2 : 0)}</b>
      <span>{label}</span>
      <small className="note">{unit}</small>
    </div>
  );
}

export function RingGauge({
  value,
  label,
  caption,
  text,
}: {
  value: number | null;
  label: string;
  caption: string;
  text?: string;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="ring" title={caption}>
      <svg viewBox="0 0 84 84" aria-hidden>
        <circle className="ring-track" cx="42" cy="42" r={radius} />
        <circle
          className="ring-value"
          cx="42"
          cy="42"
          r={radius}
          stroke={healthColor(value)}
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        />
      </svg>
      <b className="num ring-val">{text ?? (value == null ? "—" : fmtNum(value, 0))}</b>
      <span>{label}</span>
    </div>
  );
}

export function RangeBars({
  rows,
}: {
  rows: { name: string; used: number; limit: number }[];
}) {
  const data = rows.map((row) => ({
    name: row.name,
    used: Math.round(row.used),
    left: Math.max(0, Math.round(row.limit - row.used)),
  }));
  if (!data.length) return null;
  return (
    <div className="chart-frame slim" dir="ltr">
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 46)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fill: "#8ea6bb", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#101c28", border: "1px solid #24384c", borderRadius: 10, color: "#e7eef4" }}
            formatter={(value: number, name: string) => [fmtNum(Number(value), 0), name === "used" ? "Used" : "Remaining"]}
          />
          <Bar dataKey="used" stackId="life" fill="#e26a5c" radius={[4, 0, 0, 4]} />
          <Bar dataKey="left" stackId="life" fill="#1e3346" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
