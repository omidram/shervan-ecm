export type StationDef = {
  id: string;
  moduleCode: string;
  name: string;
  nameFa: string;
  partNumber: string;
  short: string;
};

export const STATIONS: StationDef[] = [
  { id: "FAN-SPIN", moduleCode: "FAN", name: "Spinner", nameFa: "اسپینر", partNumber: "SHV-FAN-SPIN", short: "SPIN" },
  { id: "FAN-DISK", moduleCode: "FAN", name: "Fan disk", nameFa: "دیسک فن", partNumber: "SHV-FAN-DISK-7B", short: "DISK" },
  { id: "FAN-BLD", moduleCode: "FAN", name: "Fan blades", nameFa: "پره‌های فن", partNumber: "SHV-FAN-BLD", short: "BLD" },
  { id: "FAN-CASE", moduleCode: "FAN", name: "Fan case", nameFa: "پوسته فن", partNumber: "SHV-FAN-CASE", short: "CASE" },
  { id: "FAN-OGV", moduleCode: "FAN", name: "Outlet guide vanes", nameFa: "پره راهنمای خروجی", partNumber: "SHV-FAN-OGV", short: "OGV" },
  { id: "LPC-S1", moduleCode: "LPC", name: "Booster stage 1", nameFa: "بوستر مرحله ۱", partNumber: "SHV-LPC-S1", short: "S1" },
  { id: "LPC-S2", moduleCode: "LPC", name: "Booster stage 2", nameFa: "بوستر مرحله ۲", partNumber: "SHV-LPC-S2", short: "S2" },
  { id: "LPC-S3", moduleCode: "LPC", name: "Booster stage 3", nameFa: "بوستر مرحله ۳", partNumber: "SHV-LPC-S3", short: "S3" },
  { id: "LPC-ST", moduleCode: "LPC", name: "Booster stators", nameFa: "استاتور بوستر", partNumber: "SHV-LPC-ST", short: "ST" },
  { id: "HPC-IGV", moduleCode: "HPC", name: "HPC inlet guide vane", nameFa: "پره راهنمای ورودی HPC", partNumber: "SHV-HPC-IGV", short: "IGV" },
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `HPC-S${i + 1}`,
    moduleCode: "HPC",
    name: `HPC stage ${i + 1}`,
    nameFa: `HPC مرحله ${i + 1}`,
    partNumber: i === 5 ? "SHV-HPC-S6-BLD" : `SHV-HPC-S${i + 1}`,
    short: `S${i + 1}`,
  })),
  { id: "COMB-LINER", moduleCode: "COMB", name: "Combustor liner", nameFa: "لاینر محفظه", partNumber: "SHV-COMB-LINER", short: "LINER" },
  { id: "COMB-NOZ", moduleCode: "COMB", name: "Fuel nozzles", nameFa: "نازل سوخت", partNumber: "SHV-COMB-NOZ", short: "NOZ" },
  { id: "COMB-IGN", moduleCode: "COMB", name: "Igniters", nameFa: "شمع جرقه", partNumber: "SHV-COMB-IGN", short: "IGN" },
  { id: "HPT-NGV", moduleCode: "HPT", name: "HPT nozzle", nameFa: "نازل HPT", partNumber: "SHV-HPT-NGV", short: "NGV" },
  { id: "HPT-DISK", moduleCode: "HPT", name: "HPT disk", nameFa: "دیسک HPT", partNumber: "SHV-HPT-DISK-7B", short: "DISK" },
  { id: "HPT-BLD", moduleCode: "HPT", name: "HPT blades", nameFa: "پره HPT", partNumber: "SHV-HPT-BLD", short: "BLD" },
  { id: "HPT-SHRD", moduleCode: "HPT", name: "HPT shroud", nameFa: "شرود HPT", partNumber: "SHV-HPT-SHRD", short: "SHRD" },
  { id: "LPT-S1", moduleCode: "LPT", name: "LPT stage 1", nameFa: "LPT مرحله ۱", partNumber: "SHV-LPT-S1", short: "S1" },
  { id: "LPT-S2", moduleCode: "LPT", name: "LPT stage 2", nameFa: "LPT مرحله ۲", partNumber: "SHV-LPT-S2", short: "S2" },
  { id: "LPT-S3", moduleCode: "LPT", name: "LPT stage 3", nameFa: "LPT مرحله ۳", partNumber: "SHV-LPT-S3", short: "S3" },
  { id: "LPT-S4", moduleCode: "LPT", name: "LPT stage 4", nameFa: "LPT مرحله ۴", partNumber: "SHV-LPT-S4", short: "S4" },
  { id: "LPT-TRF", moduleCode: "LPT", name: "Turbine rear frame", nameFa: "قاب عقب توربین", partNumber: "SHV-LPT-TRF", short: "TRF" },
  { id: "BRG-1", moduleCode: "LUBE", name: "Bearing 1", nameFa: "یاتاقان ۱", partNumber: "SHV-BRG-1", short: "B1" },
  { id: "BRG-2", moduleCode: "LUBE", name: "Bearing 2", nameFa: "یاتاقان ۲", partNumber: "SHV-BRG-2", short: "B2" },
  { id: "BRG-3", moduleCode: "LUBE", name: "Bearing 3", nameFa: "یاتاقان ۳", partNumber: "SHV-BRG-3", short: "B3" },
  { id: "BRG-4", moduleCode: "LUBE", name: "Bearing 4", nameFa: "یاتاقان ۴", partNumber: "SHV-BRG-4", short: "B4" },
  { id: "BRG-5", moduleCode: "LUBE", name: "Bearing 5", nameFa: "یاتاقان ۵", partNumber: "SHV-BRG-5", short: "B5" },
  { id: "OIL-TANK", moduleCode: "LUBE", name: "Oil tank", nameFa: "مخزن روغن", partNumber: "SHV-OIL-TANK", short: "TANK" },
  { id: "OIL-PUMP", moduleCode: "LUBE", name: "Oil pump", nameFa: "پمپ روغن", partNumber: "SHV-OIL-PUMP", short: "PMP" },
  { id: "OIL-FILT", moduleCode: "LUBE", name: "Oil filter", nameFa: "فیلتر روغن", partNumber: "SHV-OIL-FILT", short: "FILT" },
  { id: "OIL-CHIP", moduleCode: "LUBE", name: "Chip detector", nameFa: "آشکارساز تراشه", partNumber: "SHV-OIL-CHIP", short: "CHIP" },
  { id: "FUEL-PUMP", moduleCode: "AGB", name: "Fuel pump", nameFa: "پمپ سوخت", partNumber: "SHV-FUEL-PUMP", short: "FP" },
  { id: "FUEL-CTRL", moduleCode: "AGB", name: "Fuel control", nameFa: "کنترل سوخت", partNumber: "SHV-FUEL-CTRL", short: "FC" },
  { id: "VSV", moduleCode: "HPC", name: "Variable stator", nameFa: "استاتور متغیر", partNumber: "SHV-HPC-VSV", short: "VSV" },
  { id: "VBV", moduleCode: "LPC", name: "Variable bleed valve", nameFa: "شیر بلید متغیر", partNumber: "SHV-LPC-VBV", short: "VBV" },
  { id: "AGB", moduleCode: "AGB", name: "Accessory gearbox", nameFa: "جعبه‌دنده ملحقات", partNumber: "SHV-AGB", short: "AGB" },
  { id: "STARTER", moduleCode: "AGB", name: "Starter", nameFa: "استارتر", partNumber: "SHV-AGB-STR", short: "STR" },
  { id: "IDG", moduleCode: "AGB", name: "IDG", nameFa: "ژنراتور IDG", partNumber: "SHV-AGB-IDG", short: "IDG" },
  { id: "EEC", moduleCode: "AGB", name: "EEC", nameFa: "کنترلر الکترونیکی", partNumber: "SHV-EEC", short: "EEC" },
];

const HERO = "eng-779184";

export function stationHealth(engineId: string, stationId: string, moduleHealth: number | null) {
  if (moduleHealth == null) return null;
  if (engineId !== HERO) return moduleHealth;
  if (stationId === "HPC-S6") return 46;
  if (stationId === "HPT-DISK") return 58;
  if (stationId === "HPC-S5" || stationId === "HPC-S7" || stationId === "VSV") return Math.min(68, moduleHealth + 6);
  if (stationId.startsWith("HPC-")) return Math.min(74, moduleHealth + 12);
  if (stationId === "OIL-CHIP" || stationId === "BRG-3") return Math.min(moduleHealth, 70);
  return moduleHealth;
}

export function stationFinding(engineId: string, stationId: string) {
  if (engineId !== HERO) return { fa: "", en: "" };
  if (stationId === "HPC-S6") {
    return {
      fa: "بوروسکوپ ۲۰۲۴-۱۰-۲۰: سایش لبه حمله در قطاع ۴ و ۵. دو پره از حد بلِند خط گذشته بود. مرحله ۶ هنوز یافته باز این موتور است.",
      en: "Borescope 2024-10-20: leading-edge erosion in sectors 4 and 5. Two blades were beyond line blend limits. Stage 6 is still the open finding on this engine.",
    };
  }
  if (stationId === "HPT-DISK") {
    return {
      fa: "دیسک HPT به حد سیکل مطالعاتی نزدیک است. این مصرف عمر است، نه ساعت قطعی خرابی.",
      en: "The HPT disk is close to its study cycle limit. That is life consumption, not a certain failure hour.",
    };
  }
  if (stationId === "OIL-CHIP" || stationId === "BRG-3") {
    return {
      fa: "آشکارساز تراشه تمیز است. آهن روغن در باند پایش است و هنوز تراشه نداده.",
      en: "The chip detector is clean. Oil iron is in the watch band and no chip has been found.",
    };
  }
  return { fa: "", en: "" };
}

export function stationById(id: string) {
  return STATIONS.find((station) => station.id === id) ?? null;
}
