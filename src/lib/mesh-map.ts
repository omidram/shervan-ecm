export type MeshSample = {
  t: number;
  radialRatio: number;
  reachRatio: number;
  boxRatio: number;
  vertices: number;
};

// Stations that share a mesh because the model has no separate part there.
const ALIAS: Record<string, string> = {
  "HPC-S7": "HPC-S6",
  "HPC-S8": "HPC-S6",
  "HPC-S9": "HPC-S6",
  "HPT-NGV": "HPT-BLD",
  "BRG-3": "HPC-S4",
  "BRG-4": "HPT-DISK",
  "COMB-NOZ": "COMB-LINER",
  "COMB-IGN": "COMB-LINER",
  "FAN-SPIN": "FAN-BLD",
  "OIL-TANK": "FAN-CASE",
  "EEC": "FAN-CASE",
  "IDG": "AGB",
  "OIL-FILT": "OIL-PUMP",
};

export function assignStations(samples: MeshSample[]) {
  const station = samples.map(() => "");
  const used = new Set<number>();
  const open = () => samples.map((sample, index) => ({ ...sample, index })).filter((sample) => !used.has(sample.index));
  const take = (pred: (sample: MeshSample) => boolean, name: string, sort: (a: MeshSample, b: MeshSample) => number) => {
    const pick = open().filter(pred).sort(sort)[0];
    if (!pick) return;
    station[pick.index] = name;
    used.add(pick.index);
  };
  const front = (a: MeshSample, b: MeshSample) => a.t - b.t;
  const byReach = (a: MeshSample, b: MeshSample) => b.reachRatio - a.reachRatio || b.vertices - a.vertices;
  const byVerts = (a: MeshSample, b: MeshSample) => b.vertices - a.vertices;
  const centered = (sample: MeshSample) => sample.radialRatio < 0.3;
  const outside = (sample: MeshSample) => sample.radialRatio > 0.45;
  take((sample) => sample.t < 0.22 && centered(sample), "FAN-BLD", byReach);
  take((sample) => sample.t < 0.22 && centered(sample), "FAN-DISK", byReach);
  take((sample) => sample.t < 0.2 && centered(sample), "BRG-1", front);
  take((sample) => sample.t < 0.36 && outside(sample), "FAN-CASE", byReach);
  take((sample) => sample.t < 0.36 && outside(sample), "AGB", byVerts);
  take((sample) => sample.t < 0.36 && outside(sample), "FAN-OGV", byReach);
  take((sample) => sample.t > 0.16 && sample.t < 0.4 && sample.radialRatio > 0.35 && sample.radialRatio < 0.75, "VBV", byVerts);
  ["LPC-S1", "LPC-S2", "LPC-S3", "LPC-ST", "BRG-2"].forEach((name) => {
    take((sample) => sample.t >= 0.16 && sample.t < 0.34 && sample.radialRatio < 0.2, name, front);
  });
  ["AGB", "VSV", "STARTER", "FUEL-PUMP", "FUEL-CTRL", "OIL-PUMP", "OIL-CHIP"].forEach((name) => {
    take((sample) => sample.t >= 0.28 && sample.t < 0.62 && sample.radialRatio > 0.25, name, front);
  });
  ["HPC-IGV", "HPC-S1", "HPC-S2", "HPC-S3", "HPC-S4", "HPC-S5", "HPC-S6", "COMB-LINER"].forEach((name) => {
    take((sample) => sample.t >= 0.3 && sample.t < 0.58 && sample.radialRatio < 0.2, name, front);
  });
  ["HPT-BLD", "HPT-DISK", "HPT-SHRD"].forEach((name) => {
    take((sample) => sample.t >= 0.58 && sample.t < 0.73, name, front);
  });
  take((sample) => sample.t > 0.9 && sample.radialRatio < 0.2, "BRG-5", (a, b) => b.t - a.t);
  for (const sample of open()) {
    const { t, radialRatio, index } = sample;
    let name = "LPT-S2";
    if (t < 0.16) name = "FAN-DISK";
    else if (t < 0.34 && radialRatio > 0.55) name = "FAN-OGV";
    else if (t < 0.34) name = "LPC-ST";
    else if (t < 0.58 && radialRatio < 0.2) name = "HPC-S6";
    else if (t < 0.58) name = "AGB";
    else if (t < 0.73) name = radialRatio > 0.3 ? "HPT-SHRD" : "HPT-BLD";
    else if (t < 0.8) name = "LPT-S1";
    else if (t < 0.86) name = "LPT-S2";
    else if (t < 0.92) name = "LPT-S3";
    else if (t < 0.96 && radialRatio < 0.2) name = "LPT-S4";
    else name = "LPT-TRF";
    station[index] = name;
    used.add(index);
  }
  return station;
}

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

export function stationMatches(meshStation: string, selected: string) {
  if (!meshStation || !selected) return false;
  if (meshStation === selected) return true;
  if (ALIAS[selected] === meshStation) return true;
  return MODULE_ONLY.has(selected) && moduleOfStation(meshStation) === selected;
}
