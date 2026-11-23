"use client";

import { metalTint } from "@/lib/health-color";

type Mod = { code: string; healthIndex: number | null; name: string };

const CL = 448;

function y(r: number) {
  return CL - r;
}

function catmull(poly: [number, number][], x: number) {
  if (x <= poly[0][0]) return poly[0][1];
  if (x >= poly[poly.length - 1][0]) return poly[poly.length - 1][1];
  let i = 1;
  while (i < poly.length - 1 && poly[i][0] < x) i += 1;
  const p0 = poly[Math.max(0, i - 2)];
  const p1 = poly[i - 1];
  const p2 = poly[i];
  const p3 = poly[Math.min(poly.length - 1, i + 1)];
  const t = (x - p1[0]) / (p2[0] - p1[0] || 1);
  const tt = t * t;
  const ttt = tt * t;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * tt + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * ttt);
}

function band(outer: [number, number][], inner: [number, number][], x0: number, x1: number, steps = 32) {
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + ((x1 - x0) * i) / steps;
    top.push(`${x.toFixed(1)},${y(Math.max(0, catmull(outer, x))).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${y(Math.max(0, catmull(inner, x))).toFixed(1)}`);
  }
  return `M ${top[0]} L ${top.slice(1).join(" L ")} L ${bot.reverse().join(" L ")} Z`;
}

const OUTER: [number, number][] = [
  [78, 188],
  [96, 230],
  [118, 268],
  [150, 286],
  [210, 292],
  [360, 286],
  [560, 278],
  [760, 268],
  [920, 248],
  [1040, 214],
];

const CASE: [number, number][] = [
  [78, 188],
  [108, 168],
  [132, 214],
  [168, 252],
  [210, 262],
  [300, 256],
  [520, 248],
  [740, 236],
  [900, 214],
  [1040, 186],
];

const COWL: [number, number][] = [
  [248, 78],
  [270, 128],
  [320, 136],
  [500, 128],
  [620, 122],
  [700, 148],
  [790, 156],
  [860, 132],
  [960, 108],
  [1040, 78],
];

const HUB: [number, number][] = [
  [118, 0],
  [160, 28],
  [198, 64],
  [230, 72],
  [280, 58],
  [420, 52],
  [620, 50],
  [760, 54],
  [900, 46],
  [1000, 36],
  [1060, 0],
];

function blade(x: number, hubR: number, tipR: number, chord: number, lean: number) {
  const yH = y(hubR);
  const yT = y(tipR);
  const xT = x + lean;
  const thick = Math.max(3.4, chord * 0.32);
  const teH = x + chord * 0.78;
  const teT = xT + chord * 0.92;
  return [
    `M ${x.toFixed(1)} ${yH.toFixed(1)}`,
    `Q ${(x - thick * 0.25).toFixed(1)} ${((yH + yT) / 2).toFixed(1)} ${xT.toFixed(1)} ${yT.toFixed(1)}`,
    `Q ${(xT + chord * 0.5).toFixed(1)} ${(yT - 1).toFixed(1)} ${teT.toFixed(1)} ${(yT + (yH - yT) * 0.16).toFixed(1)}`,
    `Q ${(teH + thick * 0.2).toFixed(1)} ${((yH + yT) / 2).toFixed(1)} ${teH.toFixed(1)} ${yH.toFixed(1)}`,
    `Q ${(x + chord * 0.4).toFixed(1)} ${(yH + thick * 0.55).toFixed(1)} ${x.toFixed(1)} ${yH.toFixed(1)}`,
    "Z",
  ].join(" ");
}

function Row({
  x,
  hubR,
  tipR,
  chord,
  lean,
  fill,
  disk = true,
}: {
  x: number;
  hubR: number;
  tipR: number;
  chord: number;
  lean: number;
  fill: string;
  disk?: boolean;
}) {
  return (
    <g>
      {disk ? (
        <path
          d={`M ${(x - 1.5).toFixed(1)} ${y(hubR + 4).toFixed(1)} h ${(chord * 0.62).toFixed(1)} v ${(y(Math.max(10, hubR - 10)) - y(hubR + 4)).toFixed(1)} h ${(-chord * 0.62).toFixed(1)} Z`}
          fill="#8b9bab"
          stroke="#1a2630"
          strokeWidth={0.5}
        />
      ) : null}
      <path d={blade(x, hubR, tipR, chord, lean)} fill={fill} stroke="#172028" strokeWidth={0.8} />
    </g>
  );
}

export function Cutaway({
  modules,
  stations = [],
  selected,
  isolated = [],
  onSelect,
}: {
  modules: Mod[];
  stations?: { id: string; moduleCode: string; health: number | null; short: string }[];
  selected: string;
  isolated?: string[];
  onSelect: (code: string, shift: boolean) => void;
}) {
  const byStation = new Map(stations.map((item) => [item.id, item.health]));
  const byModule = new Map(modules.map((mod) => [mod.code, mod.healthIndex]));
  const tone = (id: string, amount = 0.62) => metalTint(byStation.get(id) ?? byModule.get(id) ?? null, amount);
  const hot = (id: string) => isolated.includes(id) || selected === id;
  const pick = (id: string) => (event: { stopPropagation: () => void; shiftKey?: boolean }) => {
    event.stopPropagation();
    onSelect(id, Boolean(event.shiftKey));
  };
  const zones = [
    { code: "FAN", x0: 78, x1: 250 },
    { code: "LPC", x0: 250, x1: 400 },
    { code: "HPC", x0: 400, x1: 640 },
    { code: "COMB", x0: 640, x1: 800 },
    { code: "HPT", x0: 800, x1: 870 },
    { code: "LPT", x0: 870, x1: 1040 },
  ];
  const hpc = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return { x: 412 + i * 24, hub: 52 + t * 3, tip: 118 - t * 46, chord: 16 - t * 5, lean: 4 };
  });
  const lpc = [
    { x: 286, hub: 58, tip: 124, chord: 18, lean: 5 },
    { x: 322, hub: 55, tip: 112, chord: 16, lean: 4.5 },
    { x: 356, hub: 52, tip: 100, chord: 15, lean: 4 },
  ];
  const lpt = [
    { x: 888, hub: 48, tip: 86, chord: 20, lean: 6 },
    { x: 932, hub: 44, tip: 104, chord: 19, lean: 5.5 },
    { x: 976, hub: 40, tip: 124, chord: 18, lean: 5 },
    { x: 1018, hub: 36, tip: 146, chord: 16, lean: 4 },
  ];

  return (
    <svg className={isolated.length ? "iso" : ""} viewBox="0 0 1100 640" role="img" aria-label="Original longitudinal half-section of a two-spool turbofan">
      <defs>
        <linearGradient id="ecm-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7fbfe" />
          <stop offset="0.4" stopColor="#c5d0da" />
          <stop offset="1" stopColor="#6a7886" />
        </linearGradient>
        <linearGradient id="ecm-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7eef3" />
          <stop offset="1" stopColor="#7b8b99" />
        </linearGradient>
      </defs>
      <rect width="1100" height="640" fill="#070e15" />
      <text x="16" y="22" fill="#8ea6bb" fontSize="11" fontFamily="ui-monospace, monospace">
        ORIGINAL SECTION — NOT AN OEM DRAWING
      </text>

      <path d={band(CASE, COWL, 270, 1040, 36)} fill="#101820" />
      <path d={`M 198 ${y(70)} L 1000 ${y(40)} L 1060 ${CL} L 118 ${CL} Z`} fill="#0c141c" />

      {zones.map((zone) => (
        <g key={zone.code} data-module={zone.code} onClick={() => onSelect(zone.code, false)} style={{ cursor: "pointer" }}>
          <path d={band(OUTER, CASE, zone.x0, zone.x1, 16)} fill="url(#ecm-metal)" stroke="#24313c" strokeWidth={0.7} />
          <path d={band(OUTER, CASE, zone.x0, zone.x1, 16)} fill={tone(zone.code, 0.12)} />
          {hot(zone.code) ? <path d={band(OUTER, CASE, zone.x0, zone.x1, 16)} fill="none" stroke="#f4fbff" strokeWidth={1.8} /> : null}
        </g>
      ))}

      <path d={`M 118 ${CL} C 140 ${y(10)}, 168 ${y(36)}, 198 ${y(66)} L 214 ${y(72)} L 198 ${y(64)} C 172 ${y(34)}, 146 ${y(8)}, 118 ${CL} Z`} fill="url(#ecm-metal)" stroke="#24313c" />
      <path d={`M 118 ${CL} C 140 ${y(10)}, 168 ${y(36)}, 198 ${y(66)} L 214 ${y(72)} L 198 ${y(64)} C 172 ${y(34)}, 146 ${y(8)}, 118 ${CL} Z`} fill={tone("FAN", 0.42)} />

      <path d={`M 214 ${y(9)} L 1024 ${y(9)} L 1024 ${CL} L 214 ${CL} Z`} fill="url(#ecm-shaft)" />
      <path d={`M 214 ${y(5.5)} L 1024 ${y(5.5)} L 1024 ${y(9)} L 214 ${y(9)} Z`} fill="#5d6c7a" />
      <path d={`M 400 ${y(16)} L 830 ${y(16)} L 830 ${y(9)} L 400 ${y(9)} Z`} fill="#d5dee6" stroke="#2a3844" strokeWidth={0.6} />
      <path d={`M 118 ${CL} H 1064`} stroke="#9fb0c0" strokeWidth={0.9} strokeDasharray="11 4 2 4" />

      <path
        d={`M 248 ${y(78)} C 232 ${y(96)}, 236 ${y(124)}, 268 ${y(132)} L 276 ${y(122)} C 258 ${y(116)}, 254 ${y(100)}, 262 ${y(86)} Z`}
        fill={tone("LPC", 0.55)}
        stroke="#172028"
        strokeWidth={0.8}
      />

      <g data-module="FAN" onClick={() => onSelect("FAN", false)} style={{ cursor: "pointer" }}>
        <path data-station="FAN-DISK" data-on={hot("FAN-DISK") ? "1" : "0"} onClick={pick("FAN-DISK")} d={`M 196 ${y(78)} L 232 ${y(78)} L 228 ${y(22)} L 198 ${y(22)} Z`} fill={tone("FAN-DISK", 0.55)} stroke={hot("FAN-DISK") ? "#f4fbff" : "#172028"} strokeWidth={hot("FAN-DISK") ? 1.6 : 0.7} />
        <path data-station="FAN-BLD" data-on={hot("FAN-BLD") ? "1" : "0"} onClick={pick("FAN-BLD")} d={blade(170, 68, 258, 56, 16)} fill={tone("FAN-BLD", 0.72)} stroke={hot("FAN-BLD") ? "#f4fbff" : "#172028"} strokeWidth={hot("FAN-BLD") ? 1.6 : 0.9} />
        <path d={`M 64 ${y(160)} Q 86 ${y(230)}, 130 ${y(286)} Q 168 ${y(300)}, 220 ${y(296)}`} fill="none" stroke="#e7eef3" strokeWidth={3.2} pointerEvents="none" />
        <path data-station="FAN-OGV" data-on={hot("FAN-OGV") ? "1" : "0"} onClick={pick("FAN-OGV")} d={blade(232, 150, 254, 14, -3)} fill={tone("FAN-OGV", 0.4)} stroke="#172028" strokeWidth={0.6} />
        <path data-station="FAN-SPIN" data-on={hot("FAN-SPIN") ? "1" : "0"} onClick={pick("FAN-SPIN")} d={`M 150 ${CL} C 168 ${y(8)} 188 ${y(28)} 206 ${y(58)} L 196 ${y(62)} C 180 ${y(30)} 164 ${y(6)} 150 ${CL} Z`} fill={tone("FAN-SPIN", 0.5)} stroke="#172028" />
      </g>

      <g data-module="LPC" onClick={() => onSelect("LPC", false)} style={{ cursor: "pointer" }}>
        {lpc.map((stage, index) => (
          <g key={stage.x} data-station={`LPC-S${index + 1}`} data-on={hot(`LPC-S${index + 1}`) ? "1" : "0"} onClick={pick(`LPC-S${index + 1}`)}>
            <Row x={stage.x} hubR={stage.hub} tipR={stage.tip} chord={stage.chord} lean={stage.lean} fill={tone(`LPC-S${index + 1}`, 0.66)} />
          </g>
        ))}
        <g data-station="LPC-ST" data-on={hot("LPC-ST") ? "1" : "0"} onClick={pick("LPC-ST")}>
          {lpc.slice(0, 2).map((stage) => (
            <Row key={`s${stage.x}`} x={stage.x + 18} hubR={stage.hub + 8} tipR={stage.tip - 6} chord={8} lean={-3} fill={tone("LPC-ST", 0.36)} disk={false} />
          ))}
        </g>
        <text data-station="VBV" data-on={hot("VBV") ? "1" : "0"} onClick={pick("VBV")} x="360" y={y(150)} fill={hot("VBV") ? "#f4fbff" : "#9fb0c0"} fontSize="10">VBV</text>
      </g>

      <g data-module="HPC" onClick={() => onSelect("HPC", false)} style={{ cursor: "pointer" }}>
        <g data-station="HPC-IGV" data-on={hot("HPC-IGV") ? "1" : "0"} onClick={pick("HPC-IGV")}>
          <Row x={392} hubR={54} tipR={124} chord={10} lean={-2} fill={tone("HPC-IGV", 0.4)} disk={false} />
        </g>
        {hpc.map((stage, index) => (
          <g key={stage.x} data-station={`HPC-S${index + 1}`} data-on={hot(`HPC-S${index + 1}`) ? "1" : "0"} onClick={pick(`HPC-S${index + 1}`)}>
            <Row x={stage.x} hubR={stage.hub} tipR={stage.tip} chord={stage.chord} lean={stage.lean} fill={tone(`HPC-S${index + 1}`, index === 5 ? 0.82 : 0.7)} />
          </g>
        ))}
        <text data-station="VSV" data-on={hot("VSV") ? "1" : "0"} onClick={pick("VSV")} x="560" y={y(150)} fill={hot("VSV") ? "#f4fbff" : "#9fb0c0"} fontSize="10">VSV</text>
      </g>

      <g data-module="COMB" data-station="COMB-LINER" data-on={hot("COMB-LINER") ? "1" : "0"} onClick={pick("COMB-LINER")} style={{ cursor: "pointer" }}>
        <path
          d={`M 648 ${y(64)}
              C 662 ${y(96)}, 700 ${y(128)}, 748 ${y(132)}
              C 800 ${y(134)}, 824 ${y(108)}, 836 ${y(82)}
              L 830 ${y(74)}
              C 812 ${y(96)}, 776 ${y(108)}, 736 ${y(104)}
              C 700 ${y(100)}, 674 ${y(84)}, 662 ${y(64)} Z`}
          fill={tone("COMB", 0.58)}
          stroke="#172028"
          strokeWidth={0.9}
        />
        <path
          d={`M 668 ${y(56)}
              C 700 ${y(46)}, 760 ${y(44)}, 812 ${y(52)}
              L 824 ${y(62)}
              C 780 ${y(54)}, 720 ${y(52)}, 684 ${y(60)} Z`}
          fill={tone("COMB", 0.36)}
          stroke="#172028"
          strokeWidth={0.7}
        />
        <path d={`M 700 ${y(112)} C 740 ${y(122)}, 790 ${y(116)}, 818 ${y(96)}`} fill="none" stroke="#e7b184" strokeWidth={1.4} opacity={0.75} />
        <g data-station="COMB-NOZ" data-on={hot("COMB-NOZ") ? "1" : "0"} onClick={pick("COMB-NOZ")}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={706 + i * 18} cy={y(118 - i)} r={2.2} fill={tone("COMB-NOZ", 0.5)} stroke="#172028" />
          ))}
        </g>
        <g data-station="COMB-IGN" data-on={hot("COMB-IGN") ? "1" : "0"} onClick={pick("COMB-IGN")}>
          <rect x={742} y={y(150)} width={6} height={16} fill={tone("COMB-IGN", 0.5)} />
          <rect x={786} y={y(146)} width={6} height={16} fill={tone("COMB-IGN", 0.5)} />
        </g>
      </g>

      <g data-module="HPT" onClick={() => onSelect("HPT", false)} style={{ cursor: "pointer" }}>
        <g data-station="HPT-NGV" data-on={hot("HPT-NGV") ? "1" : "0"} onClick={pick("HPT-NGV")}>
          <Row x={808} hubR={62} tipR={86} chord={14} lean={-4} fill={tone("HPT-NGV", 0.4)} disk={false} />
        </g>
        <g data-station="HPT-BLD" data-on={hot("HPT-BLD") ? "1" : "0"} onClick={pick("HPT-BLD")}>
          <Row x={830} hubR={54} tipR={84} chord={22} lean={5} fill={tone("HPT-BLD", 0.66)} />
        </g>
        <circle data-station="HPT-DISK" data-on={hot("HPT-DISK") ? "1" : "0"} onClick={pick("HPT-DISK")} cx={838} cy={y(40)} r={7} fill={tone("HPT-DISK", 0.8)} stroke={hot("HPT-DISK") ? "#f4fbff" : "#172028"} />
      </g>

      <g data-module="LPT" onClick={() => onSelect("LPT", false)} style={{ cursor: "pointer" }}>
        {lpt.map((stage, index) => (
          <g key={stage.x} data-station={`LPT-S${index + 1}`} data-on={hot(`LPT-S${index + 1}`) ? "1" : "0"} onClick={pick(`LPT-S${index + 1}`)}>
            <Row x={stage.x} hubR={stage.hub} tipR={stage.tip} chord={stage.chord} lean={stage.lean} fill={tone(`LPT-S${index + 1}`, 0.55)} />
          </g>
        ))}
        <path d={`M 1048 ${y(34)} C 1076 ${y(20)}, 1096 ${y(8)}, 1104 ${CL} L 1048 ${y(16)} Z`} fill="url(#ecm-metal)" stroke="#24313c" strokeWidth={0.7} />
        <path data-station="LPT-TRF" data-on={hot("LPT-TRF") ? "1" : "0"} onClick={pick("LPT-TRF")} d={`M 1048 ${y(34)} C 1076 ${y(20)}, 1096 ${y(8)}, 1104 ${CL} L 1048 ${y(16)} Z`} fill={tone("LPT-TRF", 0.45)} />
      </g>

      {[
        ["BRG-1", 214, 28],
        ["BRG-2", 392, 26],
        ["BRG-3", 620, 24],
        ["BRG-4", 824, 26],
        ["BRG-5", 1036, 22],
      ].map(([id, bx, br], index) => (
        <g key={String(id)} data-station={id} data-on={hot(String(id)) ? "1" : "0"} onClick={pick(String(id))} style={{ cursor: "pointer" }}>
          <circle cx={Number(bx)} cy={y(Number(br))} r={6.2} fill="#101820" stroke={tone(String(id), 0.8)} strokeWidth={hot(String(id)) ? 2.4 : 1.6} />
          <circle cx={Number(bx)} cy={y(Number(br))} r={1.7} fill="#eef4f8" />
          <text x={Number(bx) - 3} y={y(Number(br)) - 9} fill="#d5e2ec" fontSize="9">{index + 1}</text>
        </g>
      ))}

      <g data-module="AGB" onClick={() => onSelect("AGB", false)} style={{ cursor: "pointer" }}>
        <path d={`M 214 ${y(40)} V ${CL + 18}`} stroke="#8ea0ae" strokeWidth={4} />
        <path
          d={`M 188 ${CL + 16} H 292 C 318 ${CL + 18} 326 ${CL + 42} 308 ${CL + 68} H 176 C 150 ${CL + 66} 142 ${CL + 40} 162 ${CL + 18} Z`}
          fill={tone("AGB", 0.52)}
          stroke={hot("AGB") ? "#f4fbff" : "#172028"}
          strokeWidth={hot("AGB") ? 1.7 : 0.8}
        />
        <circle cx={214} cy={CL + 42} r={11} fill="none" stroke="#24313c" strokeWidth={1.5} pointerEvents="none" />
        <circle cx={248} cy={CL + 46} r={8} fill="none" stroke="#24313c" strokeWidth={1.3} pointerEvents="none" />
      </g>
      <g data-module="LUBE" onClick={() => onSelect("LUBE", false)} style={{ cursor: "pointer" }}>
        <path d={`M 308 ${CL + 40} H 332`} stroke="#8ea0ae" strokeWidth={2.5} />
        <rect x={332} y={CL + 28} width={52} height={24} rx={9} fill={tone("LUBE", 0.55)} stroke={hot("LUBE") ? "#f4fbff" : "#172028"} strokeWidth={hot("LUBE") ? 1.7 : 0.8} />
      </g>

      <g fill="#e7f0f7" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight={700} pointerEvents="none">
        <text x="168" y={y(228)}>FAN</text>
        <text x="300" y={y(210)}>LPC</text>
        <text x="500" y={y(200)}>HPC</text>
        <text x="700" y={y(196)}>COMB</text>
        <text x="812" y={y(188)}>HPT</text>
        <text x="940" y={y(176)}>LPT</text>
      </g>
      <text x="20" y={CL - 2} fill="#8ea6bb" fontSize="10" fontFamily="ui-monospace, monospace">
        LP
      </text>
      <text x="408" y={y(22)} fill="#8ea6bb" fontSize="10" fontFamily="ui-monospace, monospace">
        HP
      </text>
    </svg>
  );
}
