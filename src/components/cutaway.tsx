"use client";

import type { ReactNode } from "react";
import { metalTint } from "@/lib/health-color";
import type { Locale } from "@/lib/i18n";

type Mod = { code: string; healthIndex: number | null; name: string };

const CL = 430;

function y(r: number) {
  return CL - r;
}

function airfoil(x: number, hubR: number, tipR: number, chord: number, lean: number) {
  const yH = y(hubR);
  const yT = y(tipR);
  const xT = x + lean;
  const thick = Math.max(4, chord * 0.28);
  const teH = x + chord * 0.72;
  const teT = xT + chord * 0.86;
  return [
    `M ${x.toFixed(1)} ${(yH - 2).toFixed(1)}`,
    `C ${(x + chord * 0.15).toFixed(1)} ${((yH + yT) / 2).toFixed(1)} ${(xT - chord * 0.05).toFixed(1)} ${(yT + 10).toFixed(1)} ${xT.toFixed(1)} ${yT.toFixed(1)}`,
    `C ${(xT + chord * 0.45).toFixed(1)} ${(yT + 3).toFixed(1)} ${teT.toFixed(1)} ${(yT + (yH - yT) * 0.2).toFixed(1)} ${teT.toFixed(1)} ${((yT + yH) / 2).toFixed(1)}`,
    `C ${(teH + thick).toFixed(1)} ${(yH - (yH - yT) * 0.25).toFixed(1)} ${(teH).toFixed(1)} ${(yH + thick).toFixed(1)} ${teH.toFixed(1)} ${yH.toFixed(1)}`,
    `C ${(x + chord * 0.35).toFixed(1)} ${(yH + thick * 0.8).toFixed(1)} ${(x + 2).toFixed(1)} ${(yH + 4).toFixed(1)} ${x.toFixed(1)} ${(yH - 2).toFixed(1)}`,
    "Z",
  ].join(" ");
}

function Row({ x, hubR, tipR, chord, lean, fill, stroke, sw }: { x: number; hubR: number; tipR: number; chord: number; lean: number; fill: string; stroke: string; sw: number }) {
  return (
    <g>
      <path d={`M ${(x - 2).toFixed(1)} ${y(hubR + 6).toFixed(1)} h ${(chord * 0.55).toFixed(1)} v ${y(Math.max(12, hubR - 12)) - y(hubR + 6)} h ${(-chord * 0.55).toFixed(1)} Z`} fill="#9aa8b4" stroke="#1c2a36" strokeWidth={0.6} />
      <path d={airfoil(x, hubR, tipR, chord, lean)} fill={fill} stroke={stroke} strokeWidth={sw} />
    </g>
  );
}

export function Cutaway({
  modules,
  stations = [],
  selected,
  isolated = [],
  onSelect,
  locale = "fa",
}: {
  modules: Mod[];
  stations?: { id: string; moduleCode: string; health: number | null; short: string }[];
  selected: string;
  isolated?: string[];
  onSelect: (code: string, shift: boolean) => void;
  locale?: Locale;
}) {
  const byStation = new Map(stations.map((item) => [item.id, item.health]));
  const byModule = new Map(modules.map((mod) => [mod.code, mod.healthIndex]));
  const tone = (id: string, amount = 0.55) => metalTint(byStation.get(id) ?? byModule.get(id) ?? null, amount);
  const hot = (id: string) => isolated.includes(id) || selected === id;
  const stroke = (id: string) => (hot(id) ? "#f4fbff" : "#1b2833");
  const sw = (id: string) => (hot(id) ? 2.4 : 0.9);
  const pick = (id: string) => (event: { stopPropagation: () => void; shiftKey?: boolean }) => {
    event.stopPropagation();
    onSelect(id, Boolean(event.shiftKey));
  };
  const part = (id: string, node: ReactNode) => (
    <g data-station={id} data-on={hot(id) ? "1" : "0"} onClick={pick(id)} style={{ cursor: "pointer" }}>
      {node}
    </g>
  );
  const hpc = Array.from({ length: 9 }, (_, i) => ({ x: 470 + i * 24, hub: 50, tip: 158 - i * 9, chord: 16 - i * 0.6, lean: 3 }));
  const lpc = [
    { x: 300, hub: 58, tip: 148, chord: 22, lean: 4 },
    { x: 348, hub: 54, tip: 132, chord: 20, lean: 3.5 },
    { x: 394, hub: 52, tip: 118, chord: 18, lean: 3 },
  ];
  const lpt = [
    { x: 940, hub: 48, tip: 96, chord: 22, lean: 4 },
    { x: 996, hub: 46, tip: 118, chord: 22, lean: 3.5 },
    { x: 1052, hub: 44, tip: 140, chord: 20, lean: 3 },
    { x: 1108, hub: 42, tip: 164, chord: 18, lean: 2.5 },
  ];
  const pads: { id: string; x: number; label: string }[] = [
    { id: "AGB", x: 168, label: "AGB" },
    { id: "STARTER", x: 248, label: "STR" },
    { id: "IDG", x: 318, label: "IDG" },
    { id: "FUEL-PUMP", x: 388, label: "FP" },
    { id: "FUEL-CTRL", x: 458, label: "FC" },
    { id: "EEC", x: 528, label: "EEC" },
    { id: "OIL-TANK", x: 608, label: "TANK" },
    { id: "OIL-PUMP", x: 688, label: "PMP" },
    { id: "OIL-FILT", x: 768, label: "FILT" },
    { id: "OIL-CHIP", x: 848, label: "CHIP" },
  ];

  return (
    <svg className={isolated.length ? "iso" : ""} viewBox="0 0 1200 700" role="img" data-section="cfm56-7b" aria-label={locale === "fa" ? "برش طولی موتور CFM56-7B" : "CFM56-7B longitudinal half-section"}>
      <defs>
        <linearGradient id="ecm-case" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f8fb" />
          <stop offset="0.45" stopColor="#c5d0da" />
          <stop offset="1" stopColor="#7d8b98" />
        </linearGradient>
        <linearGradient id="ecm-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef3f7" />
          <stop offset="1" stopColor="#6d7c89" />
        </linearGradient>
        <linearGradient id="ecm-bypass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#163044" />
          <stop offset="1" stopColor="#0e1c2a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="#0e1a26" />
      <text x="24" y="28" fill="#d6e4f2" fontSize="18" fontFamily="Vazirmatn, sans-serif">
        {locale === "fa" ? "برش طولی CFM56-7B" : "CFM56-7B half-section"}
      </text>
      <text x="24" y="48" fill="#8ea6bb" fontSize="13" fontFamily="Vazirmatn, sans-serif">
        {locale === "fa" ? "هندسه اصلی است، نه نقشه سازنده" : "Original geometry, not an OEM drawing"}
      </text>

      <path d={`M 70 ${y(250)} C 120 ${y(286)} 180 ${y(292)} 250 ${y(286)} L 1160 ${y(210)} L 1160 ${y(168)} L 250 ${y(230)} C 180 ${y(236)} 120 ${y(228)} 70 ${y(190)} Z`} fill="url(#ecm-case)" opacity={0.95} />
      <path d={`M 250 ${y(168)} C 420 ${y(176)} 700 ${y(168)} 900 ${y(150)} L 1140 ${y(132)} L 1140 ${y(96)} C 900 ${y(112)} 700 ${y(124)} 250 ${y(128)} Z`} fill="url(#ecm-bypass)" />
      <path d={`M 250 ${y(128)} C 460 ${y(150)} 760 ${y(142)} 1140 ${y(96)}`} fill="none" stroke="#7eb6ff" strokeWidth={1.2} opacity={0.55} />
      <path d={`M 40 ${CL} H 1180`} stroke="#8ea6bb" strokeWidth={1} strokeDasharray="10 4 2 4" />
      <path d={`M 150 ${y(11)} H 1160`} stroke="url(#ecm-shaft)" strokeWidth={14} />
      <path d={`M 430 ${y(20)} H 900`} stroke="#d5dee6" strokeWidth={16} />

      {part("FAN-SPIN", <path d={`M 36 ${CL} C 70 ${y(16)} 110 ${y(48)} 150 ${y(78)} L 132 ${y(70)} C 100 ${y(36)} 70 ${y(10)} 36 ${CL} Z`} fill={tone("FAN-SPIN", 0.5)} stroke={stroke("FAN-SPIN")} strokeWidth={sw("FAN-SPIN")} />)}
      {part("FAN-DISK", <path d={`M 132 ${y(86)} H 188 V ${y(22)} H 140 Z`} fill={tone("FAN-DISK", 0.62)} stroke={stroke("FAN-DISK")} strokeWidth={sw("FAN-DISK")} />)}
      {part("FAN-BLD", (
        <>
          <rect x={118} y={y(268)} width={96} height={200} fill="transparent" />
          <path d={airfoil(128, 72, 248, 62, 14)} fill={tone("FAN-BLD", 0.7)} stroke={stroke("FAN-BLD")} strokeWidth={sw("FAN-BLD")} />
        </>
      ))}
      {part("FAN-CASE", <path d={`M 86 ${y(236)} C 130 ${y(278)} 190 ${y(286)} 250 ${y(274)} L 250 ${y(248)} C 190 ${y(258)} 140 ${y(250)} 100 ${y(214)} Z`} fill={tone("FAN-CASE", 0.4)} stroke={stroke("FAN-CASE")} strokeWidth={sw("FAN-CASE")} />)}
      {part("FAN-OGV", (
        <>
          <rect x={236} y={y(230)} width={48} height={120} fill="transparent" />
          <path d={airfoil(246, 140, 220, 16, -2)} fill={tone("FAN-OGV", 0.45)} stroke={stroke("FAN-OGV")} strokeWidth={sw("FAN-OGV")} />
        </>
      ))}

      {lpc.map((stage, index) => <g key={`LPC-S${index + 1}`}>{part(`LPC-S${index + 1}`, (
        <>
          <rect x={stage.x - 6} y={y(stage.tip + 16)} width={stage.chord + 18} height={stage.tip - stage.hub + 36} fill="transparent" />
          <Row x={stage.x} hubR={stage.hub} tipR={stage.tip} chord={stage.chord} lean={stage.lean} fill={tone(`LPC-S${index + 1}`, 0.66)} stroke={stroke(`LPC-S${index + 1}`)} sw={sw(`LPC-S${index + 1}`)} />
        </>
      ))}</g>)}
      {part("LPC-ST", (
        <>
          <rect x={318} y={y(150)} width={90} height={70} fill="transparent" />
          <Row x={324} hubR={70} tipR={136} chord={10} lean={-2} fill={tone("LPC-ST", 0.35)} stroke={stroke("LPC-ST")} sw={sw("LPC-ST")} />
        </>
      ))}
      {part("VBV", (
        <>
          <rect x={404} y={y(186)} width={62} height={36} rx={6} fill={tone("VBV", 0.5)} stroke={stroke("VBV")} strokeWidth={sw("VBV")} />
          <text x={416} y={y(164)} fill="#f4fbff" fontSize="14" fontFamily="Vazirmatn, sans-serif" pointerEvents="none">VBV</text>
        </>
      ))}

      {part("HPC-IGV", (
        <>
          <rect x={438} y={y(176)} width={24} height={120} fill="transparent" />
          <Row x={446} hubR={54} tipR={162} chord={12} lean={-2} fill={tone("HPC-IGV", 0.4)} stroke={stroke("HPC-IGV")} sw={sw("HPC-IGV")} />
        </>
      ))}
      {hpc.map((stage, index) => <g key={`HPC-S${index + 1}`}>{part(`HPC-S${index + 1}`, (
        <>
          <rect x={stage.x - 4} y={y(stage.tip + 18)} width={stage.chord + 16} height={stage.tip - 28} fill="transparent" />
          <Row x={stage.x} hubR={stage.hub} tipR={stage.tip} chord={stage.chord} lean={stage.lean} fill={tone(`HPC-S${index + 1}`, index === 5 ? 0.82 : 0.68)} stroke={stroke(`HPC-S${index + 1}`)} sw={sw(`HPC-S${index + 1}`)} />
        </>
      ))}</g>)}
      {part("VSV", (
        <>
          <rect x={500} y={y(196)} width={150} height={28} rx={8} fill={tone("VSV", 0.48)} stroke={stroke("VSV")} strokeWidth={sw("VSV")} />
          <text x={552} y={y(176)} fill="#f4fbff" fontSize="14" fontFamily="Vazirmatn, sans-serif" pointerEvents="none">VSV</text>
        </>
      ))}

      {part("COMB-LINER", (
        <path d={`M 692 ${y(62)} C 710 ${y(110)} 760 ${y(148)} 820 ${y(132)} C 850 ${y(122)} 858 ${y(96)} 848 ${y(74)} L 836 ${y(70)} C 820 ${y(96)} 770 ${y(112)} 730 ${y(96)} C 710 ${y(86)} 704 ${y(74)} 700 ${y(58)} Z`} fill={tone("COMB-LINER", 0.6)} stroke={stroke("COMB-LINER")} strokeWidth={sw("COMB-LINER")} />
      ))}
      {part("COMB-NOZ", (
        <>
          <rect x={724} y={y(136)} width={96} height={28} fill="transparent" />
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={736 + i * 18} cy={y(118)} r={6} fill={tone("COMB-NOZ", 0.7)} stroke={stroke("COMB-NOZ")} strokeWidth={sw("COMB-NOZ")} />)}
        </>
      ))}
      {part("COMB-IGN", (
        <>
          <rect x={748} y={y(188)} width={18} height={36} rx={3} fill={tone("COMB-IGN", 0.55)} stroke={stroke("COMB-IGN")} strokeWidth={sw("COMB-IGN")} />
          <rect x={800} y={y(184)} width={18} height={36} rx={3} fill={tone("COMB-IGN", 0.55)} stroke={stroke("COMB-IGN")} strokeWidth={sw("COMB-IGN")} />
        </>
      ))}

      {part("HPT-NGV", <Row x={868} hubR={64} tipR={108} chord={16} lean={-3} fill={tone("HPT-NGV", 0.45)} stroke={stroke("HPT-NGV")} sw={sw("HPT-NGV")} />)}
      {part("HPT-BLD", (
        <>
          <rect x={888} y={y(130)} width={40} height={90} fill="transparent" />
          <Row x={894} hubR={56} tipR={108} chord={26} lean={5} fill={tone("HPT-BLD", 0.7)} stroke={stroke("HPT-BLD")} sw={sw("HPT-BLD")} />
        </>
      ))}
      {part("HPT-DISK", <circle cx={906} cy={y(42)} r={14} fill={tone("HPT-DISK", 0.8)} stroke={stroke("HPT-DISK")} strokeWidth={sw("HPT-DISK")} />)}
      {part("HPT-SHRD", <path d={`M 876 ${y(118)} H 930 V ${y(132)} H 876 Z`} fill={tone("HPT-SHRD", 0.5)} stroke={stroke("HPT-SHRD")} strokeWidth={sw("HPT-SHRD")} />)}

      {lpt.map((stage, index) => <g key={`LPT-S${index + 1}`}>{part(`LPT-S${index + 1}`, (
        <>
          <rect x={stage.x - 4} y={y(stage.tip + 16)} width={stage.chord + 16} height={stage.tip - 20} fill="transparent" />
          <Row x={stage.x} hubR={stage.hub} tipR={stage.tip} chord={stage.chord} lean={stage.lean} fill={tone(`LPT-S${index + 1}`, 0.58)} stroke={stroke(`LPT-S${index + 1}`)} sw={sw(`LPT-S${index + 1}`)} />
        </>
      ))}</g>)}
      {part("LPT-TRF", <path d={`M 1148 ${y(48)} C 1184 ${y(28)} 1196 ${y(12)} 1200 ${CL} L 1160 ${y(20)} Z`} fill={tone("LPT-TRF", 0.5)} stroke={stroke("LPT-TRF")} strokeWidth={sw("LPT-TRF")} />)}

      {[
        ["BRG-1", 168, 34],
        ["BRG-2", 360, 30],
        ["BRG-3", 560, 28],
        ["BRG-4", 900, 32],
        ["BRG-5", 1124, 28],
      ].map(([id, bx, br], index) => <g key={String(id)}>{part(String(id), (
        <>
          <circle cx={Number(bx)} cy={y(Number(br))} r={16} fill="transparent" />
          <circle cx={Number(bx)} cy={y(Number(br))} r={8} fill="#101820" stroke={tone(String(id), 0.85)} strokeWidth={hot(String(id)) ? 3 : 2} />
          <text x={Number(bx) - 8} y={y(Number(br)) - 14} fill="#f4fbff" fontSize="13" fontFamily="Vazirmatn, sans-serif" pointerEvents="none">B{index + 1}</text>
        </>
      ))}</g>)}

      <path d={`M 188 ${y(8)} V ${CL + 36}`} stroke="#8ea0ae" strokeWidth={5} pointerEvents="none" />
      {pads.map((pad) => <g key={pad.id}>{part(pad.id, (
        <>
          <rect x={pad.x} y={CL + 48} width={62} height={36} rx={8} fill={tone(pad.id, 0.55)} stroke={stroke(pad.id)} strokeWidth={sw(pad.id)} />
          <text x={pad.x + 8} y={CL + 72} fill="#f4fbff" fontSize="13" fontFamily="Vazirmatn, sans-serif" pointerEvents="none">{pad.label}</text>
        </>
      ))}</g>)}

      <g pointerEvents="none" fontFamily="Vazirmatn, sans-serif">
        {[
          [120, "فن", "FAN"],
          [320, "بوستر", "LPC"],
          [540, "کمپرسور", "HPC"],
          [730, "محفظه", "COMB"],
          [880, "پرفشار", "HPT"],
          [1020, "کم‌فشار", "LPT"],
          [188, "ملحقات", "AGB"],
        ].map(([x, fa, en]) => (
          <g key={String(en)}>
            <text x={Number(x)} y={en === "AGB" ? CL + 108 : 86} fill="#f4fbff" fontSize="16">{fa}</text>
            <text x={Number(x)} y={en === "AGB" ? CL + 126 : 104} fill="#9db4d4" fontSize="12">{en}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
