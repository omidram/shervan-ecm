"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { healthColor } from "@/lib/health-color";

type Mod = { code: string; healthIndex: number | null };

const FAN_R = 1.02;
const AX = {
  lip: -2.12,
  fan: -1.58,
  lpc0: -1.08,
  hpc0: -0.48,
  hpc1: 0.4,
  comb0: 0.52,
  comb1: 1.08,
  hpt: 1.2,
  lpt0: 1.4,
  lpt1: 2.12,
  plug: 2.62,
};

function revolve(profile: [number, number][], segments = 56) {
  const positions: number[] = [];
  const row = segments + 1;
  for (const [x, radius] of profile) {
    for (let j = 0; j <= segments; j += 1) {
      const a = (j / segments) * Math.PI * 2;
      positions.push(x, Math.cos(a) * radius, Math.sin(a) * radius);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < profile.length - 1; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function naca(t: number) {
  const x = Math.min(Math.max(t, 0), 1);
  return 0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x;
}

function makeBlade(spec: {
  radius0: number;
  radius1: number;
  chord0: number;
  chord1: number;
  twist0: number;
  twist1: number;
  sweep: number;
  thick: number;
  lean?: number;
}) {
  const spanN = 18;
  const chorN = 22;
  const verts: number[] = [];
  const push = (x: number, y: number, z: number) => {
    verts.push(x, y, z);
    return verts.length / 3 - 1;
  };
  const idx: number[][][] = [[], []];
  for (let s = 0; s <= spanN; s += 1) {
    const u = s / spanN;
    const radius = spec.radius0 + (spec.radius1 - spec.radius0) * u;
    const chord = spec.chord0 + (spec.chord1 - spec.chord0) * u + Math.sin(u * Math.PI) * spec.chord0 * 0.12;
    const twist = spec.twist0 + (spec.twist1 - spec.twist0) * u;
    const sweep = spec.sweep * u * u;
    const lean = (spec.lean ?? 0) * u * u;
    const thick = spec.thick * (1.15 - u * 0.7);
    idx[0][s] = [];
    idx[1][s] = [];
    for (let c = 0; c <= chorN; c += 1) {
      const t = c / chorN;
      const yt = naca(t) * thick * chord;
      const x0 = (t - 0.32) * chord;
      for (const side of [1, -1]) {
        const axial = x0 * Math.cos(twist) - side * yt * Math.sin(twist) + sweep;
        const tang = x0 * Math.sin(twist) + side * yt * Math.cos(twist) + lean;
        idx[side === 1 ? 0 : 1][s][c] = push(axial, radius, tang);
      }
    }
  }
  const tri: number[] = [];
  const add = (a: number, b: number, c: number) => tri.push(a, b, c);
  for (let side = 0; side < 2; side += 1) {
    for (let s = 0; s < spanN; s += 1) {
      for (let c = 0; c < chorN; c += 1) {
        const a = idx[side][s][c];
        const b = idx[side][s][c + 1];
        const d = idx[side][s + 1][c];
        const e = idx[side][s + 1][c + 1];
        if (side === 0) {
          add(a, d, b);
          add(b, d, e);
        } else {
          add(a, b, d);
          add(b, e, d);
        }
      }
    }
  }
  const stitch = (c: number, flip: boolean) => {
    for (let s = 0; s < spanN; s += 1) {
      const a = idx[0][s][c];
      const b = idx[1][s][c];
      const d = idx[0][s + 1][c];
      const e = idx[1][s + 1][c];
      if (flip) {
        add(a, b, d);
        add(b, e, d);
      } else {
        add(a, d, b);
        add(b, d, e);
      }
    }
  };
  stitch(0, true);
  stitch(chorN, false);
  for (let c = 0; c < chorN; c += 1) {
    add(idx[0][0][c], idx[0][0][c + 1], idx[1][0][c]);
    add(idx[1][0][c], idx[0][0][c + 1], idx[1][0][c + 1]);
    const s = spanN;
    add(idx[0][s][c], idx[1][s][c], idx[0][s][c + 1]);
    add(idx[1][s][c], idx[1][s][c + 1], idx[0][s][c + 1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(tri);
  geo.computeVertexNormals();
  return geo;
}

function ring(spec: Parameters<typeof makeBlade>[0], count: number, axial: number) {
  const one = makeBlade(spec);
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i += 1) {
    const g = one.clone();
    g.applyMatrix4(new THREE.Matrix4().makeRotationX((i / count) * Math.PI * 2));
    g.translate(axial, 0, 0);
    geos.push(g);
  }
  one.dispose();
  return merge(geos);
}

function sleeve(x0: number, x1: number, r0: number, r1: number, thick = 0.028) {
  return revolve([
    [x0, r0],
    [x1, r1],
    [x1, r1 + thick],
    [x0, r0 + thick],
  ]);
}

function disk(x: number, inner: number, outer: number, width: number) {
  return revolve([
    [x - width / 2, inner],
    [x + width / 2, inner],
    [x + width / 2, outer],
    [x - width / 2, outer],
    [x - width / 2, inner],
  ]);
}

function merge(geos: THREE.BufferGeometry[]) {
  let vertCount = 0;
  let indexCount = 0;
  for (const geo of geos) {
    vertCount += geo.getAttribute("position").count;
    indexCount += geo.getIndex()?.count ?? 0;
  }
  const pos = new Float32Array(vertCount * 3);
  const idx = new Uint32Array(indexCount);
  let vOff = 0;
  let iOff = 0;
  for (const geo of geos) {
    const p = geo.getAttribute("position");
    pos.set(p.array as Float32Array, vOff * 3);
    const index = geo.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 1) idx[iOff + i] = index.getX(i) + vOff;
      iOff += index.count;
    }
    vOff += p.count;
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeVertexNormals();
  return out;
}

type Finish = "stage" | "gold" | "liner" | "blade" | "spinner" | "steel" | "tank" | "orange" | "harness" | "gear" | "paint";

type Piece = {
  id: string;
  module: string;
  geo: THREE.BufferGeometry;
  clip: boolean;
  finish: Finish;
  pick: boolean;
};

const FINISH: Record<Finish, { color: string; metal: number; rough: number }> = {
  stage: { color: "#c5ced6", metal: 0.74, rough: 0.38 },
  gold: { color: "#c6a15a", metal: 0.86, rough: 0.28 },
  liner: { color: "#3c6d96", metal: 0.28, rough: 0.62 },
  blade: { color: "#5d676e", metal: 0.72, rough: 0.34 },
  spinner: { color: "#14171b", metal: 0.45, rough: 0.42 },
  steel: { color: "#b7c3cc", metal: 0.8, rough: 0.32 },
  tank: { color: "#8e989f", metal: 0.62, rough: 0.38 },
  orange: { color: "#e25822", metal: 0.22, rough: 0.46 },
  harness: { color: "#1a1e22", metal: 0.12, rough: 0.72 },
  gear: { color: "#667078", metal: 0.58, rough: 0.4 },
  paint: { color: "#f4f7fb", metal: 0.05, rough: 0.4 },
};

function ball(x: number, y: number, z: number, r: number) {
  const geo = new THREE.SphereGeometry(r, 18, 14);
  geo.translate(x, y, z);
  return geo;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return geo;
}

function rod(a: [number, number, number], b: [number, number, number], r: number) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = Math.max(dir.length(), 0.001);
  const geo = new THREE.CylinderGeometry(r, r, len, 14);
  geo.translate(0, len / 2, 0);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  geo.translate(start.x, start.y, start.z);
  return geo;
}

function tube(points: [number, number, number][], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, 48, radius, 6, false);
}

function helix(x0: number, x1: number, r0: number, r1: number, turns: number, radius: number) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 64; i += 1) {
    const u = i / 64;
    const a = u * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * u;
    pts.push([x0 + (x1 - x0) * u, Math.cos(a) * r, Math.sin(a) * r]);
  }
  return tube(pts, radius);
}

function buildGeometry() {
  const nacelle = revolve([
    [2.48, 0.9],
    [1.7, 1.08],
    [0.2, 1.16],
    [-1.35, 1.2],
    [-1.82, 1.14],
    [-2.0, 1.0],
    [-2.16, 1.1],
    [-2.04, 1.28],
    [-1.72, 1.32],
    [-0.3, 1.3],
    [1.15, 1.24],
    [2.2, 1.12],
    [2.68, 0.96],
  ]);
  const lip = new THREE.TorusGeometry(1.08, 0.085, 16, 56);
  lip.rotateY(Math.PI / 2);
  lip.translate(-2.08, 0, 0);
  const fanCase = merge([
    lip,
    sleeve(-2.02, -1.12, 1.05, 1.02, 0.055),
    sleeve(-1.9, -1.84, 1.1, 1.1, 0.04),
    sleeve(-1.48, -1.42, 1.09, 1.09, 0.035),
    sleeve(-1.18, -1.12, 1.08, 1.08, 0.035),
  ]);
  const spinner = revolve([
    [-2.42, 0],
    [-2.28, 0.07],
    [-2.05, 0.18],
    [-1.82, 0.3],
    [-1.62, 0.36],
    [-1.56, 0.34],
    [-1.56, 0],
  ]);
  const fanDisk = disk(AX.fan, 0.08, 0.36, 0.1);
  const fanBlades = ring(
    { radius0: 0.34, radius1: 0.98, chord0: 0.32, chord1: 0.12, twist0: 0.62, twist1: -0.2, sweep: 0.14, thick: 0.065, lean: 0.05 },
    24,
    AX.fan,
  );

  const pieces: Piece[] = [];
  const put = (
    id: string,
    module: string,
    geo: THREE.BufferGeometry,
    clip: boolean,
    finish: Finish = "stage",
    pick = true,
  ) => pieces.push({ id, module, geo, clip, finish, pick });
  put("FAN-CASE", "FAN", fanCase, false, "gold");
  put("FAN-SPIN", "FAN", spinner, false, "spinner");
  put("dress-spiral", "FAN", helix(-2.22, -1.7, 0.05, 0.28, 1.15, 0.012), false, "paint", false);
  put("FAN-DISK", "FAN", fanDisk, true, "steel");
  put("FAN-BLD", "FAN", fanBlades, false, "blade");
  put("dress-barrel", "FAN", sleeve(-2.12, -1.7, 0.96, 0.99, 0.03), false, "liner", false);
  put(
    "FAN-OGV",
    "FAN",
    ring({ radius0: 0.42, radius1: 0.96, chord0: 0.11, chord1: 0.07, twist0: 0.12, twist1: 0.02, sweep: 0, thick: 0.07 }, 18, -1.28),
    false,
  );

  [0, 1, 2].forEach((i) => {
    const x = AX.lpc0 + i * 0.16;
    const tip = 0.5 - i * 0.035;
    put(
      `LPC-S${i + 1}`,
      "LPC",
      merge([
        ring({ radius0: 0.3, radius1: tip, chord0: 0.1, chord1: 0.07, twist0: 0.45, twist1: 0.05, sweep: 0.03, thick: 0.1 }, 20, x),
        disk(x, 0.1, 0.3, 0.035),
      ]),
      true,
    );
  });
  put(
    "LPC-ST",
    "LPC",
    merge([
      ring({ radius0: 0.28, radius1: 0.4, chord0: 0.06, chord1: 0.04, twist0: -0.1, twist1: 0, sweep: 0, thick: 0.08 }, 22, AX.lpc0 + 0.46),
      sleeve(AX.lpc0 - 0.06, AX.lpc0 + 0.5, 0.52, 0.42, 0.03),
    ]),
    true,
  );

  put(
    "HPC-IGV",
    "HPC",
    ring({ radius0: 0.28, radius1: 0.5, chord0: 0.07, chord1: 0.045, twist0: 0.15, twist1: 0, sweep: 0, thick: 0.08 }, 22, AX.hpc0 - 0.1),
    false,
  );
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const x = AX.hpc0 + t * (AX.hpc1 - AX.hpc0);
    const tip = 0.48 - t * 0.16;
    put(
      `HPC-S${i + 1}`,
      "HPC",
      merge([
        ring(
          { radius0: 0.26, radius1: tip, chord0: 0.075 - t * 0.02, chord1: 0.05 - t * 0.012, twist0: 0.5, twist1: 0.08, sweep: 0.02, thick: 0.11 },
          18,
          x,
        ),
        disk(x, 0.1, 0.25, 0.022),
      ]),
      true,
    );
  }
  put("VSV", "HPC", box(0.28, 0.05, 0.07, 0.0, 0.4, 0.02), false);

  const combustor = revolve([
    [0.56, 0.3],
    [0.68, 0.28],
    [0.9, 0.36],
    [1.06, 0.48],
    [1.02, 0.62],
    [0.8, 0.68],
    [0.6, 0.52],
    [0.52, 0.38],
    [0.56, 0.3],
  ]);
  put("COMB-LINER", "COMB", combustor, true);
  const nozzles: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    nozzles.push(ball(0.78, Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0.032));
  }
  put("COMB-NOZ", "COMB", merge(nozzles), false);
  const ignA = new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8);
  ignA.rotateZ(Math.PI / 2);
  ignA.translate(0.9, 0.7, 0.05);
  const ignB = ignA.clone();
  ignB.translate(0, 0, -0.1);
  put("COMB-IGN", "COMB", merge([ignA, ignB]), false);

  put("HPT-NGV", "HPT", ring({ radius0: 0.26, radius1: 0.4, chord0: 0.08, chord1: 0.05, twist0: -0.2, twist1: 0, sweep: 0, thick: 0.09 }, 24, AX.hpt - 0.1), true);
  put("HPT-DISK", "HPT", disk(AX.hpt, 0.1, 0.28, 0.06), false);
  put("HPT-BLD", "HPT", ring({ radius0: 0.28, radius1: 0.42, chord0: 0.12, chord1: 0.08, twist0: 0.7, twist1: 0.15, sweep: 0.04, thick: 0.12 }, 22, AX.hpt), true);
  put("HPT-SHRD", "HPT", sleeve(AX.hpt - 0.08, AX.hpt + 0.12, 0.4, 0.44, 0.03), true);

  [0, 1, 2, 3].forEach((i) => {
    const t = i / 3;
    const x = AX.lpt0 + t * (AX.lpt1 - AX.lpt0);
    const tip = 0.46 + t * 0.2;
    put(
      `LPT-S${i + 1}`,
      "LPT",
      merge([
        ring({ radius0: 0.24, radius1: tip, chord0: 0.1, chord1: 0.08, twist0: 0.55, twist1: 0.05, sweep: 0.03, thick: 0.1 }, 20, x),
        disk(x, 0.08, 0.24, 0.03),
      ]),
      true,
    );
  });
  put("LPT-CASE", "LPT", sleeve(AX.lpt0 - 0.06, AX.lpt1 + 0.08, 0.48, 0.7, 0.03), true);
  const plug = revolve([
    [2.08, 0.2],
    [2.3, 0.12],
    [2.58, 0.02],
    [2.58, 0],
    [2.08, 0],
  ]);

  const lpShaft = revolve([
    [-1.55, 0],
    [-1.55, 0.045],
    [2.05, 0.04],
    [2.05, 0],
  ]);
  const hpShaft = revolve([
    [-0.55, 0.05],
    [-0.55, 0.09],
    [1.25, 0.085],
    [1.25, 0.05],
  ]);

  const housing = roundedBox(1.05, 0.36, 0.62, 0.1);
  housing.translate(-1.55, -1.68, 0.08);
  const radial = rod([-1.42, -0.28, 0], [-1.42, -1.22, 0], 0.045);
  const tgb = roundedBox(0.28, 0.22, 0.24, 0.04);
  tgb.translate(-1.42, -1.28, 0.02);
  const layshaft = rod([-1.42, -1.28, 0.02], [-1.7, -1.62, 0.08], 0.04);
  const pads: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i += 1) {
    const pad = new THREE.CylinderGeometry(0.07, 0.08, 0.08, 16);
    pad.rotateX(Math.PI / 2);
    pad.translate(-1.9 + i * 0.22, -1.68, 0.38);
    pads.push(pad);
  }
  put("AGB", "AGB", merge([housing, radial, tgb, layshaft, ...pads]), false, "gear");
  const tank = new THREE.SphereGeometry(0.28, 28, 18);
  tank.scale(1.55, 0.9, 0.78);
  tank.translate(-1.2, -1.05, 0.95);
  const tankNeck = new THREE.CylinderGeometry(0.05, 0.07, 0.16, 12);
  tankNeck.translate(-1.28, -0.78, 0.55);
  put("OIL-TANK", "LUBE", merge([tank, tankNeck]), false, "tank");
  put("LPT-TRF", "LPT", plug, false, "steel");
  put("BRG-1", "LUBE", ball(-1.55, 0.12, 0, 0.055), false, "steel");
  put("BRG-2", "LUBE", ball(-0.9, 0.12, 0, 0.05), false, "steel");
  put("BRG-3", "LUBE", ball(0.15, 0.11, 0, 0.048), false, "steel");
  put("BRG-4", "LUBE", ball(1.22, 0.11, 0, 0.05), false, "steel");
  put("BRG-5", "LUBE", ball(2.02, 0.1, 0, 0.046), false, "steel");
  const pumpBody = new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16);
  pumpBody.rotateZ(Math.PI / 2);
  pumpBody.translate(-0.82, -1.48, 0.42);
  const pumpHead = new THREE.BoxGeometry(0.12, 0.1, 0.1);
  pumpHead.translate(-0.68, -1.48, 0.42);
  put("OIL-PUMP", "LUBE", merge([pumpBody, pumpHead, rod([-0.95, -1.05, 0.55], [-0.82, -1.4, 0.42], 0.018)]), false, "gear");
  const filter = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 16);
  filter.translate(-0.55, -1.42, 0.58);
  put("OIL-FILT", "LUBE", merge([filter, rod([-0.68, -1.48, 0.48], [-0.55, -1.32, 0.58], 0.016)]), false, "steel");
  const chip = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20);
  chip.rotateX(Math.PI / 2);
  chip.translate(-1.28, -1.72, 0.4);
  const chip2 = chip.clone();
  chip2.translate(-0.28, 0.02, 0.02);
  put("OIL-CHIP", "LUBE", merge([chip, chip2]), false, "orange");
  const fuelPump = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
  fuelPump.rotateZ(Math.PI / 2);
  fuelPump.translate(-1.85, -1.88, 0.02);
  put("FUEL-PUMP", "AGB", fuelPump, false, "gear");
  put("FUEL-CTRL", "AGB", box(0.16, 0.1, 0.12, -1.45, -1.9, 0.12), false, "steel");
  put("VBV", "LPC", box(0.18, 0.05, 0.08, -0.95, 0.5, 0.05), false, "steel");
  const starter = new THREE.CylinderGeometry(0.11, 0.11, 0.28, 20);
  starter.rotateZ(Math.PI / 2);
  starter.translate(-1.15, -1.9, -0.02);
  put("STARTER", "AGB", starter, false, "steel");
  const idg = new THREE.CylinderGeometry(0.13, 0.12, 0.32, 20);
  idg.rotateZ(Math.PI / 2);
  idg.translate(-1.95, -1.82, 0.02);
  put("IDG", "AGB", idg, false, "steel");
  put("EEC", "AGB", box(0.22, 0.12, 0.16, -1.05, 0.95, 0.72), false, "gear");
  put(
    "dress-tai",
    "FAN",
    merge([
      box(0.16, 0.1, 0.1, -2.02, 0.72, 0.78),
      rod([-2.02, 0.72, 0.78], [-1.7, 1.02, 0.55], 0.025),
      rod([-2.02, 0.68, 0.78], [-1.85, 0.4, 0.9], 0.018),
    ]),
    false,
    "steel",
    false,
  );
  put(
    "dress-harness",
    "FAN",
    merge([
      tube(
        [
          [-2.05, 1.05, 0.35],
          [-1.6, 1.12, 0.42],
          [-1.1, 1.02, 0.5],
          [-0.4, 0.78, 0.55],
          [0.35, 0.62, 0.48],
        ],
        0.012,
      ),
      tube(
        [
          [-1.9, 0.55, 0.95],
          [-1.4, 0.42, 0.98],
          [-0.7, 0.28, 0.9],
          [0.1, 0.22, 0.72],
        ],
        0.01,
      ),
      tube(
        [
          [-1.7, -0.2, 0.95],
          [-1.2, -0.55, 0.85],
          [-0.85, -1.15, 0.6],
        ],
        0.012,
      ),
    ]),
    false,
    "harness",
    false,
  );
  put("dress-hpc-case", "HPC", sleeve(AX.hpc0 - 0.12, AX.hpc1 + 0.08, 0.5, 0.34, 0.025), true, "steel", false);
  put("dress-rail", "HPC", merge([box(1.55, 0.035, 0.05, 0.15, 0.52, 0.02), box(1.15, 0.03, 0.045, 1.15, 0.62, 0.02)]), false, "steel", false);

  return { nacelle, lpShaft, hpShaft, pieces };
}

function roundedBox(w: number, h: number, d: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - r);
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + h);
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -d / 2);
  return geo;
}

function Part({
  geometry,
  code,
  moduleCode,
  selected,
  pinStation,
  cutaway,
  health,
  onSelect,
  clip,
  finish = "steel",
  shown = true,
}: {
  geometry: THREE.BufferGeometry;
  code?: string;
  moduleCode?: string;
  selected: string;
  pinStation?: boolean;
  cutaway: boolean;
  health?: number | null;
  onSelect: (code: string, shift: boolean) => void;
  clip: THREE.Plane[] | undefined;
  finish?: Finish;
  shown?: boolean;
}) {
  if (!shown) return null;
  const paint = FINISH[finish];
  const tint = healthColor(health ?? null);
  const active = code != null && (pinStation ? selected === code : selected === code || selected === moduleCode);
  const dim = code != null && !active;
  const mark = cutaway && (finish === "stage" || finish === "blade") && (health ?? 100) < 80;
  const color = mark ? mix(paint.color, tint, 0.72) : paint.color;
  return (
    <mesh
      geometry={geometry}
      userData={{ fit: true }}
      castShadow
      receiveShadow
      onClick={
        code
          ? (event) => {
              event.stopPropagation();
              onSelect(code, event.shiftKey);
            }
          : undefined
      }
    >
      <meshStandardMaterial
        color={color}
        metalness={paint.metal}
        roughness={active ? Math.max(0.2, paint.rough - 0.1) : paint.rough}
        emissive={pinStation && active ? tint : "#000000"}
        emissiveIntensity={pinStation && active ? 0.35 : 0}
        transparent={dim}
        opacity={dim ? 0.88 : 1}
        side={THREE.DoubleSide}
        clippingPlanes={clip}
      />
    </mesh>
  );
}

function FrameView({ focus }: { focus: string }) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; update: () => void; enableDamping: boolean } | null;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!controls) return;
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      if (!focus) {
        camera.position.set(-4.4, 0.72, 2.55);
        controls.target.set(-0.85, -0.18, 0);
      } else {
        const box = new THREE.Box3();
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh && mesh.userData.fit) box.expandByObject(mesh);
        });
        if (box.isEmpty()) {
          controls.enableDamping = damping;
          return;
        }
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.42, 0.22);
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const dist = radius / Math.sin(fov / 2);
        camera.position.copy(center).add(new THREE.Vector3(-0.82, 0.28, 0.5).normalize().multiplyScalar(dist));
        const perspective = camera as THREE.PerspectiveCamera;
        perspective.near = Math.max(0.01, dist / 80);
        perspective.updateProjectionMatrix();
        controls.target.copy(center);
      }
      controls.update();
      controls.enableDamping = damping;
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, camera, scene, controls]);
  return null;
}

function mix(base: string, tint: string, amount: number) {
  const a = new THREE.Color(base);
  const b = new THREE.Color(tint);
  return `#${a.lerp(b, amount).getHexString()}`;
}

export default function Engine3D({
  modules,
  stationHealth,
  selected,
  isolated,
  onSelect,
  cutaway,
}: {
  modules: Mod[];
  stationHealth?: Record<string, number | null>;
  selected: string;
  isolated: string[];
  onSelect: (code: string, shift: boolean) => void;
  cutaway: boolean;
}) {
  const geo = useMemo(() => buildGeometry(), []);
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.02)], []);
  const health = new Map(modules.map((mod) => [mod.code, mod.healthIndex]));
  const open = cutaway ? clip : undefined;
  const tone = (id: string, module: string) => stationHealth?.[id] ?? health.get(module) ?? null;
  const show = (id?: string, moduleCode?: string) => isolated.length === 0 || (id != null && isolated.includes(id)) || (moduleCode != null && isolated.includes(moduleCode));
  const pinStation = isolated.length > 0;
  return (
    <Canvas
      camera={{ position: [-4.4, 0.72, 2.55], fov: 30, near: 0.08, far: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, localClippingEnabled: true, alpha: false }}
      shadows
    >
      <color attach="background" args={["#070e15"]} />
      <hemisphereLight args={["#f7fbff", "#1a2834", 0.55]} />
      <directionalLight position={[-5, 4.2, 3.4]} intensity={1.7} color={"#fff4e4"} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[2.4, 1.2, -2.2]} intensity={0.55} color={"#9eb6cc"} />
      <directionalLight position={[-2.2, 0.4, 2.6]} intensity={0.9} color={"#ffffff"} />
      {!cutaway && isolated.length === 0 && (
        <Part geometry={geo.nacelle} selected={selected} cutaway={cutaway} onSelect={onSelect} clip={undefined} finish="gold" />
      )}
      <Part geometry={geo.lpShaft} selected={selected} cutaway={cutaway} onSelect={onSelect} clip={undefined} finish="steel" shown={isolated.length === 0} />
      <Part geometry={geo.hpShaft} selected={selected} cutaway={cutaway} onSelect={onSelect} clip={undefined} finish="steel" shown={isolated.length === 0} />
      {geo.pieces.map((piece) => (
        <Part
          key={piece.id}
          geometry={piece.geo}
          code={piece.pick ? piece.id : undefined}
          moduleCode={piece.module}
          health={tone(piece.id, piece.module)}
          selected={selected}
          pinStation={pinStation}
          cutaway={cutaway}
          onSelect={onSelect}
          finish={piece.finish}
          shown={show(piece.pick ? piece.id : undefined, piece.module)}
          clip={piece.clip ? open : undefined}
        />
      ))}
      <ContactShadows position={[0, -1.9, 0]} opacity={0.4} scale={12} blur={2.2} far={2.8} />
      <OrbitControls enableDamping makeDefault enablePan={false} target={[-0.85, -0.18, 0]} minDistance={isolated.length ? 0.2 : 3.2} maxDistance={9} maxPolarAngle={Math.PI * 0.62} />
      <FrameView focus={isolated.join("|")} />
    </Canvas>
  );
}
