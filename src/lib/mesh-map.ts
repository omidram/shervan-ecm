export type MeshSample = {
  id: string;
  axial: number;
  radialRatio: number;
  reachRatio: number;
  boxRatio: number;
  axialRatio: number;
  rimRatio: number;
  vertices: number;
};

function boltRing(mesh: MeshSample) {
  return mesh.rimRatio > 0.8 && mesh.vertices < 2200;
}

function shaft(mesh: MeshSample) {
  return mesh.axialRatio > 0.42;
}

function solid(mesh: MeshSample) {
  return !boltRing(mesh) && !shaft(mesh) && mesh.vertices >= 700;
}

export function assignStations(samples: MeshSample[]) {
  const byId = new Map<string, string>();
  const used = new Set<string>();
  const claim = (mesh: MeshSample | undefined, station: string) => {
    if (!mesh || used.has(mesh.id)) return;
    byId.set(mesh.id, station);
    used.add(mesh.id);
  };
  const open = () => samples.filter((mesh) => !used.has(mesh.id));

  const gearbox = open()
    .filter((mesh) => mesh.axial < 0.42 && mesh.radialRatio > 0.42 && mesh.vertices > 800)
    .sort((a, b) => b.vertices - a.vertices);
  for (const mesh of gearbox.slice(0, 4)) claim(mesh, "AGB");

  const fan = open().filter((mesh) => solid(mesh) && mesh.axial < 0.3 && mesh.reachRatio > 0.35 && mesh.radialRatio < 0.4);
  if (fan.length === 0) {
    const fallback = open()
      .filter((mesh) => !boltRing(mesh) && mesh.axial < 0.32 && mesh.reachRatio > 0.35 && mesh.radialRatio < 0.4)
      .sort((a, b) => b.vertices - a.vertices)[0];
    if (fallback) fan.push(fallback);
  }
  for (const mesh of fan) claim(mesh, "FAN-BLD");

  const bearing = (id: string, center: number) => {
    const mesh = open()
      .filter((item) => !shaft(item) && item.radialRatio < 0.28 && item.vertices > 40 && item.vertices < 1500 && Math.abs(item.axial - center) < 0.08)
      .sort((a, b) => a.boxRatio - b.boxRatio || a.vertices - b.vertices)[0];
    claim(mesh, id);
  };
  bearing("BRG-1", 0.12);
  bearing("BRG-2", 0.3);
  bearing("BRG-3", 0.48);
  bearing("BRG-4", 0.66);
  bearing("BRG-5", 0.9);

  const slot = (lo: number, hi: number, station: string) => {
    const mesh = open()
      .filter((item) => solid(item) && item.axial >= lo && item.axial < hi && item.radialRatio < 0.45)
      .sort((a, b) => b.vertices - a.vertices)[0];
    claim(mesh, station);
  };

  slot(0.24, 0.3, "LPC-S1");
  slot(0.3, 0.34, "LPC-S2");
  slot(0.34, 0.38, "LPC-S3");

  const hpcStart = 0.36;
  const hpcEnd = 0.56;
  for (let stage = 1; stage <= 9; stage += 1) {
    const lo = hpcStart + ((stage - 1) / 9) * (hpcEnd - hpcStart);
    const hi = hpcStart + (stage / 9) * (hpcEnd - hpcStart);
    slot(lo, hi, `HPC-S${stage}`);
  }
  if (![...byId.values()].includes("HPC-S6")) {
    const mesh = open()
      .filter((item) => solid(item) && item.radialRatio < 0.45)
      .sort((a, b) => Math.abs(a.axial - 0.48) - Math.abs(b.axial - 0.48) || b.vertices - a.vertices)[0];
    claim(mesh, "HPC-S6");
  }

  slot(0.56, 0.62, "COMB-LINER");
  slot(0.62, 0.7, "HPT-BLD");
  slot(0.7, 0.76, "LPT-S1");
  slot(0.76, 0.82, "LPT-S2");
  slot(0.82, 0.88, "LPT-S3");
  slot(0.88, 0.94, "LPT-S4");

  const pads: [string, number][] = [
    ["FUEL-PUMP", 0.18],
    ["FUEL-CTRL", 0.28],
    ["OIL-PUMP", 0.38],
    ["STARTER", 0.48],
  ];
  for (const [station, center] of pads) {
    const mesh = open()
      .filter((item) => item.radialRatio > 0.55 && Math.abs(item.axial - center) < 0.1)
      .sort((a, b) => b.vertices - a.vertices)[0];
    claim(mesh, station);
  }

  return byId;
}

const ALIAS: Record<string, string> = {
  "COMB-NOZ": "COMB-LINER",
  "COMB-IGN": "COMB-LINER",
  "HPT-NGV": "HPT-BLD",
  "OIL-TANK": "OIL-PUMP",
  "OIL-FILT": "OIL-PUMP",
  IDG: "AGB",
};

const FAN_CLICK = new Set(["FAN-BLD", "FAN-DISK", "FAN-SPIN", "FAN-CASE", "FAN-OGV"]);

export function moduleOfStation(station: string) {
  if (station.startsWith("FAN")) return "FAN";
  if (station.startsWith("LPC") || station === "VBV") return "LPC";
  if (station.startsWith("HPC") || station === "VSV") return "HPC";
  if (station.startsWith("COMB")) return "COMB";
  if (station.startsWith("HPT")) return "HPT";
  if (station.startsWith("LPT")) return "LPT";
  if (station.startsWith("BRG") || station.startsWith("OIL")) return "LUBE";
  return "AGB";
}

const MODULE_ONLY = new Set(["FAN", "LPC", "HPC", "COMB", "HPT", "LPT", "LUBE"]);

export function stationMatches(meshStation: string, station: string) {
  if (!meshStation || !station) return false;
  if (meshStation === station) return true;
  if (FAN_CLICK.has(station) && meshStation.startsWith("FAN")) return true;
  if (station.startsWith("BRG-") || station.startsWith("HPC-S")) return meshStation === station;
  const alias = ALIAS[station];
  if (alias && meshStation === alias) return true;
  if (MODULE_ONLY.has(station) && moduleOfStation(meshStation) === station) return true;
  return false;
}
