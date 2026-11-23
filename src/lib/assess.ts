import type { FailureMode, LimitBand, BaselineCoeff, ModuleTemplate } from "@prisma/client";
import { cyclesInWindow, latestByVersion, reconstruct, type LifeEvent, type LifeTotals } from "./life";
import type { ParameterId } from "./i18n";

export type SampleRow = {
  recordedAt: Date;
  altitudeFt: number;
  oatC: number;
  thrustPct: number;
  egtMargin: number;
  n1: number;
  n2: number;
  fuelFlow: number;
  epr: number;
  cpr: number;
  vibFan: number;
  vibCore: number;
  vibOrder: string;
  oilPressure: number;
  oilTemp: number;
  oilQty: number;
  oilConsumption: number;
};

export type DefectRow = {
  id: string;
  moduleCode: string;
  descriptionFa: string;
  descriptionEn: string;
  severity: string;
  disposition: string;
  status: string;
  foundAt: Date;
  recordVersionGroup: string;
};

export type RecordRow = {
  id: string;
  versionGroupId: string;
  version: number;
  type: string;
  performedAt: Date;
  releasedAt: Date | null;
  defects: {
    id: string;
    moduleCode: string;
    descriptionFa: string;
    descriptionEn: string;
    severity: string;
    disposition: string;
    status: string;
    foundAt: Date;
  }[];
};

export type CompInstallRow = {
  id: string;
  engineId: string;
  installedAt: Date;
  removedAt: Date | null;
  component: {
    id: string;
    partNumber: string;
    serialNumber: string;
    name: string;
    nameFa: string;
    moduleCode: string;
    isLlp: boolean;
    lifeLimitCycles: number | null;
  };
};

type Disposition = { modeCode: string; status: string; at: Date; noteFa: string; noteEn: string };

export type EngineBundle = {
  id: string;
  serialNumber: string;
  status: string;
  modules: ModuleTemplate[];
  baselines: BaselineCoeff[];
  limitBands: LimitBand[];
  failureModes: FailureMode[];
  samples: SampleRow[];
  records: RecordRow[];
  utilization: LifeEvent[];
  compInstalls: CompInstallRow[];
  dispositions: Disposition[];
  allUtilization?: Map<string, LifeEvent[]>;
};

export type ModuleAssessment = {
  code: string;
  name: string;
  nameFa: string;
  stageNote: string;
  healthIndex: number | null;
  effDelta: number | null;
  prDelta: number | null;
  evidenceFa: string[];
  evidenceEn: string[];
  defects: RecordRow["defects"];
};

export type FaultAssessment = {
  modeCode: string;
  moduleCode: string;
  titleFa: string;
  titleEn: string;
  probability: number;
  reported: boolean;
  cleared: boolean;
  evidenceFa: string[];
  evidenceEn: string[];
  confirmFa: string;
  confirmEn: string;
  clearFa: string;
  clearEn: string;
  method: string;
};

export type RulAssessment = {
  moduleCode: string;
  titleFa: string;
  titleEn: string;
  hoursLow: number;
  hoursHigh: number;
  cyclesLow: number;
  cyclesHigh: number;
  confidence: number;
  crossed: boolean;
  driversFa: string[];
  driversEn: string[];
};

export type LlpRow = {
  componentId: string;
  serialNumber: string;
  partNumber: string;
  name: string;
  nameFa: string;
  moduleCode: string;
  lifeLimitCycles: number;
  cyclesUsed: number;
  remaining: number;
  remainingPct: number;
};

export type Assessment = {
  life: LifeTotals;
  modules: ModuleAssessment[];
  limiting: string | null;
  engineHealth: number | null;
  insufficient: boolean;
  faults: FaultAssessment[];
  rul: RulAssessment[];
  llp: LlpRow[];
  latest: SampleRow | null;
  deltas: Partial<Record<ParameterId, number>>;
  measured: Partial<Record<ParameterId, number>>;
  reference: Partial<Record<ParameterId, number>>;
};

const METHOD =
  "Rule set ECM-REF-1 plus a z-score against this engine's early post-shop baseline. No neural network is used.";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const m = avg(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function referenceAt(baseline: BaselineCoeff, sample: SampleRow) {
  return (
    baseline.refValue +
    baseline.per1000Ft * ((sample.altitudeFt - baseline.refAltitudeFt) / 1000) +
    baseline.perDegOat * (sample.oatC - baseline.refOatC) +
    baseline.perThrustPct * (sample.thrustPct - baseline.refThrustPct)
  );
}

function sampleValue(sample: SampleRow, parameter: string) {
  return sample[parameter as keyof SampleRow] as number;
}

function linreg(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  const mean = sy / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const fit = intercept + slope * p.x;
    ssTot += (p.y - mean) ** 2;
    ssRes += (p.y - fit) ** 2;
  }
  const r2 = ssTot <= 1e-9 ? 0 : clamp(1 - ssRes / ssTot, 0, 1);
  return { slope, intercept, r2 };
}

function openDefects(records: RecordRow[]) {
  const latest = latestByVersion(records);
  return latest.flatMap((r) => r.defects.filter((d) => d.status === "open" || d.status === "monitor"));
}

export function assess(bundle: EngineBundle, asOf = new Date()): Assessment {
  const life = reconstruct(
    bundle.utilization,
    bundle.records.map((r) => ({ type: r.type, releasedAt: r.releasedAt, performedAt: r.performedAt })),
    asOf,
  );
  const samples = bundle.samples.filter((s) => s.recordedAt <= asOf);
  const latest = samples.at(-1) ?? null;
  const measured: Assessment["measured"] = {};
  const reference: Assessment["reference"] = {};
  const deltas: Assessment["deltas"] = {};
  if (latest) {
    for (const baseline of bundle.baselines) {
      const key = baseline.parameter as ParameterId;
      const value = sampleValue(latest, baseline.parameter);
      if (typeof value !== "number") continue;
      const ref = referenceAt(baseline, latest);
      measured[key] = value;
      reference[key] = ref;
      deltas[key] = value - ref;
    }
  }

  const defects = openDefects(bundle.records).filter((d) => d.foundAt <= asOf);
  const segmentStart = life.lastShop;
  const segment = samples.filter((s) => !segmentStart || s.recordedAt > segmentStart);
  const trendSamples = segment.length >= 4 ? segment : samples;
  const insufficient = samples.length < 4;
  const early = trendSamples.slice(0, 3).map((s) => s.egtMargin);
  const earlyMean = avg(early);
  const sigma = Math.max(4, stdev(early));
  const z = latest && early.length ? (earlyMean - latest.egtMargin) / sigma : 0;

  const egtPoints = trendSamples.map((s) => ({
    x: (s.recordedAt.getTime() - trendSamples[0].recordedAt.getTime()) / 86400000,
    y: s.egtMargin,
  }));
  const egtFit = linreg(egtPoints);
  const egtPerMonth = egtFit ? egtFit.slope * 30.4 : 0;

  const oilPoints = trendSamples.map((s) => ({
    x: (s.recordedAt.getTime() - trendSamples[0].recordedAt.getTime()) / 86400000,
    y: s.oilConsumption,
  }));
  const oilFit = linreg(oilPoints);

  const cprDeltaPct =
    latest && reference.cpr ? ((latest.cpr - reference.cpr) / reference.cpr) * 100 : 0;
  const egtDelta = deltas.egtMargin ?? 0;

  const defectOn = (code: string) => defects.filter((d) => d.moduleCode === code);

  const modules: ModuleAssessment[] = bundle.modules
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((mod) => {
      const evidenceFa: string[] = [];
      const evidenceEn: string[] = [];
      let penalty = 0;
      let eff: number | null = null;
      let pr: number | null = null;
      const own = defectOn(mod.code);
      if (insufficient) {
        evidenceFa.push("کمتر از چهار نقطه عملکرد ثبت شده است؛ شاخص سلامت عددی داده نمی‌شود.");
        evidenceEn.push("Fewer than four performance points are on file, so no numeric health index is given.");
      } else if (mod.code === "HPC") {
        penalty += Math.max(0, -egtDelta) * 0.42;
        penalty += Math.max(0, -cprDeltaPct) * 3.4;
        pr = cprDeltaPct;
        eff = cprDeltaPct * 0.85;
        evidenceFa.push(`دلتای CPR نسبت به مرجع تصحیح‌شده: ${cprDeltaPct.toFixed(1)}٪.`);
        evidenceEn.push(`CPR delta versus the condition-corrected reference: ${cprDeltaPct.toFixed(1)}%.`);
        evidenceFa.push(`دلتای EGT Margin: ${egtDelta.toFixed(1)} °C.`);
        evidenceEn.push(`EGT Margin delta: ${egtDelta.toFixed(1)} °C.`);
      } else if (mod.code === "HPT") {
        penalty += Math.max(0, -egtDelta) * 0.22;
        eff = -Math.max(0, -egtDelta) * 0.08;
        evidenceFa.push("سهم مطالعاتی HPT از افت EGT Margin، بدون یافته مستقیم پره.");
        evidenceEn.push("Study share of the EGT Margin loss assigned to the HPT, with no direct blade finding.");
      } else if (mod.code === "COMB") {
        penalty += Math.max(0, -egtDelta) * 0.08;
        eff = -Math.max(0, -egtDelta) * 0.03;
        evidenceFa.push("الگوی احتراق فقط از مانده EGT برآورد شده و پروفیل دور تا دور در داده نیست.");
        evidenceEn.push("Combustor pattern is inferred only from the EGT residual. A circumferential profile is not in the data.");
      } else if (mod.code === "FAN") {
        const vibDelta = deltas.vibFan ?? 0;
        penalty += Math.max(0, vibDelta) * 8;
        evidenceFa.push(`دلتای ارتعاش فن: ${vibDelta.toFixed(2)} ips. مرتبه ثبت‌شده: ${latest?.vibOrder ?? "—"}.`);
        evidenceEn.push(`Fan vibration delta: ${vibDelta.toFixed(2)} ips. Recorded order: ${latest?.vibOrder ?? "—"}.`);
      } else if (mod.code === "LPC") {
        penalty += Math.max(0, -cprDeltaPct) * 0.6;
        pr = cprDeltaPct * 0.25;
        evidenceFa.push("LPC سهم کوچکی از افت نسبت فشار هسته می‌گیرد.");
        evidenceEn.push("The LPC takes a small share of the core pressure-ratio loss.");
      } else if (mod.code === "LPT") {
        const core = deltas.vibCore ?? 0;
        const lptOrder = (latest?.vibOrder ?? "").includes("LPT");
        penalty += lptOrder ? Math.max(0, core) * 10 : Math.max(0, core) * 1.2;
        evidenceFa.push(lptOrder ? "مرتبه ارتعاش به LPT نسبت داده شده است." : "مرتبه غالب فعلی LPT نیست.");
        evidenceEn.push(lptOrder ? "The vibration order is attributed to the LPT." : "The dominant order is not the LPT.");
      } else if (mod.code === "LUBE") {
        const cons = deltas.oilConsumption ?? 0;
        const temp = deltas.oilTemp ?? 0;
        penalty += Math.max(0, cons) * 70;
        penalty += Math.max(0, temp - 6) * 0.8;
        evidenceFa.push(`مصرف روغن نسبت به مرجع: ${cons >= 0 ? "+" : ""}${cons.toFixed(2)} L/h.`);
        evidenceEn.push(`Oil consumption versus reference: ${cons >= 0 ? "+" : ""}${cons.toFixed(2)} L/h.`);
      } else if (mod.code === "AGB") {
        evidenceFa.push("نشانگر مستقلی برای جعبه‌دنده در این مجموعه نمونه نیست.");
        evidenceEn.push("No dedicated accessory-gearbox indicator is in this sample set.");
      }
      if (own.length && !insufficient) {
        penalty += own.reduce((s, d) => s + (d.severity === "high" ? 14 : d.severity === "medium" ? 8 : 4), 0);
        evidenceFa.push(`${own.length} یافته باز یا تحت پایش روی این ماژول.`);
        evidenceEn.push(`${own.length} open or monitored finding(s) on this module.`);
      }
      const healthIndex = insufficient ? null : clamp(Math.round(100 - penalty), 5, 100);
      return {
        code: mod.code,
        name: mod.name,
        nameFa: mod.nameFa,
        stageNote: mod.stageNote,
        healthIndex,
        effDelta: eff,
        prDelta: pr,
        evidenceFa,
        evidenceEn,
        defects: own,
      };
    });

  const scored = modules.filter((m) => m.healthIndex != null) as (ModuleAssessment & { healthIndex: number })[];
  const limiting = scored.length ? scored.reduce((a, b) => (a.healthIndex <= b.healthIndex ? a : b)).code : null;
  const engineHealth = scored.length ? Math.min(...scored.map((m) => m.healthIndex)) : null;

  const modes = new Map(bundle.failureModes.map((m) => [m.code, m]));
  const faults: FaultAssessment[] = [];

  const pushFault = (partial: {
    score: number;
    modeCode: string;
    moduleCode: string;
    titleFa: string;
    titleEn: string;
    evidenceFa: string[];
    evidenceEn: string[];
    confirmFa: string;
    confirmEn: string;
    clearFa: string;
    clearEn: string;
  }) => {
    const mode = modes.get(partial.modeCode);
    const cleared = bundle.dispositions.find((d) => d.modeCode === partial.modeCode)?.status === "cleared";
    const probability = clamp(partial.score, 0.02, 0.84);
    faults.push({
      modeCode: partial.modeCode,
      moduleCode: partial.moduleCode,
      titleFa: mode?.nameFa ?? partial.titleFa,
      titleEn: mode?.name ?? partial.titleEn,
      probability,
      reported: probability >= 0.4 && !cleared,
      cleared,
      evidenceFa: partial.evidenceFa,
      evidenceEn: partial.evidenceEn,
      confirmFa: mode?.confirmFa ?? partial.confirmFa,
      confirmEn: mode?.confirmEn ?? partial.confirmEn,
      clearFa: mode?.clearFa ?? partial.clearFa,
      clearEn: mode?.clearEn ?? partial.clearEn,
      method: METHOD,
    });
  };

  if (!insufficient && latest) {
    let hpc = 0;
    const hpcEvFa: string[] = [];
    const hpcEvEn: string[] = [];
    if (egtPerMonth < -1) {
      hpc += 0.18;
      hpcEvFa.push(`شیب EGT Margin حدود ${egtPerMonth.toFixed(2)} °C در ماه است.`);
      hpcEvEn.push(`EGT Margin slope is about ${egtPerMonth.toFixed(2)} °C per month.`);
    }
    if (latest.egtMargin < 45) {
      hpc += 0.1;
      hpcEvFa.push(`آخرین EGT Margin ${latest.egtMargin.toFixed(1)} °C و داخل باند پایش مطالعاتی است.`);
      hpcEvEn.push(`Latest EGT Margin is ${latest.egtMargin.toFixed(1)} °C, inside the study watch band.`);
    }
    if (z > 3) {
      hpc += 0.16;
      hpcEvFa.push(`انحراف آماری z=${z.toFixed(1)} نسبت به میانگین اوایل همین بازه (کف σ برابر ۴ °C).`);
      hpcEvEn.push(`Statistical deviation z=${z.toFixed(1)} versus the early-segment mean (σ floor 4 °C).`);
    } else if (z > 2) {
      hpc += 0.1;
      hpcEvFa.push(`انحراف آماری z=${z.toFixed(1)}.`);
      hpcEvEn.push(`Statistical deviation z=${z.toFixed(1)}.`);
    }
    if (cprDeltaPct < -2) {
      hpc += 0.14;
      hpcEvFa.push(`افت CPR بیش از ۲٪ نسبت به مرجع تصحیح‌شده.`);
      hpcEvEn.push(`CPR is more than 2% below the condition-corrected reference.`);
    }
    if (defectOn("HPC").length) {
      hpc += 0.16;
      hpcEvFa.push("سابقه بوروسکوپ HPC با وضعیت پایش‌باز در پرونده است.");
      hpcEvEn.push("An HPC borescope finding remains open or monitored on the passport.");
    }
    if (hpc > 0) {
      pushFault({
        score: hpc,
        modeCode: "hpc_deterioration",
        moduleCode: "HPC",
        titleFa: "افت HPC",
        titleEn: "HPC deterioration",
        evidenceFa: hpcEvFa,
        evidenceEn: hpcEvEn,
        confirmFa: "",
        confirmEn: "",
        clearFa: "",
        clearEn: "",
      });
    }

    let oil = 0;
    const oilFa: string[] = [];
    const oilEn: string[] = [];
    if (latest.oilConsumption > 0.3) {
      oil += 0.18;
      oilFa.push(`مصرف روغن ${latest.oilConsumption.toFixed(2)} L/h است.`);
      oilEn.push(`Oil consumption is ${latest.oilConsumption.toFixed(2)} L/h.`);
    }
    if (oilFit && oilFit.slope > 0.00025) {
      oil += 0.12;
      oilFa.push("روند مصرف روغن صعودی است.");
      oilEn.push("The oil-consumption trend is rising.");
    }
    if (defectOn("LUBE").length) {
      oil += 0.14;
      oilFa.push("گزارش ذرات روغن (SOAP) در سابقه است.");
      oilEn.push("An oil-debris (SOAP) note is on the history.");
    }
    if ((deltas.oilTemp ?? 0) > 8) {
      oil += 0.08;
      oilFa.push("دمای روغن بالاتر از مرجع مطالعاتی است.");
      oilEn.push("Oil temperature is above the study reference.");
    }
    if (oil > 0) {
      pushFault({
        score: oil,
        modeCode: "bearing_oil_debris",
        moduleCode: "LUBE",
        titleFa: "روغن و یاتاقان",
        titleEn: "Bearing / oil debris",
        evidenceFa: oilFa,
        evidenceEn: oilEn,
        confirmFa: "",
        confirmEn: "",
        clearFa: "",
        clearEn: "",
      });
    }

    let hpt = 0;
    const hptFa: string[] = [];
    const hptEn: string[] = [];
    if (-egtDelta > 25) {
      hpt += 0.16;
      hptFa.push("افت EGT می‌تواند از HPT هم بیاید، ولی یافته مستقیم HPT ثبت نشده است.");
      hptEn.push("The EGT loss can also come from the HPT, but there is no direct HPT finding.");
    }
    if (latest.n2 - (reference.n2 ?? latest.n2) > 0.5) {
      hpt += 0.08;
      hptFa.push("N2 کمی بالاتر از مرجع تصحیح‌شده است.");
      hptEn.push("N2 is slightly above the condition-corrected reference.");
    }
    if (hpt > 0) {
      pushFault({
        score: hpt,
        modeCode: "hpt_distress",
        moduleCode: "HPT",
        titleFa: "آسیب HPT",
        titleEn: "HPT distress",
        evidenceFa: hptFa,
        evidenceEn: hptEn,
        confirmFa: "",
        confirmEn: "",
        clearFa: "",
        clearEn: "",
      });
    }

    const fanVib = deltas.vibFan ?? 0;
    const fanOrder = (latest.vibOrder ?? "").includes("N1");
    let fan = 0;
    const fanFa: string[] = [];
    const fanEn: string[] = [];
    if (fanVib > 0.4) {
      fan += 0.2;
      fanFa.push("ارتعاش فن از مرجع فاصله گرفته است.");
      fanEn.push("Fan vibration has moved away from the reference.");
    }
    if (fanOrder && fanVib > 0.25) {
      fan += 0.16;
      fanFa.push("مرتبه N1 1/rev با دامنه قابل توجه دیده می‌شود.");
      fanEn.push("An N1 1/rev order is present at a notable amplitude.");
    }
    if (defectOn("FAN").some((d) => d.severity === "high")) {
      fan += 0.4;
      fanFa.push("یافته باز با شدت بالا روی فن ثبت شده است.");
      fanEn.push("A high-severity open finding is recorded on the fan.");
    }
    if (fan > 0) {
      pushFault({
        score: fan,
        modeCode: "fan_imbalance",
        moduleCode: "FAN",
        titleFa: "نامیزانی فن",
        titleEn: "Fan imbalance",
        evidenceFa: fanFa,
        evidenceEn: fanEn,
        confirmFa: "",
        confirmEn: "",
        clearFa: "",
        clearEn: "",
      });
    }

    let lpt = 0;
    if ((latest.vibOrder ?? "").includes("LPT") && (deltas.vibCore ?? 0) > 0.4) {
      lpt += 0.45;
    }
    if (lpt > 0) {
      pushFault({
        score: lpt,
        modeCode: "lpt_vibration",
        moduleCode: "LPT",
        titleFa: "ارتعاش LPT",
        titleEn: "LPT vibration",
        evidenceFa: ["مرتبه ارتعاش LPT بالاتر از باند آرام است."],
        evidenceEn: ["An LPT vibration order is above the quiet band."],
        confirmFa: "",
        confirmEn: "",
        clearFa: "",
        clearEn: "",
      });
    }

    const hotStreak = defectOn("COMB").some((d) => d.severity !== "low");
    if (hotStreak) {
      pushFault({
        score: 0.48,
        modeCode: "combustor_pattern",
        moduleCode: "COMB",
        titleFa: "الگوی محفظه احتراق",
        titleEn: "Combustor pattern",
        evidenceFa: ["یافته باز محفظه احتراق در سابقه است."],
        evidenceEn: ["An open combustor finding is on the history."],
        confirmFa: "",
        confirmEn: "",
        clearFa: "",
        clearEn: "",
      });
    }
  }

  const hoursPerDay = ratePerDay(bundle.utilization, asOf, "flightHours");
  const cyclesPerDay = ratePerDay(bundle.utilization, asOf, "flightCycles");
  const rul: RulAssessment[] = [];
  const inService = bundle.status === "In Service" || bundle.status === "Active" || bundle.status === "Standby";
  if (inService && !insufficient && egtFit && latest && egtPerMonth < -0.4) {
    const gap = latest.egtMargin - 25;
    const days = gap <= 0 ? 0 : gap / -egtFit.slope;
    const hours = Math.max(0, days * hoursPerDay);
    const cycles = Math.max(0, days * cyclesPerDay);
    const confidence = clamp(0.38 + egtFit.r2 * 0.36, 0.35, 0.78);
    const lowF = confidence < 0.55 ? 0.5 : 0.62;
    const highF = confidence < 0.55 ? 2.1 : 1.65;
    rul.push({
      moduleCode: "HPC",
      titleFa: "بازه برنامه‌ریزی HPC",
      titleEn: "HPC planning range",
      hoursLow: gap <= 0 ? 0 : Math.round(hours * lowF),
      hoursHigh: gap <= 0 ? 400 : Math.round(Math.max(hours * highF, hours * lowF + 80)),
      cyclesLow: gap <= 0 ? 0 : Math.round(cycles * lowF),
      cyclesHigh: gap <= 0 ? 250 : Math.round(Math.max(cycles * highF, cycles * lowF + 40)),
      confidence,
      crossed: gap <= 0,
      driversFa: [
        "شیب EGT Margin پس از آخرین shop visit",
        "افت CPR نسبت به مرجع تصحیح‌شده",
        "یافته بوروسکوپ پره HPC",
        `سیکل از آخرین shop visit: ${Math.round(life.cso)}`,
      ],
      driversEn: [
        "EGT Margin slope since the last shop visit",
        "CPR loss versus the condition-corrected reference",
        "HPC blade borescope finding",
        `Cycles since the last shop visit: ${Math.round(life.cso)}`,
      ],
    });
  }
  if (inService && !insufficient && oilFit && latest && oilFit.slope > 0.0002) {
    const gap = 0.45 - latest.oilConsumption;
    const days = gap <= 0 ? 0 : gap / oilFit.slope;
    const hours = Math.max(0, days * hoursPerDay);
    const cycles = Math.max(0, days * cyclesPerDay);
    const confidence = clamp(0.32 + oilFit.r2 * 0.28, 0.3, 0.66);
    rul.push({
      moduleCode: "LUBE",
      titleFa: "بازه پایش روغن",
      titleEn: "Oil-watch planning range",
      hoursLow: gap <= 0 ? 0 : Math.round(hours * 0.5),
      hoursHigh: gap <= 0 ? 500 : Math.round(hours * 2.2),
      cyclesLow: gap <= 0 ? 0 : Math.round(cycles * 0.5),
      cyclesHigh: gap <= 0 ? 300 : Math.round(cycles * 2.2),
      confidence,
      crossed: gap <= 0,
      driversFa: ["روند مصرف روغن", "یادداشت ذرات فلزی", "دمای روغن"],
      driversEn: ["Oil-consumption trend", "Metal-debris note", "Oil temperature"],
    });
  }

  const utilMap = bundle.allUtilization;
  const llp: LlpRow[] = [];
  for (const inst of bundle.compInstalls) {
    const part = inst.component;
    if (!part.isLlp || !part.lifeLimitCycles) continue;
    if (inst.engineId !== bundle.id) continue;
    const events = utilMap?.get(inst.engineId) ?? bundle.utilization;
    const end = inst.removedAt && inst.removedAt < asOf ? inst.removedAt : asOf;
    if (inst.installedAt > asOf) continue;
    const gained = cyclesInWindow(events, inst.installedAt, end);
    let other = 0;
    if (utilMap) {
      for (const [engineId, ev] of utilMap) {
        if (engineId === bundle.id) continue;
        const sibling = bundle.compInstalls.find((c) => c.component.id === part.id && c.engineId === engineId);
        if (!sibling) continue;
        const sibEnd = sibling.removedAt && sibling.removedAt < asOf ? sibling.removedAt : asOf;
        if (sibling.installedAt > asOf) continue;
        other += cyclesInWindow(ev, sibling.installedAt, sibEnd).cycles;
      }
    }
    const cyclesUsed = gained.cycles + other;
    const remaining = part.lifeLimitCycles - cyclesUsed;
    llp.push({
      componentId: part.id,
      serialNumber: part.serialNumber,
      partNumber: part.partNumber,
      name: part.name,
      nameFa: part.nameFa,
      moduleCode: part.moduleCode,
      lifeLimitCycles: part.lifeLimitCycles,
      cyclesUsed,
      remaining,
      remainingPct: (remaining / part.lifeLimitCycles) * 100,
    });
  }

  faults.sort((a, b) => b.probability - a.probability);
  return { life, modules, limiting, engineHealth, insufficient, faults, rul, llp, latest, deltas, measured, reference };
}

function ratePerDay(events: LifeEvent[], asOf: Date, key: "flightHours" | "flightCycles") {
  const recent = events.filter((e) => e.kind === "flight" && e.eventAt <= asOf);
  if (recent.length < 2) return key === "flightHours" ? 8 : 4;
  const last = recent[recent.length - 1].eventAt.getTime();
  const windowStart = last - 180 * 86400000;
  const slice = recent.filter((e) => e.eventAt.getTime() >= windowStart);
  const sum = slice.reduce((s, e) => s + e[key], 0);
  const days = Math.max(30, (last - slice[0].eventAt.getTime()) / 86400000);
  return sum / days;
}

export function bandOf(value: number, band: LimitBand | undefined) {
  if (!band) return "unknown";
  if (band.alertMin != null && value < band.alertMin) return "alert";
  if (band.alertMax != null && value > band.alertMax) return "alert";
  if (band.nominalMin != null && value < band.nominalMin) return "watch";
  if (band.nominalMax != null && value > band.nominalMax) return "watch";
  if (band.nominalMin == null && band.nominalMax == null) return "unknown";
  return "nominal";
}
