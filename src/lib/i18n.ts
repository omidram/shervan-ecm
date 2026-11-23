export type Locale = "fa" | "en";

export function L(locale: Locale, fa: string, en: string) {
  return locale === "fa" ? fa : en;
}

export const STATUSES = [
  "Active",
  "In Service",
  "Standby",
  "Under Inspection",
  "Under Maintenance",
  "In Storage",
  "Unserviceable",
  "Retired",
  "Unknown",
] as const;

export type EngineStatus = (typeof STATUSES)[number];

export const STATUS_GLOSS: Record<string, { fa: string; en: string }> = {
  Active: { fa: "فعال", en: "Active" },
  "In Service": { fa: "در خدمت", en: "In Service" },
  Standby: { fa: "ذخیره آماده", en: "Standby" },
  "Under Inspection": { fa: "در بازرسی", en: "Under Inspection" },
  "Under Maintenance": { fa: "در تعمیر", en: "Under Maintenance" },
  "In Storage": { fa: "انبار", en: "In Storage" },
  Unserviceable: { fa: "غیرقابل خدمت", en: "Unserviceable" },
  Retired: { fa: "بازنشسته", en: "Retired" },
  Unknown: { fa: "نامشخص / تأیید نشده", en: "Unknown / not verified" },
};

export function statusTone(status: string) {
  if (status === "Active" || status === "In Service") return "good";
  if (status === "Standby" || status === "In Storage") return "info";
  if (status === "Unserviceable" || status === "Retired") return "bad";
  return "watch";
}

export const MAINT_TYPES = [
  { id: "inspection", en: "Inspection", fa: "بازرسی" },
  { id: "borescope", en: "Borescope", fa: "بوروسکوپ" },
  { id: "shop_visit", en: "Shop visit", fa: "مراجعه تعمیرگاهی" },
  { id: "overhaul", en: "Overhaul", fa: "اورهال" },
  { id: "repair", en: "Repair", fa: "تعمیر" },
  { id: "replacement", en: "Replacement", fa: "تعویض" },
  { id: "modification", en: "Modification", fa: "اصلاحیه" },
  { id: "ndt", en: "NDT", fa: "آزمون غیرمخرب" },
  { id: "performance_test", en: "Performance test", fa: "آزمون عملکرد" },
  { id: "removal", en: "Removal", fa: "پیاده کردن" },
  { id: "installation", en: "Installation", fa: "نصب" },
  { id: "preservation", en: "Preservation", fa: "نگهداری حفاظتی" },
] as const;

export function maintType(id: string) {
  return MAINT_TYPES.find((t) => t.id === id) ?? { id, en: id, fa: id };
}

export const APPROVAL = {
  original: { fa: "اصل", en: "Original" },
  extracted: { fa: "استخراج‌شده", en: "Extracted" },
  verified: { fa: "تأییدشده", en: "Verified" },
} as const;

export const PARAMETERS = [
  { id: "egtMargin", en: "EGT Margin", fa: "EGT Margin", unit: "°C" },
  { id: "n1", en: "N1", fa: "N1", unit: "%" },
  { id: "n2", en: "N2", fa: "N2", unit: "%" },
  { id: "fuelFlow", en: "Fuel flow", fa: "Fuel flow", unit: "kg/h" },
  { id: "epr", en: "EPR", fa: "EPR", unit: "" },
  { id: "cpr", en: "Compressor pressure ratio", fa: "CPR", unit: "" },
  { id: "vibFan", en: "Vibration fan", fa: "Vibration fan", unit: "ips" },
  { id: "vibCore", en: "Vibration core", fa: "Vibration core", unit: "ips" },
  { id: "oilPressure", en: "Oil pressure", fa: "Oil pressure", unit: "psi" },
  { id: "oilTemp", en: "Oil temperature", fa: "Oil temperature", unit: "°C" },
  { id: "oilQty", en: "Oil quantity", fa: "Oil quantity", unit: "L" },
  { id: "oilConsumption", en: "Oil consumption", fa: "Oil consumption", unit: "L/h" },
] as const;

export type ParameterId = (typeof PARAMETERS)[number]["id"];

export function parameterMeta(id: string) {
  return PARAMETERS.find((p) => p.id === id) ?? PARAMETERS[0];
}
