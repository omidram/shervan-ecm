export const EXTRACT_METHOD = "rule-based:v1";

export type ExtractedField = {
  fieldKey: string;
  labelFa: string;
  labelEn: string;
  value: string;
  confidence: number;
  page: number;
  method: string;
  moduleCode: string;
};

const RULES: {
  fieldKey: string;
  labelFa: string;
  labelEn: string;
  re: RegExp;
  confidence: number;
  moduleFromValue?: boolean;
}[] = [
  { fieldKey: "serial", labelFa: "شماره سریال", labelEn: "Serial number", re: /Serial Number:\s*([A-Za-z0-9-]+)/i, confidence: 0.93 },
  { fieldKey: "partNumber", labelFa: "شماره قطعه", labelEn: "Part number", re: /Part Number:\s*([A-Za-z0-9-]+)/i, confidence: 0.9 },
  { fieldKey: "model", labelFa: "مدل", labelEn: "Model", re: /Model:\s*(CFM56-[0-9A-Z]+)/i, confidence: 0.9 },
  { fieldKey: "workOrder", labelFa: "دستور کار", labelEn: "Work order", re: /Work Order:\s*([A-Za-z0-9-]+)/i, confidence: 0.91 },
  { fieldKey: "induced", labelFa: "تاریخ ورود", labelEn: "Date inducted", re: /Date inducted:\s*(\d{4}-\d{2}-\d{2})/i, confidence: 0.92 },
  { fieldKey: "released", labelFa: "تاریخ ترخیص", labelEn: "Date released", re: /Date released:\s*(\d{4}-\d{2}-\d{2})/i, confidence: 0.86 },
  { fieldKey: "tsn", labelFa: "TSN", labelEn: "TSN", re: /TSN:\s*([\d,]+(?:\.\d+)?)/i, confidence: 0.88 },
  { fieldKey: "csn", labelFa: "CSN", labelEn: "CSN", re: /CSN:\s*([\d,]+(?:\.\d+)?)/i, confidence: 0.88 },
  { fieldKey: "module", labelFa: "ماژول", labelEn: "Module", re: /Module:\s*([A-Z]{2,5})\b/, confidence: 0.8 },
  { fieldKey: "finding", labelFa: "یافته", labelEn: "Finding", re: /Finding:\s*(.+)/i, confidence: 0.72 },
];

export function classifyDocument(text: string) {
  const t = text.toLowerCase();
  if (t.includes("shop visit")) return "shop_visit";
  if (t.includes("borescope")) return "borescope";
  if (t.includes("oil analysis") || t.includes("soap")) return "inspection";
  if (t.includes("performance test")) return "performance_test";
  if (t.includes("preservation")) return "preservation";
  if (t.includes("confidential") || t.includes("lease")) return "commercial";
  if (t.includes("internal note")) return "internal_note";
  return "unclassified";
}

function pageOf(text: string, index: number) {
  const pages = text.split("\f");
  let cursor = 0;
  for (let i = 0; i < pages.length; i++) {
    cursor += pages[i].length + 1;
    if (index < cursor) return i + 1;
  }
  return 1;
}

export function extractFields(text: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    const match = rule.re.exec(text);
    if (!match || seen.has(rule.fieldKey)) continue;
    seen.add(rule.fieldKey);
    const value = match[1].trim().replace(/,/g, "");
    fields.push({
      fieldKey: rule.fieldKey,
      labelFa: rule.labelFa,
      labelEn: rule.labelEn,
      value,
      confidence: rule.confidence,
      page: pageOf(text, match.index),
      method: EXTRACT_METHOD,
      moduleCode: rule.fieldKey === "module" ? value : rule.fieldKey === "finding" && /HPC/i.test(match[1]) ? "HPC" : "",
    });
  }
  return fields;
}

export function classLabel(docClass: string, locale: "fa" | "en") {
  const map: Record<string, { fa: string; en: string }> = {
    shop_visit: { fa: "گزارش Shop visit", en: "Shop visit report" },
    borescope: { fa: "گزارش Borescope", en: "Borescope report" },
    inspection: { fa: "بازرسی", en: "Inspection" },
    performance_test: { fa: "آزمون عملکرد", en: "Performance test" },
    preservation: { fa: "نگهداری حفاظتی", en: "Preservation" },
    commercial: { fa: "سند بازرگانی", en: "Commercial record" },
    internal_note: { fa: "یادداشت داخلی", en: "Internal note" },
    unclassified: { fa: "طبقه‌بندی‌نشده", en: "Unclassified" },
  };
  const row = map[docClass] ?? map.unclassified;
  return locale === "fa" ? row.fa : row.en;
}
