import type { Prisma } from "@prisma/client";
import { referenceAt, type SampleRow } from "./assess";
import { seedBoard } from "./board-seed";
import { extractFields } from "./extract";

type Db = Prisma.TransactionClient;

function day(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function eachMonth(y1: number, m1: number, y2: number, m2: number) {
  const out: Date[] = [];
  let y = y1;
  let m = m1;
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push(new Date(Date.UTC(y, m - 1, 15, 12, 0, 0)));
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MODULES: [string, string, string, string, number][] = [
  ["FAN", "Fan", "فن", "1-stage fan", 1],
  ["LPC", "LPC", "LPC", "3-stage booster", 2],
  ["HPC", "HPC", "HPC", "9-stage high-pressure compressor", 3],
  ["COMB", "Combustor", "محفظه احتراق", "Annular combustor", 4],
  ["HPT", "HPT", "HPT", "1-stage high-pressure turbine", 5],
  ["LPT", "LPT", "LPT", "4-stage low-pressure turbine", 6],
  ["AGB", "Accessory gearbox", "جعبه‌دنده ملحقات", "Accessory gearbox", 7],
  ["LUBE", "Lubrication", "روغن‌کاری", "Oil tank, pressure and scavenge", 8],
];

type Baseline = {
  id: string;
  modelId: string;
  parameter: string;
  unit: string;
  refValue: number;
  refAltitudeFt: number;
  refOatC: number;
  refThrustPct: number;
  per1000Ft: number;
  perDegOat: number;
  perThrustPct: number;
  note: string;
};

function baselineRows(modelId: string): Baseline[] {
  const five = modelId.endsWith("5b");
  const note = "Engineering reference at a study cruise point. Not a controlled OEM limit.";
  const spec: [string, string, number, number, number, number][] = [
    ["egtMargin", "°C", five ? 76 : 80, 0.12, -0.35, -0.22],
    ["n1", "%", 86.5, -0.03, -0.008, 0.07],
    ["n2", "%", five ? 95.1 : 94.2, -0.02, 0.006, 0.025],
    ["fuelFlow", "kg/h", five ? 1420 : 1280, -6.5, 1.8, 9.5],
    ["epr", "", five ? 1.7 : 1.62, -0.0015, 0, 0.0035],
    ["cpr", "", five ? 12.4 : 11.6, -0.015, -0.003, 0.02],
    ["vibFan", "ips", 0.35, 0, 0, 0],
    ["vibCore", "ips", 0.4, 0, 0, 0],
    ["oilPressure", "psi", 55, 0.05, -0.04, 0.02],
    ["oilTemp", "°C", 95, -0.12, 0.22, 0.06],
    ["oilQty", "L", 16, 0, 0, 0],
    ["oilConsumption", "L/h", 0.12, 0, 0.0004, 0],
  ];
  return spec.map(([parameter, unit, refValue, per1000Ft, perDegOat, perThrustPct]) => ({
    id: `${modelId}-${parameter}`,
    modelId,
    parameter,
    unit,
    refValue,
    refAltitudeFt: 35000,
    refOatC: -54,
    refThrustPct: 92,
    per1000Ft,
    perDegOat,
    perThrustPct,
    note,
  }));
}

function limitRows(modelId: string) {
  const five = modelId.endsWith("5b");
  const note = "Study band used by the health model. Not a certified redline.";
  const rows: {
    parameter: string;
    unit: string;
    nominalMin?: number;
    nominalMax?: number;
    alertMin?: number;
    alertMax?: number;
  }[] = [
    { parameter: "egtMargin", unit: "°C", nominalMin: five ? 48 : 50, alertMin: five ? 22 : 25 },
    { parameter: "n1", unit: "%", nominalMin: 78, nominalMax: 92, alertMin: 70, alertMax: 98 },
    { parameter: "n2", unit: "%", nominalMin: 90, nominalMax: 98, alertMin: 84, alertMax: 102 },
    { parameter: "fuelFlow", unit: "kg/h", nominalMin: five ? 1200 : 1100, nominalMax: five ? 1600 : 1450, alertMax: five ? 1750 : 1600 },
    { parameter: "epr", unit: "", nominalMin: five ? 1.5 : 1.45, nominalMax: five ? 1.9 : 1.8 },
    { parameter: "cpr", unit: "", nominalMin: five ? 11.6 : 11.0, nominalMax: five ? 13.2 : 12.2 },
    { parameter: "vibFan", unit: "ips", nominalMax: 1, alertMax: 2 },
    { parameter: "vibCore", unit: "ips", nominalMax: 1, alertMax: 2 },
    { parameter: "oilPressure", unit: "psi", nominalMin: 40, nominalMax: 80, alertMin: 30 },
    { parameter: "oilTemp", unit: "°C", nominalMin: 60, nominalMax: 120, alertMax: 140 },
    { parameter: "oilQty", unit: "L", nominalMin: 12, alertMin: 8 },
    { parameter: "oilConsumption", unit: "L/h", nominalMax: 0.2, alertMax: 0.45 },
  ];
  return rows.map((row) => ({
    id: `${modelId}-lim-${row.parameter}`,
    modelId,
    note,
    nominalMin: null,
    nominalMax: null,
    watchMin: null,
    watchMax: null,
    alertMin: null,
    alertMax: null,
    ...row,
  }));
}

function failureRows(modelId: string) {
  const modes = [
    {
      code: "fan_imbalance",
      name: "Fan imbalance",
      nameFa: "نامیزانی فن",
      moduleCode: "FAN",
      summaryFa: "رشد دامنه یک‌بار در هر دور فن، با فاز تکرارپذیر، بدون رشد هم‌زمان مرتبه هسته.",
      summaryEn: "A repeatable once-per-revolution fan amplitude that grows without a matching core-order rise.",
      indicators: "N1 1/rev amplitude, stable phase, fan-blade condition",
      confirmFa: "توزین گشتاور پره‌ها و ثبت فاز در دو پرواز پایدار.",
      confirmEn: "A blade moment-weight survey and a repeatable phase on two stable flights.",
      clearFa: "بازگشت دامنه به باند آرام مطالعاتی پس از بالانس، و ناپدید شدن فاز تکرارپذیر.",
      clearEn: "Amplitude back inside the study quiet band after balance, and the repeatable phase gone.",
    },
    {
      code: "hpc_deterioration",
      name: "HPC deterioration",
      nameFa: "افت HPC",
      moduleCode: "HPC",
      summaryFa: "افت تدریجی EGT Margin همراه با کاهش نسبت فشار کمپرسور و سابقه آسیب لبه پره.",
      summaryEn: "A gradual EGT Margin loss with a compressor pressure-ratio drop and prior blade-edge damage.",
      indicators: "EGT Margin slope, CPR residual, HPC borescope",
      confirmFa: "بوروسکوپ مرحله‌های میانی HPC و آزمون عملکرد با تصحیح شرایط.",
      confirmEn: "A mid-stage HPC borescope and a condition-corrected performance test.",
      clearFa: "بازگشت CPR و EGT Margin به باند نامی مطالعاتی پس از بازیابی ماژول، در چند نقطه پایدار.",
      clearEn: "CPR and EGT Margin back inside the study nominal band on several stable points after module restoration.",
    },
    {
      code: "combustor_pattern",
      name: "Combustor pattern",
      nameFa: "الگوی محفظه احتراق",
      moduleCode: "COMB",
      summaryFa: "نشانه رگه داغ یا سوخت ناقص که در پراکندگی دما دیده می‌شود، نه فقط در میانگین EGT.",
      summaryEn: "A hot-streak or poor-burn indication that shows up in temperature scatter, not only in mean EGT.",
      indicators: "EGT spread where available, liner findings, fuel-nozzle notes",
      confirmFa: "بازرسی لاینر و نازل سوخت، و در صورت وجود، پروفیل دمای خروجی.",
      confirmEn: "A liner and fuel-nozzle inspection, plus an exit-temperature profile if one exists.",
      clearFa: "رفع یافته سخت‌افزاری و پایدار شدن پراکندگی دما.",
      clearEn: "The hardware finding closed and the temperature scatter settled.",
    },
    {
      code: "hpt_distress",
      name: "HPT distress",
      nameFa: "آسیب HPT",
      moduleCode: "HPT",
      summaryFa: "افت EGT که با افت راندمان توربین پرفشار جور درمی‌آید، جدا از مصرف عمر سیکلی دیسک.",
      summaryEn: "EGT loss that fits a high-pressure-turbine efficiency drop, distinct from disk cycle-life consumption.",
      indicators: "EGT Margin, HPT efficiency residual, oxidation findings",
      confirmFa: "بوروسکوپ نازل و پره HPT.",
      confirmEn: "A borescope of the HPT nozzle and blades.",
      clearFa: "نبود آسیب در بوروسکوپ و توقف افت EGT پس از اقدام روی علت دیگر.",
      clearEn: "No distress on borescope, and the EGT loss stops after the other cause is addressed.",
    },
    {
      code: "bearing_oil_debris",
      name: "Bearing / oil debris",
      nameFa: "یاتاقان و ذرات روغن",
      moduleCode: "LUBE",
      summaryFa: "افزایش مصرف روغن، دمای روغن، یا ذرات فلزی؛ ارتعاش پهن‌باند در صورت پیشرفت.",
      summaryEn: "Rising oil use, oil temperature, or metallic debris, with broadband vibration if it progresses.",
      indicators: "Oil consumption, SOAP, oil temperature and pressure, broadband vibration",
      confirmFa: "نمونه روغن تکراری و در صورت هشدار، بازرسی تراشه و فیلتر.",
      confirmEn: "A repeat oil sample and, if the watch persists, a chip-detector and filter check.",
      clearFa: "بازگشت مصرف و ذرات به باند آرام در دو نمونه پیاپی، بدون تراشه.",
      clearEn: "Consumption and debris back in the quiet band on two consecutive samples, with no chips.",
    },
    {
      code: "lpt_vibration",
      name: "LPT vibration",
      nameFa: "ارتعاش LPT",
      moduleCode: "LPT",
      summaryFa: "رشد مرتبه مرتبط با توربین کم‌فشار، جدا از نامیزانی فن.",
      summaryEn: "A low-pressure-turbine order rising apart from fan imbalance.",
      indicators: "LPT order amplitude and phase, LPT efficiency residual",
      confirmFa: "برداشت مرتبه در دو سطح توان و بازرسی مرحله‌های LPT در صورت ادامه.",
      confirmEn: "An order survey at two power settings and an LPT stage inspection if it persists.",
      clearFa: "فروکش دامنه مرتبه LPT به باند آرام مطالعاتی.",
      clearEn: "The LPT-order amplitude back inside the study quiet band.",
    },
  ];
  return modes.map((mode) => ({ ...mode, id: `${modelId}-${mode.code}`, modelId }));
}

const STANDARD = { altitudeFt: 35000, oatC: -54, thrustPct: 92, phase: "cruise" };

function applyCondition(
  parameter: string,
  trueValue: number,
  cond: { altitudeFt: number; oatC: number; thrustPct: number },
  baselines: Baseline[],
) {
  const baseline = baselines.find((b) => b.parameter === parameter);
  if (!baseline) return trueValue;
  const probe = {
    recordedAt: new Date(),
    altitudeFt: cond.altitudeFt,
    oatC: cond.oatC,
    thrustPct: cond.thrustPct,
    egtMargin: 0,
    n1: 0,
    n2: 0,
    fuelFlow: 0,
    epr: 0,
    cpr: 0,
    vibFan: 0,
    vibCore: 0,
    vibOrder: "",
    oilPressure: 0,
    oilTemp: 0,
    oilQty: 0,
    oilConsumption: 0,
  } satisfies SampleRow;
  return trueValue + (referenceAt(baseline, probe) - baseline.refValue);
}

type Truth = Record<string, number>;

function sampleFrom(
  id: string,
  engineId: string,
  at: Date,
  truth: Truth,
  cond: { altitudeFt: number; oatC: number; thrustPct: number; phase: string },
  baselines: Baseline[],
  vibOrder: string,
) {
  const raw = (parameter: string) => applyCondition(parameter, truth[parameter], cond, baselines);
  return {
    id,
    engineId,
    recordedAt: at,
    altitudeFt: cond.altitudeFt,
    oatC: cond.oatC,
    thrustPct: cond.thrustPct,
    phase: cond.phase,
    egtMargin: raw("egtMargin"),
    n1: raw("n1"),
    n2: raw("n2"),
    fuelFlow: raw("fuelFlow"),
    epr: raw("epr"),
    cpr: raw("cpr"),
    vibFan: raw("vibFan"),
    vibCore: raw("vibCore"),
    vibOrder,
    oilPressure: raw("oilPressure"),
    oilTemp: raw("oilTemp"),
    oilQty: raw("oilQty"),
    oilConsumption: raw("oilConsumption"),
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export async function seedAll(db: Db) {
  const orgs = [
    { id: "org-kavir", name: "Kavir Aero Capital", nameFa: "کویر آیرو کاپیتال", kind: "owner", code: "KAVIR" },
    { id: "org-alborz", name: "Alborz Asset Leasing", nameFa: "اجاره دارایی البرز", kind: "owner", code: "ALBORZ" },
    { id: "org-narin", name: "Narin Air", nameFa: "نارین ایر", kind: "operator", code: "NARIN" },
    { id: "org-sepid", name: "Sepid Jet", nameFa: "سپید جت", kind: "operator", code: "SEPID" },
    { id: "org-rayyan", name: "Rayyan AeroWorks", nameFa: "رایان آئروورکس", kind: "mro", code: "RAYYAN" },
    { id: "org-lanjan", name: "Lanjan Propulsion", nameFa: "پیشران لنجان", kind: "mro", code: "LANJAN" },
    { id: "org-caa", name: "Demo Airworthiness Desk", nameFa: "میز بازرسی نمایشی", kind: "authority", code: "DESK" },
    { id: "org-audit", name: "Records Audit Cell", nameFa: "واحد ممیزی سوابق", kind: "audit", code: "AUDIT" },
  ];
  await db.organization.createMany({ data: orgs });

  await db.engineFamily.create({
    data: { id: "fam-cfm", manufacturer: "CFM International", name: "CFM56" },
  });

  await db.engineModel.createMany({
    data: [
      {
        id: "model-7b",
        familyId: "fam-cfm",
        code: "CFM56-7B",
        name: "CFM56-7B",
        thrustLbf: 27300,
        bypassRatio: 5.1,
        fanDiameterIn: 61,
        opr: 32.7,
        spoolCount: 2,
        note: "Study point for a high-rated -7B class two-spool turbofan. Dash ratings differ. These figures are public-architecture context, not a certified data sheet.",
      },
      {
        id: "model-5b",
        familyId: "fam-cfm",
        code: "CFM56-5B",
        name: "CFM56-5B",
        thrustLbf: 32000,
        bypassRatio: 5.5,
        fanDiameterIn: 68.3,
        opr: 35.5,
        spoolCount: 2,
        note: "Study point for a high-rated -5B class engine. Same module tree in this product, different baselines. Not a certified data sheet.",
      },
    ],
  });

  const moduleRows = [];
  const baseRows: Baseline[] = [];
  const bands = [];
  const modes = [];
  for (const modelId of ["model-7b", "model-5b"]) {
    for (const [code, name, nameFa, stageNote, sortOrder] of MODULES) {
      moduleRows.push({ id: `${modelId}-${code}`, modelId, code, name, nameFa, stageNote, sortOrder });
    }
    baseRows.push(...baselineRows(modelId));
    bands.push(...limitRows(modelId));
    modes.push(...failureRows(modelId));
  }
  await db.moduleTemplate.createMany({ data: moduleRows });
  await db.baselineCoeff.createMany({ data: baseRows });
  await db.limitBand.createMany({ data: bands });
  await db.failureMode.createMany({ data: modes });

  await db.catalogPart.createMany({
    data: [
      {
        id: "cat-hpc-set",
        modelId: "model-7b",
        partNumber: "SHV-HPC-S6-SET",
        name: "HPC stage 6 blade set",
        nameFa: "مجموعه پره مرحله ۶ HPC",
        moduleCode: "HPC",
        typicalQty: 12,
        isLlp: false,
      },
      {
        id: "cat-hpt-disk",
        modelId: "model-7b",
        partNumber: "SHV-HPT-DISK-7B",
        name: "HPT disk",
        nameFa: "دیسک HPT",
        moduleCode: "HPT",
        typicalQty: 1,
        isLlp: true,
        lifeLimitCycles: 20000,
      },
      {
        id: "cat-5b-hpt",
        modelId: "model-5b",
        partNumber: "SHV-HPT-DISK-5B",
        name: "HPT disk",
        nameFa: "دیسک HPT",
        moduleCode: "HPT",
        typicalQty: 1,
        isLlp: true,
        lifeLimitCycles: 20000,
      },
    ],
  });

  await db.aircraft.createMany({
    data: [
      { id: "ac-4418", typeName: "Boeing 737-800", registration: "FV-4418", operatorOrgId: "org-narin" },
      { id: "ac-4426", typeName: "Boeing 737-800", registration: "FV-4426", operatorOrgId: "org-narin" },
      { id: "ac-4430", typeName: "Boeing 737-800", registration: "FV-4430", operatorOrgId: "org-narin" },
      { id: "ac-4438", typeName: "Boeing 737-800", registration: "FV-4438", operatorOrgId: "org-narin" },
      { id: "ac-2201", typeName: "Airbus A320", registration: "FV-2201", operatorOrgId: "org-sepid" },
    ],
  });

  await db.engine.createMany({
    data: [
      {
        id: "eng-779184",
        modelId: "model-7b",
        serialNumber: "779184",
        partNumber: "SHV-7B27-CFG",
        buildDate: day("2016-03-12"),
        configuration: "7B27 study configuration, 27,300 lbf class",
        status: "In Service",
        ownerOrgId: "org-kavir",
        operatorOrgId: "org-narin",
        hero: true,
        recordGap: false,
      },
      {
        id: "eng-780012",
        modelId: "model-7b",
        serialNumber: "780012",
        partNumber: "SHV-7B26-CFG",
        buildDate: day("2022-01-20"),
        configuration: "7B26 study configuration",
        status: "In Service",
        ownerOrgId: "org-kavir",
        operatorOrgId: "org-narin",
      },
      {
        id: "eng-771903",
        modelId: "model-7b",
        serialNumber: "771903",
        partNumber: "SHV-7B27-CFG",
        buildDate: day("2014-11-02"),
        configuration: "7B27 study configuration",
        status: "Under Maintenance",
        ownerOrgId: "org-kavir",
        operatorOrgId: "org-narin",
      },
      {
        id: "eng-765440",
        modelId: "model-7b",
        serialNumber: "765440",
        partNumber: "SHV-7B22-CFG",
        buildDate: day("2013-04-18"),
        configuration: "Incomplete — combustor and turbine records missing",
        status: "Under Inspection",
        ownerOrgId: "org-kavir",
        operatorOrgId: null,
        recordGap: true,
        gapNoteFa: "ساعت و سیکل ثبت نشده، دستورکار ناقص است، و ماژول‌های Combustor تا LPT در پیکربندی نیستند.",
        gapNoteEn: "No hours or cycles on file, the work order is blank, and combustor through LPT modules are missing from the configuration.",
      },
      {
        id: "eng-697221",
        modelId: "model-5b",
        serialNumber: "697221",
        partNumber: "SHV-5B3-CFG",
        buildDate: day("2018-07-09"),
        configuration: "5B high-rating study configuration",
        status: "Active",
        ownerOrgId: "org-alborz",
        operatorOrgId: "org-sepid",
      },
      {
        id: "eng-698004",
        modelId: "model-5b",
        serialNumber: "698004",
        partNumber: "SHV-5B4-CFG",
        buildDate: day("2019-02-14"),
        configuration: "5B mid-rating study configuration",
        status: "Standby",
        ownerOrgId: "org-alborz",
        operatorOrgId: "org-sepid",
      },
      {
        id: "eng-782550",
        modelId: "model-7b",
        serialNumber: "782550",
        partNumber: "SHV-7B24-CFG",
        buildDate: day("2021-05-01"),
        configuration: "7B24 study configuration, preserved",
        status: "In Storage",
        ownerOrgId: "org-alborz",
        operatorOrgId: null,
      },
      {
        id: "eng-774010",
        modelId: "model-7b",
        serialNumber: "774010",
        partNumber: "SHV-7B26-CFG",
        buildDate: day("2017-09-22"),
        configuration: "7B26 study configuration",
        status: "Unserviceable",
        ownerOrgId: "org-kavir",
        operatorOrgId: "org-narin",
      },
    ],
  });

  await db.engineAuthorization.createMany({
    data: [
      { id: "auth-1", engineId: "eng-779184", orgId: "org-rayyan", purpose: "shop" },
      { id: "auth-2", engineId: "eng-780012", orgId: "org-rayyan", purpose: "shop" },
      { id: "auth-3", engineId: "eng-771903", orgId: "org-rayyan", purpose: "shop" },
      { id: "auth-4", engineId: "eng-697221", orgId: "org-lanjan", purpose: "shop" },
      { id: "auth-5", engineId: "eng-698004", orgId: "org-lanjan", purpose: "shop" },
    ],
  });

  const status = (
    id: string,
    engineId: string,
    statusName: string,
    eventAt: string,
    source: string,
    reasonFa: string,
    reasonEn: string,
  ) => ({ id, engineId, status: statusName, eventAt: day(eventAt), source, reasonFa, reasonEn, actor: "records import" });

  await db.statusEvent.createMany({
    data: [
      status("st-hero-1", "eng-779184", "In Service", "2016-05-12", "delivery log", "ورود به خدمت روی FV-4418", "Entered service on FV-4418"),
      status("st-hero-2", "eng-779184", "Standby", "2021-06-30", "lease return", "پیاده برای انتقال مالکیت", "Removed for the ownership transfer"),
      status("st-hero-3", "eng-779184", "In Service", "2021-09-01", "operator log", "نصب روی FV-4426", "Installed on FV-4426"),
      status("st-hero-4", "eng-779184", "Under Maintenance", "2024-10-18", "MRO induction", "ورود به shop visit", "Inducted for the shop visit"),
      status("st-hero-5", "eng-779184", "In Service", "2025-02-06", "release certificate", "بازگشت به خدمت", "Returned to service"),
      status("st-12", "eng-780012", "In Service", "2022-04-02", "delivery log", "ورود به خدمت", "Entered service"),
      status("st-13", "eng-771903", "In Service", "2015-03-01", "delivery log", "ورود به خدمت", "Entered service"),
      status("st-14", "eng-771903", "Under Maintenance", "2026-09-04", "MRO induction", "ورود به تعمیرگاه رایان", "Inducted at Rayyan"),
      status("st-15", "eng-765440", "Under Inspection", "2026-10-01", "records desk", "پرونده ناقص؛ وضعیت تا تکمیل سوابق", "Incomplete records; status held until the file is rebuilt"),
      status("st-16", "eng-697221", "Active", "2019-08-01", "delivery log", "ورود به خدمت", "Entered service"),
      status("st-17", "eng-698004", "Active", "2020-01-15", "delivery log", "ورود به خدمت", "Entered service"),
      status("st-18", "eng-698004", "Standby", "2026-06-20", "operator log", "پیاده به عنوان موتور ذخیره", "Removed as a spare"),
      status("st-19", "eng-782550", "In Service", "2021-08-01", "delivery log", "ورود به خدمت", "Entered service"),
      status("st-20", "eng-782550", "In Storage", "2025-12-12", "preservation record", "انتقال به انبار با نگهداری حفاظتی", "Placed in storage under preservation"),
      status("st-21", "eng-774010", "In Service", "2018-01-10", "delivery log", "ورود به خدمت", "Entered service"),
      status("st-22", "eng-774010", "Unserviceable", "2026-04-19", "line inspection", "آسیب جسم خارجی روی فن؛ خارج از توان خط", "Fan foreign-object damage beyond line maintenance"),
    ],
  });

  await db.ownershipTransfer.createMany({
    data: [
      {
        id: "own-hero-1",
        engineId: "eng-779184",
        fromOrgId: null,
        toOrgId: "org-narin",
        transferredAt: day("2016-03-20"),
        reasonFa: "تحویل اولیه به بهره‌بردار نخست. در این مدل نمایشی، بهره‌بردار در ابتدا مالک ثبتی هم بوده است.",
        reasonEn: "Initial delivery. In this demo the first operator was also the registered owner.",
        actor: "records import",
      },
      {
        id: "own-hero-2",
        engineId: "eng-779184",
        fromOrgId: "org-narin",
        toOrgId: "org-kavir",
        transferredAt: day("2021-06-30"),
        reasonFa: "انتقال به شرکت اجاره کویر پس از پایان اجاره عملیاتی.",
        reasonEn: "Transfer to Kavir Aero Capital at the end of the operating lease.",
        actor: "records import",
      },
      {
        id: "own-780",
        engineId: "eng-780012",
        toOrgId: "org-kavir",
        transferredAt: day("2022-01-20"),
        reasonFa: "تحویل به مالک",
        reasonEn: "Delivered to the owner",
        actor: "records import",
      },
      {
        id: "own-771",
        engineId: "eng-771903",
        toOrgId: "org-kavir",
        transferredAt: day("2014-11-02"),
        reasonFa: "تحویل به مالک",
        reasonEn: "Delivered to the owner",
        actor: "records import",
      },
      {
        id: "own-765",
        engineId: "eng-765440",
        toOrgId: "org-kavir",
        transferredAt: day("2013-04-18"),
        reasonFa: "مالکیت ثبت شده؛ زنجیره قبلی در پرونده نیست.",
        reasonEn: "Ownership is on file; the earlier chain is missing.",
        actor: "records import",
      },
      {
        id: "own-697",
        engineId: "eng-697221",
        toOrgId: "org-alborz",
        transferredAt: day("2018-07-09"),
        reasonFa: "تحویل به مالک",
        reasonEn: "Delivered to the owner",
        actor: "records import",
      },
      {
        id: "own-698",
        engineId: "eng-698004",
        toOrgId: "org-alborz",
        transferredAt: day("2019-02-14"),
        reasonFa: "تحویل به مالک",
        reasonEn: "Delivered to the owner",
        actor: "records import",
      },
      {
        id: "own-782",
        engineId: "eng-782550",
        toOrgId: "org-alborz",
        transferredAt: day("2021-05-01"),
        reasonFa: "تحویل به مالک",
        reasonEn: "Delivered to the owner",
        actor: "records import",
      },
      {
        id: "own-774",
        engineId: "eng-774010",
        toOrgId: "org-kavir",
        transferredAt: day("2017-09-22"),
        reasonFa: "تحویل به مالک",
        reasonEn: "Delivered to the owner",
        actor: "records import",
      },
    ],
  });

  // Narin was first owner in the transfer table but the engine.owner is Kavir now.
  // The first transfer used org-narin which is an operator. That's OK — an operator can be a historic owner in the demo.
  // Wait: OwnershipTransfer.toOrgId references Organization. org-narin exists. Good.
  // But I set fromOrg of the second transfer as org-narin. The first toOrg is org-narin. Good.
  // However the seed comment in the first transfer says operator was owner. The organization kind is operator.
  // That's a bit inconsistent but the history shows two owners: Narin Air then Kavir. The spec wants two owners.
  // Narin is primarily an operator. Let me leave it — the UI shows organization names, and Narin appears as previous owner.
  // A cleaner story: first owner is a lessor that we already used... I used Narin as first owner AND current operator.
  // That's actually realistic (airline owned then sold and leased back). Good.

  await db.installation.createMany({
    data: [
      {
        id: "inst-hero-1",
        engineId: "eng-779184",
        aircraftId: "ac-4418",
        position: "1",
        installedAt: day("2016-05-12"),
        removedAt: day("2021-06-30"),
        installReasonFa: "تحویل و نصب اولیه",
        installReasonEn: "Delivery installation",
        removalReasonFa: "پایان اجاره و انتقال مالکیت",
        removalReasonEn: "Lease end and ownership transfer",
        actor: "records import",
      },
      {
        id: "inst-hero-2",
        engineId: "eng-779184",
        aircraftId: "ac-4426",
        position: "2",
        installedAt: day("2021-09-01"),
        removedAt: day("2024-10-18"),
        installReasonFa: "نصب پس از انتقال به کویر",
        installReasonEn: "Installed after the transfer to Kavir",
        removalReasonFa: "پیاده برای shop visit",
        removalReasonEn: "Removed for the shop visit",
        actor: "records import",
      },
      {
        id: "inst-hero-3",
        engineId: "eng-779184",
        aircraftId: "ac-4426",
        position: "2",
        installedAt: day("2025-02-06"),
        removedAt: null,
        installReasonFa: "بازگشت به همان هواپیما پس از ترخیص",
        installReasonEn: "Returned to the same aircraft after release",
        actor: "records import",
      },
      {
        id: "inst-780",
        engineId: "eng-780012",
        aircraftId: "ac-4430",
        position: "1",
        installedAt: day("2022-04-02"),
        installReasonFa: "نصب اولیه",
        installReasonEn: "Initial installation",
        actor: "records import",
      },
      {
        id: "inst-771",
        engineId: "eng-771903",
        aircraftId: "ac-4438",
        position: "1",
        installedAt: day("2020-02-01"),
        removedAt: day("2026-09-04"),
        installReasonFa: "نصب",
        installReasonEn: "Installation",
        removalReasonFa: "ورود به تعمیرگاه",
        removalReasonEn: "Shop induction",
        actor: "records import",
      },
      {
        id: "inst-697",
        engineId: "eng-697221",
        aircraftId: "ac-2201",
        position: "1",
        installedAt: day("2019-08-01"),
        installReasonFa: "نصب اولیه",
        installReasonEn: "Initial installation",
        actor: "records import",
      },
    ],
  });

  const util: {
    id: string;
    engineId: string;
    eventAt: Date;
    kind: string;
    flightHours: number;
    flightCycles: number;
    source: string;
    note: string;
    actor: string;
  }[] = [];

  const pushMonths = (
    engineId: string,
    months: Date[],
    hours: number,
    cycles: number,
    source = "operator flight log",
  ) => {
    months.forEach((eventAt, index) => {
      util.push({
        id: `util-${engineId}-${index}-${eventAt.getUTCFullYear()}${eventAt.getUTCMonth() + 1}`,
        engineId,
        eventAt,
        kind: "flight",
        flightHours: hours,
        flightCycles: cycles,
        source,
        note: "",
        actor: "records import",
      });
    });
  };

  const heroPre = eachMonth(2016, 6, 2024, 10);
  const heroPost = eachMonth(2025, 2, 2026, 11);
  pushMonths("eng-779184", heroPre, 290, 155);
  pushMonths("eng-779184", heroPost, 305, 165);
  util.push({
    id: "util-hero-test",
    engineId: "eng-779184",
    eventAt: day("2025-01-16"),
    kind: "ground_run",
    flightHours: 18,
    flightCycles: 0,
    source: "test cell",
    note: "Acceptance run after the shop visit",
    actor: "records import",
  });

  pushMonths("eng-780012", eachMonth(2022, 4, 2026, 11), 300, 160);
  pushMonths("eng-771903", eachMonth(2020, 2, 2026, 8), 280, 150);
  pushMonths("eng-697221", eachMonth(2019, 8, 2026, 11), 310, 170);
  pushMonths("eng-698004", eachMonth(2020, 2, 2026, 6), 260, 140);
  pushMonths("eng-782550", eachMonth(2021, 8, 2025, 11), 240, 120);
  pushMonths("eng-774010", eachMonth(2018, 2, 2026, 4), 270, 145);
  await db.utilizationEvent.createMany({ data: util });

  const tsnAtShop = heroPre.length * 290;
  const csnAtShop = heroPre.length * 155;
  const heroCsn = csnAtShop + heroPost.length * 165;
  const llpRemaining = 20000 - heroCsn;

  const components: Prisma.ComponentCreateManyInput[] = [];
  const compInstalls: Prisma.ComponentInstallationCreateManyInput[] = [];

  const moduleSet = (engineId: string, serial: string, from: string, codes: string[]) => {
    for (const code of codes) {
      const id = `cmp-${serial}-${code}`;
      const meta = MODULES.find((m) => m[0] === code)!;
      components.push({
        id,
        partNumber: `SHV-MOD-${code}`,
        serialNumber: `${code}-${serial}`,
        name: `${meta[1]} module`,
        nameFa: `ماژول ${meta[2]}`,
        moduleCode: code,
        isLlp: false,
        manufacturer: "study build",
      });
      compInstalls.push({
        id: `ci-${serial}-${code}`,
        componentId: id,
        engineId,
        moduleCode: code,
        position: "module",
        installedAt: day(from),
        reasonFa: "نصب از ساخت / تحویل",
        reasonEn: "Fitted from build / delivery",
        actor: "records import",
      });
    }
  };

  moduleSet("eng-779184", "779184", "2016-03-20", MODULES.map((m) => m[0]));
  moduleSet("eng-780012", "780012", "2022-01-20", MODULES.map((m) => m[0]));
  moduleSet("eng-771903", "771903", "2014-11-02", MODULES.map((m) => m[0]));
  moduleSet("eng-765440", "765440", "2013-04-18", ["FAN", "LPC", "HPC"]);
  moduleSet("eng-697221", "697221", "2018-07-09", MODULES.map((m) => m[0]));
  moduleSet("eng-698004", "698004", "2019-02-14", MODULES.map((m) => m[0]));
  moduleSet("eng-782550", "782550", "2021-05-01", MODULES.map((m) => m[0]));
  moduleSet("eng-774010", "774010", "2017-09-22", MODULES.map((m) => m[0]));

  components.push(
    {
      id: "cmp-hpt-disk",
      partNumber: "SHV-HPT-DISK-7B",
      serialNumber: "HPTD-18442",
      name: "HPT disk",
      nameFa: "دیسک HPT",
      moduleCode: "HPT",
      isLlp: true,
      lifeLimitCycles: 20000,
      manufacturer: "study build",
    },
    {
      id: "cmp-fan-disk",
      partNumber: "SHV-FAN-DISK-7B",
      serialNumber: "FAND-18442",
      name: "Fan disk",
      nameFa: "دیسک فن",
      moduleCode: "FAN",
      isLlp: true,
      lifeLimitCycles: 30000,
      manufacturer: "study build",
    },
    {
      id: "cmp-blade",
      partNumber: "SHV-HPC-S6-BLD",
      serialNumber: "HPB-44190",
      name: "HPC stage 6 blade",
      nameFa: "پره مرحله ۶ HPC",
      moduleCode: "HPC",
      isLlp: false,
      manufacturer: "study build",
    },
    {
      id: "cmp-5b-disk",
      partNumber: "SHV-HPT-DISK-5B",
      serialNumber: "HPTD-5B-221",
      name: "HPT disk",
      nameFa: "دیسک HPT",
      moduleCode: "HPT",
      isLlp: true,
      lifeLimitCycles: 20000,
      manufacturer: "study build",
    },
  );
  compInstalls.push(
    {
      id: "ci-hpt-disk",
      componentId: "cmp-hpt-disk",
      engineId: "eng-779184",
      moduleCode: "HPT",
      position: "HPT disk",
      installedAt: day("2016-03-20"),
      reasonFa: "نصب از ساخت",
      reasonEn: "Fitted at build",
      actor: "records import",
    },
    {
      id: "ci-fan-disk",
      componentId: "cmp-fan-disk",
      engineId: "eng-779184",
      moduleCode: "FAN",
      position: "Fan disk",
      installedAt: day("2016-03-20"),
      reasonFa: "نصب از ساخت",
      reasonEn: "Fitted at build",
      actor: "records import",
    },
    {
      id: "ci-blade-1",
      componentId: "cmp-blade",
      engineId: "eng-779184",
      moduleCode: "HPC",
      position: "HPC S6",
      installedAt: day("2016-03-20"),
      removedAt: day("2024-11-02"),
      reasonFa: "نصب از ساخت",
      reasonEn: "Fitted at build",
      actor: "records import",
    },
    {
      id: "ci-blade-2",
      componentId: "cmp-blade",
      engineId: "eng-780012",
      moduleCode: "HPC",
      position: "HPC S6",
      installedAt: day("2025-03-10"),
      reasonFa: "نصب قطعه سرویس‌پذیر پس از shop visit موتور ۷۷۹۱۸۴",
      reasonEn: "Serviceable part installed after shop visit of engine 779184",
      actor: "records import",
    },
    {
      id: "ci-5b-disk",
      componentId: "cmp-5b-disk",
      engineId: "eng-697221",
      moduleCode: "HPT",
      position: "HPT disk",
      installedAt: day("2018-07-09"),
      reasonFa: "نصب از ساخت",
      reasonEn: "Fitted at build",
      actor: "records import",
    },
  );

  await db.component.createMany({ data: components });
  await db.componentInstallation.createMany({ data: compInstalls });

  await db.maintenanceRecord.createMany({
    data: [
      {
        id: "rec-hero-delivery",
        engineId: "eng-779184",
        versionGroupId: "vg-hero-delivery",
        version: 1,
        type: "inspection",
        titleFa: "بازرسی تحویل",
        titleEn: "Delivery inspection",
        narrativeFa: "موتور پس از ساخت پذیرفته شد. این سابقه تأییدشده و فقط با نسخه جدید قابل تصحیح است.",
        narrativeEn: "Engine accepted after build. This verified record can be corrected only by a new version.",
        performedAt: day("2016-05-12"),
        releasedAt: day("2016-05-12"),
        workOrder: "WO-DEL-779184",
        hoursAtEvent: 0,
        cyclesAtEvent: 0,
        approvalStatus: "verified",
        immutable: true,
        actor: "records import",
      },
      {
        id: "rec-hero-bore",
        engineId: "eng-779184",
        versionGroupId: "vg-hero-bore",
        version: 1,
        type: "borescope",
        titleFa: "بوروسکوپ HPC پیش از shop visit",
        titleEn: "Pre-shop HPC borescope",
        narrativeFa: "لبه حمله پره‌های مرحله ۶ HPC در قطاع ۴ و ۵ دچار سایش است. دو پره خارج از حد تعمیر خط بود.",
        narrativeEn: "HPC stage 6 leading edges in sectors 4 and 5 are eroded. Two blades were beyond line blend limits.",
        actionsFa: "ادامه پایش تا ورود به تعمیرگاه؛ تعویض دو پره در shop visit.",
        actionsEn: "Watch until induction; two blades replaced at the shop visit.",
        performedAt: day("2024-10-20"),
        releasedAt: day("2024-10-20"),
        mroOrgId: "org-rayyan",
        workOrder: "WO-BS-441",
        hoursAtEvent: tsnAtShop,
        cyclesAtEvent: csnAtShop,
        approvalStatus: "verified",
        immutable: true,
        actor: "records import",
      },
      {
        id: "rec-hero-sv",
        engineId: "eng-779184",
        versionGroupId: "vg-hero-sv",
        version: 1,
        type: "shop_visit",
        titleFa: "Shop visit بازیابی HPC",
        titleEn: "HPC restoration shop visit",
        narrativeFa: "ورود برای بازیابی کمپرسور پرفشار. پره سرویس‌پذیر HPB-44190 پیاده و بعداً روی موتور ۷۸۰۰۱۲ نصب شد. آزمون عملکرد پذیرفته شد و EGT Margin نسبت به موتور نو کمتر ماند.",
        narrativeEn: "Inducted for HPC restoration. Serviceable blade HPB-44190 came off and was later fitted to engine 780012. The performance test was accepted with EGT Margin still below a new engine.",
        actionsFa: "تعویض دو پره آسیب‌دیده، پیاده کردن HPB-44190، آزمون پذیرش.",
        actionsEn: "Replaced two damaged blades, removed HPB-44190, ran the acceptance test.",
        performedAt: day("2024-11-02"),
        releasedAt: day("2025-01-18"),
        mroOrgId: "org-rayyan",
        workOrder: "WO-88421",
        hoursAtEvent: tsnAtShop,
        cyclesAtEvent: csnAtShop,
        approvalStatus: "verified",
        immutable: true,
        actor: "records import",
      },
      {
        id: "rec-hero-test",
        engineId: "eng-779184",
        versionGroupId: "vg-hero-test",
        version: 1,
        type: "performance_test",
        titleFa: "آزمون عملکرد پذیرش",
        titleEn: "Acceptance performance test",
        narrativeFa: "آزمون سلول تست پس از shop visit پذیرفته شد. حاشیه دما کمتر از مرجع مطالعاتی موتور نو بود.",
        narrativeEn: "Post-shop test-cell run accepted. Temperature margin remained below the new-engine study reference.",
        performedAt: day("2025-01-16"),
        releasedAt: day("2025-01-16"),
        mroOrgId: "org-rayyan",
        workOrder: "WO-88421-PT",
        hoursAtEvent: tsnAtShop + 18,
        cyclesAtEvent: csnAtShop,
        approvalStatus: "verified",
        immutable: true,
        actor: "records import",
      },
      {
        id: "rec-hero-soap",
        engineId: "eng-779184",
        versionGroupId: "vg-hero-soap",
        version: 1,
        type: "inspection",
        titleFa: "آنالیز روغن",
        titleEn: "Oil analysis",
        narrativeFa: "نمونه SOAP رشد ملایم آهن را نشان می‌دهد. هنوز به آستانه هشدار مطالعاتی نرسیده و باید تکرار شود.",
        narrativeEn: "SOAP shows a mild iron rise. It is not at the study alert threshold and should be repeated.",
        performedAt: day("2026-08-12"),
        releasedAt: day("2026-08-12"),
        mroOrgId: "org-rayyan",
        workOrder: "WO-SOAP-190",
        approvalStatus: "original",
        immutable: false,
        actor: "records import",
      },
      {
        id: "rec-shop-open",
        engineId: "eng-771903",
        versionGroupId: "vg-shop-open",
        version: 1,
        type: "shop_visit",
        titleFa: "Shop visit باز",
        titleEn: "Open shop visit",
        narrativeFa: "موتور در تعمیرگاه رایان است و هنوز ترخیص نشده.",
        narrativeEn: "The engine is at Rayyan and has not been released.",
        performedAt: day("2026-09-04"),
        mroOrgId: "org-rayyan",
        workOrder: "WO-90210",
        approvalStatus: "original",
        actor: "records import",
      },
      {
        id: "rec-gap",
        engineId: "eng-765440",
        versionGroupId: "vg-gap",
        version: 1,
        type: "inspection",
        titleFa: "یادداشت ناقص پرونده",
        titleEn: "Incomplete file note",
        narrativeFa: "دستورکار و نتیجه بازرسی در پرونده نیست.",
        narrativeEn: "The work order and the inspection result are missing from the file.",
        performedAt: day("2026-10-01"),
        workOrder: "",
        approvalStatus: "original",
        actor: "records import",
      },
      {
        id: "rec-store",
        engineId: "eng-782550",
        versionGroupId: "vg-store",
        version: 1,
        type: "preservation",
        titleFa: "ورود به انبار",
        titleEn: "Storage preservation",
        narrativeFa: "موتور خشک و پلمب شده و در انبار البرز است.",
        narrativeEn: "Engine inhibited and stored with Alborz.",
        performedAt: day("2025-12-12"),
        releasedAt: day("2025-12-12"),
        approvalStatus: "original",
        actor: "records import",
      },
      {
        id: "rec-fod",
        engineId: "eng-774010",
        versionGroupId: "vg-fod",
        version: 1,
        type: "inspection",
        titleFa: "آسیب جسم خارجی فن",
        titleEn: "Fan foreign object damage",
        narrativeFa: "چند پره فن آسیب دیده و موتور غیرقابل خدمت اعلام شده است.",
        narrativeEn: "Several fan blades are damaged and the engine is unserviceable.",
        actionsFa: "تعویض مجموعه پره در تعمیرگاه لازم است.",
        actionsEn: "A fan-blade set replacement needs a shop.",
        performedAt: day("2026-04-19"),
        releasedAt: day("2026-04-19"),
        workOrder: "WO-FOD-17",
        approvalStatus: "verified",
        immutable: true,
        actor: "records import",
      },
    ],
  });

  await db.defect.createMany({
    data: [
      {
        id: "def-hpc",
        recordId: "rec-hero-bore",
        moduleCode: "HPC",
        descriptionFa: "سایش لبه حمله پره مرحله ۶ HPC در قطاع ۴ و ۵. دو پره تعویض شد و سایش باقیمانده تحت پایش است.",
        descriptionEn: "HPC stage 6 leading-edge erosion in sectors 4 and 5. Two blades were replaced and residual erosion stays on watch.",
        severity: "medium",
        disposition: "monitor",
        status: "monitor",
        foundAt: day("2024-10-20"),
      },
      {
        id: "def-soap",
        recordId: "rec-hero-soap",
        moduleCode: "LUBE",
        descriptionFa: "رشد ملایم آهن در SOAP. تکرار نمونه‌گیری لازم است.",
        descriptionEn: "Mild iron rise on SOAP. Repeat sampling is required.",
        severity: "low",
        disposition: "monitor",
        status: "monitor",
        foundAt: day("2026-08-12"),
      },
      {
        id: "def-fod",
        recordId: "rec-fod",
        moduleCode: "FAN",
        descriptionFa: "آسیب جسم خارجی روی چند پره فن، خارج از حد تعمیر خط.",
        descriptionEn: "Foreign object damage on several fan blades, beyond line limits.",
        severity: "high",
        disposition: "unserviceable",
        status: "open",
        foundAt: day("2026-04-19"),
      },
    ],
  });

  await db.partAction.createMany({
    data: [
      {
        id: "pa-1",
        recordId: "rec-hero-sv",
        action: "off",
        partNumber: "SHV-HPC-S6-BLD",
        serialNumber: "HPB-44190",
        name: "HPC stage 6 blade",
        qty: 1,
        moduleCode: "HPC",
      },
      {
        id: "pa-2",
        recordId: "rec-hero-sv",
        action: "off",
        partNumber: "SHV-HPC-S6-BLD",
        serialNumber: "scrap-pair",
        name: "HPC stage 6 blade",
        qty: 2,
        moduleCode: "HPC",
      },
      {
        id: "pa-3",
        recordId: "rec-hero-sv",
        action: "on",
        partNumber: "SHV-HPC-S6-BLD",
        serialNumber: "HPB-77201",
        name: "HPC stage 6 blade",
        qty: 2,
        moduleCode: "HPC",
      },
    ],
  });

  const heroShopText = `SHOP VISIT REPORT
Organization: Rayyan AeroWorks
Work Order: WO-88421
Engine Serial Number: 779184
Part Number: SHV-7B27-CFG
Model: CFM56-7B
Date inducted: 2024-11-02
Date released: 2025-01-18
TSN: ${tsnAtShop.toFixed(1)} hours
CSN: ${csnAtShop} cycles
Module: HPC
Finding: HPC stage 6 blades show leading-edge erosion. Two blades were replaced. Blade HPB-44190 was removed serviceable.
Result: performance test accepted with EGT margin below the study baseline.`;

  const openShopText = `SHOP VISIT REPORT
Organization: Rayyan AeroWorks
Work Order: WO-90210
Engine Serial Number: 771903
Part Number: SHV-7B27-CFG
Model: CFM56-7B
Date inducted: 2026-09-04
TSN: 26880 hours
CSN: 14400 cycles
Module: HPC
Finding: Performance deterioration reported by the operator. Induction borescope is not closed.
`;

  const docs: {
    id: string;
    engineId: string;
    ownerOrgId: string;
    mroOrgId?: string;
    visibility: string;
    titleFa: string;
    titleEn: string;
    docClass: string;
    filename: string;
    bodyText: string;
    extract: boolean;
  }[] = [
    {
      id: "doc-hero-sv",
      engineId: "eng-779184",
      ownerOrgId: "org-kavir",
      mroOrgId: "org-rayyan",
      visibility: "shared",
      titleFa: "گزارش shop visit موتور ۷۷۹۱۸۴",
      titleEn: "Shop visit report, engine 779184",
      docClass: "shop_visit",
      filename: "WO-88421-shop-visit.txt",
      bodyText: heroShopText,
      extract: true,
    },
    {
      id: "doc-shop-open",
      engineId: "eng-771903",
      ownerOrgId: "org-kavir",
      mroOrgId: "org-rayyan",
      visibility: "shared",
      titleFa: "گزارش ورود به تعمیرگاه موتور ۷۷۱۹۰۳",
      titleEn: "Induction report, engine 771903",
      docClass: "shop_visit",
      filename: "WO-90210-induction.txt",
      bodyText: openShopText,
      extract: true,
    },
    {
      id: "doc-kavir-lease",
      engineId: "eng-779184",
      ownerOrgId: "org-kavir",
      visibility: "owner_confidential",
      titleFa: "پیوست محرمانه اجاره کویر",
      titleEn: "Kavir confidential lease schedule",
      docClass: "commercial",
      filename: "kavir-lease-779184.txt",
      bodyText:
        "CONFIDENTIAL LEASE SCHEDULE\nOwner: Kavir Aero Capital\nEngine Serial Number: 779184\nResidual value note and insurance deductible. Not for MRO or other owners.",
      extract: false,
    },
    {
      id: "doc-alborz-lease",
      engineId: "eng-697221",
      ownerOrgId: "org-alborz",
      visibility: "owner_confidential",
      titleFa: "پیوست محرمانه اجاره البرز",
      titleEn: "Alborz confidential lease schedule",
      docClass: "commercial",
      filename: "alborz-lease-697221.txt",
      bodyText:
        "CONFIDENTIAL LEASE SCHEDULE\nOwner: Alborz Asset Leasing\nEngine Serial Number: 697221\nPurchase option and residual. Other owners must not see this file.",
      extract: false,
    },
    {
      id: "doc-rayyan-note",
      engineId: "eng-779184",
      ownerOrgId: "org-kavir",
      mroOrgId: "org-rayyan",
      visibility: "mro_internal",
      titleFa: "یادداشت داخلی رایان",
      titleEn: "Rayyan internal note",
      docClass: "internal_note",
      filename: "rayyan-internal-779184.txt",
      bodyText:
        "INTERNAL NOTE\nRayyan AeroWorks\nBay 2 crew estimate for engine 779184. Commercial labour rate is internal to Rayyan and is not for the operator portal.",
      extract: false,
    },
    {
      id: "doc-lanjan-note",
      engineId: "eng-697221",
      ownerOrgId: "org-alborz",
      mroOrgId: "org-lanjan",
      visibility: "mro_internal",
      titleFa: "یادداشت داخلی لنجان",
      titleEn: "Lanjan internal note",
      docClass: "internal_note",
      filename: "lanjan-internal-697221.txt",
      bodyText:
        "INTERNAL NOTE\nLanjan Propulsion\nQuote draft for engine 697221. Not visible to Rayyan or to the owner portal.",
      extract: false,
    },
  ];

  await db.document.createMany({
    data: docs.map((doc) => ({
      id: doc.id,
      engineId: doc.engineId,
      ownerOrgId: doc.ownerOrgId,
      mroOrgId: doc.mroOrgId,
      visibility: doc.visibility,
      titleFa: doc.titleFa,
      titleEn: doc.titleEn,
      docClass: doc.docClass,
      filename: doc.filename,
      bodyText: doc.bodyText,
      methodNote: doc.extract ? "rule-based:v1" : "filed without extraction",
      uploadedAt: day("2026-11-01"),
      uploadedBy: "records import",
    })),
  });

  const fields = docs
    .filter((doc) => doc.extract)
    .flatMap((doc) =>
      extractFields(doc.bodyText).map((field, index) => ({
        id: `${doc.id}-f-${index}`,
        documentId: doc.id,
        fieldKey: field.fieldKey,
        labelFa: field.labelFa,
        labelEn: field.labelEn,
        value: field.value,
        confidence: field.confidence,
        page: field.page,
        method: field.method,
        status: "pending",
        moduleCode: field.moduleCode,
      })),
    );
  await db.extractionField.createMany({ data: fields });

  const base7 = baseRows.filter((b) => b.modelId === "model-7b");
  const base5 = baseRows.filter((b) => b.modelId === "model-5b");
  const samples: Prisma.PerformanceSampleCreateManyInput[] = [];

  const pushTrend = (
    engineId: string,
    months: Date[],
    from: Truth,
    to: Truth,
    baselines: Baseline[],
    rand: () => number,
    orderFor: (truth: Truth) => string,
    noise = 0.35,
  ) => {
    const noiseScale: Record<string, number> = {
      egtMargin: 1,
      n1: 0.35,
      n2: 0.2,
      fuelFlow: 8,
      epr: 0.012,
      cpr: 0.08,
      vibFan: 0.08,
      vibCore: 0.12,
      oilPressure: 1.2,
      oilTemp: 0.8,
      oilQty: 0.25,
      oilConsumption: 0.02,
    };
    months.forEach((at, index) => {
      const t = months.length === 1 ? 1 : index / (months.length - 1);
      const truth: Truth = {};
      for (const key of Object.keys(from)) {
        truth[key] = lerp(from[key], to[key], t) + (rand() - 0.5) * noise * (noiseScale[key] ?? 1);
      }
      let cond = STANDARD;
      const stamp = at.toISOString().slice(0, 7);
      if (engineId === "eng-779184" && stamp === "2026-06") cond = { altitudeFt: 28000, oatC: -30, thrustPct: 88, phase: "climb" };
      if (engineId === "eng-779184" && stamp === "2026-09") cond = { altitudeFt: 37000, oatC: -60, thrustPct: 96, phase: "cruise" };
      samples.push(sampleFrom(`smp-${engineId}-${index}-${stamp}`, engineId, at, truth, cond, baselines, orderFor(truth)));
    });
  };

  const healthyTruth = (egt: number): Truth => ({
    egtMargin: egt,
    n1: 86.4,
    n2: 94.15,
    fuelFlow: 1276,
    epr: 1.625,
    cpr: 11.58,
    vibFan: 0.36,
    vibCore: 0.42,
    oilPressure: 56,
    oilTemp: 96,
    oilQty: 16.1,
    oilConsumption: 0.11,
  });

  const heroStart: Truth = {
    egtMargin: 71,
    n1: 86.3,
    n2: 94.35,
    fuelFlow: 1292,
    epr: 1.612,
    cpr: 11.5,
    vibFan: 0.38,
    vibCore: 0.42,
    oilPressure: 55,
    oilTemp: 97,
    oilQty: 16,
    oilConsumption: 0.14,
  };
  const heroEnd: Truth = {
    egtMargin: 36,
    n1: 86.7,
    n2: 95.05,
    fuelFlow: 1340,
    epr: 1.584,
    cpr: 11.16,
    vibFan: 0.41,
    vibCore: 1.55,
    oilPressure: 53,
    oilTemp: 108,
    oilQty: 15.5,
    oilConsumption: 0.37,
  };
  const heroRand = mulberry32(779184);
  pushTrend(
    "eng-779184",
    eachMonth(2024, 1, 2024, 10),
    { ...heroStart, egtMargin: 64, cpr: 11.42, vibCore: 0.7, oilConsumption: 0.22, n2: 94.6, fuelFlow: 1310 },
    { ...heroStart, egtMargin: 49, cpr: 11.28, vibCore: 0.95, oilConsumption: 0.28, n2: 94.8, fuelFlow: 1324 },
    base7,
    heroRand,
    (truth) => (truth.vibCore > 0.8 ? "N2 1/rev" : "N1 1/rev"),
    0.25,
  );
  pushTrend(
    "eng-779184",
    heroPost,
    heroStart,
    heroEnd,
    base7,
    heroRand,
    (truth) => (truth.vibCore > 0.8 ? "N2 1/rev" : "N1 1/rev"),
    0.28,
  );

  const healthyRand = mulberry32(780012);
  pushTrend(
    "eng-780012",
    eachMonth(2024, 6, 2026, 11),
    healthyTruth(84),
    healthyTruth(82.5),
    base7,
    healthyRand,
    () => "N1 1/rev",
    0.22,
  );

  pushTrend(
    "eng-771903",
    eachMonth(2025, 1, 2026, 8),
    healthyTruth(70),
    { ...healthyTruth(58), oilConsumption: 0.16, vibCore: 0.6 },
    base7,
    mulberry32(771903),
    () => "N1 1/rev",
    0.3,
  );

  const fiveTruth = (egt: number): Truth => ({
    egtMargin: egt,
    n1: 86.2,
    n2: 95.0,
    fuelFlow: 1410,
    epr: 1.69,
    cpr: 12.35,
    vibFan: 0.33,
    vibCore: 0.4,
    oilPressure: 57,
    oilTemp: 94,
    oilQty: 18,
    oilConsumption: 0.1,
  });
  pushTrend("eng-697221", eachMonth(2024, 1, 2026, 11), fiveTruth(78), fiveTruth(74), base5, mulberry32(697221), () => "N1 1/rev", 0.25);
  pushTrend("eng-698004", eachMonth(2024, 1, 2026, 6), fiveTruth(77), fiveTruth(75), base5, mulberry32(698004), () => "N1 1/rev", 0.2);
  pushTrend("eng-782550", eachMonth(2024, 1, 2025, 11), healthyTruth(81), healthyTruth(79), base7, mulberry32(782550), () => "N1 1/rev", 0.2);
  pushTrend(
    "eng-774010",
    eachMonth(2025, 1, 2026, 4),
    { ...healthyTruth(72), vibFan: 0.8 },
    { ...healthyTruth(66), vibFan: 1.7, egtMargin: 66 },
    base7,
    mulberry32(774010),
    () => "N1 1/rev",
    0.25,
  );
  await db.performanceSample.createMany({ data: samples });

  await db.inventoryItem.createMany({
    data: [
      {
        id: "inv-blades",
        orgId: "org-rayyan",
        partNumber: "SHV-HPC-S6-SET",
        name: "HPC stage 6 blade set",
        qtyOnHand: 8,
        qtyReserved: 0,
        location: "Rayyan bond, bay 2 cage",
        condition: "serviceable",
      },
      {
        id: "inv-disk",
        orgId: "org-rayyan",
        partNumber: "SHV-HPT-DISK-7B",
        name: "HPT disk",
        qtyOnHand: 1,
        qtyReserved: 0,
        location: "Rayyan LLP cage",
        condition: "serviceable",
      },
    ],
  });

  const parts = [
    { partNumber: "SHV-HPC-S6-SET", nameFa: "مجموعه پره مرحله ۶ HPC", nameEn: "HPC stage 6 blade set", qty: 12, moduleCode: "HPC" },
    { partNumber: "SHV-HPT-DISK-7B", nameFa: "دیسک HPT", nameEn: "HPT disk", qty: 1, moduleCode: "HPT" },
  ];

  await db.maintenancePlan.create({
    data: {
      id: "plan-hero",
      engineId: "eng-779184",
      moduleCode: "HPC",
      titleFa: "القای برنامه‌ریزی‌شده HPC و دیسک HPT",
      titleEn: "Planned HPC and HPT-disk induction",
      windowStart: day("2026-12-15"),
      windowEnd: day("2027-02-28"),
      status: "proposed",
      partsJson: JSON.stringify(parts),
      mroOrgId: "org-rayyan",
      slotNoteFa: "اسکله ۲ رایان، ۱۲ تا ۱۴ روز، هم‌زمان با توقف برنامه‌ای FV-4426 در ۶ ژانویه ۲۰۲۷. زمان اضافی روی زمین حدود ۲ روز است، در برابر یک پیاده برنامه‌نشده حدود ۱۸ روز.",
      slotNoteEn: "Rayyan bay 2, 12 to 14 days, aligned with the planned FV-4426 downtime on 6 January 2027. Extra ground time is about 2 days, against about 18 days for an unscheduled removal.",
      skillsFa: "مکانیک ماژول HPC، بازرس بوروسکوپ، بالانس، و تأییدکننده قطعه عمرمحدود.",
      skillsEn: "HPC module mechanic, borescope inspector, balance technician, and LLP certifying staff.",
      costLow: 480000,
      costHigh: 760000,
      currency: "USD",
      inductionAt: day("2027-01-06"),
      groundTimeDays: 14,
      rationaleFa: `دیسک HPT این موتور حدود ${llpRemaining.toLocaleString("en-US")} سیکل تا حد عمر مطالعاتی ۲۰٬۰۰۰ فاصله دارد و افت EGT Margin پس از shop visit ادامه دارد. جمع کردن تعویض دیسک و بازیابی HPC در همان توقف، زمان روی زمین را کم می‌کند. این برنامه تصمیم صلاحیت پروازی نیست.`,
      rationaleEn: `The HPT disk is about ${llpRemaining.toLocaleString("en-US")} cycles from the 20,000-cycle study limit, and EGT Margin has kept falling since the shop visit. Combining the disk change with HPC restoration in the same downtime cuts ground time. This plan is not an airworthiness decision.`,
    },
  });

  await db.auditLog.createMany({
    data: [
      {
        id: "aud-seed",
        at: day("2026-11-22"),
        actor: "system",
        actorRole: "inspector",
        orgId: "org-caa",
        action: "seed",
        entityType: "fleet",
        entityId: "fleet",
        engineId: "",
        summaryFa: "ناوگان نمایشی بارگذاری شد. داده‌ها ساختگی است.",
        summaryEn: "Demo fleet loaded. All operators, serials, and shops are fictional.",
      },
      {
        id: "aud-transfer",
        at: day("2021-06-30"),
        actor: "records import",
        actorRole: "owner",
        orgId: "org-kavir",
        action: "ownership_transfer",
        entityType: "engine",
        entityId: "eng-779184",
        engineId: "eng-779184",
        summaryFa: "مالکیت موتور ۷۷۹۱۸۴ از نارین ایر به کویر آیرو کاپیتال منتقل شد.",
        summaryEn: "Engine 779184 ownership moved from Narin Air to Kavir Aero Capital.",
      },
      {
        id: "aud-verify",
        at: day("2025-01-20"),
        actor: "records import",
        actorRole: "inspector",
        orgId: "org-caa",
        action: "verify_record",
        entityType: "maintenance",
        entityId: "rec-hero-sv",
        engineId: "eng-779184",
        summaryFa: "سابقه shop visit موتور ۷۷۹۱۸۴ تأیید شد و از این پس فقط با نسخه جدید عوض می‌شود.",
        summaryEn: "The shop visit on engine 779184 was verified and can change only by a new version.",
      },
    ],
  });

  await seedBoard(db);
}
