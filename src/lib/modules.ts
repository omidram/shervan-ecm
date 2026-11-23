export const DESK_MODULES = [
  { domain: "alert", href: "/m/alert", fa: "هشدارها", en: "Alerts", section: "watch" },
  { domain: "oil", href: "/m/oil", fa: "روغن", en: "Oil", section: "watch" },
  { domain: "fuel", href: "/m/fuel", fa: "سوخت", en: "Fuel", section: "watch" },
  { domain: "start", href: "/m/start", fa: "استارت", en: "Start", section: "watch" },
  { domain: "indication", href: "/m/indication", fa: "نمایش موتور", en: "Indication", section: "watch" },
  { domain: "sensors", href: "/m/sensors", fa: "حسگرها", en: "Sensors", section: "watch" },
  { domain: "vibration", href: "/m/vibration", fa: "ارتعاش", en: "Vibration", section: "watch" },
  { domain: "borescope", href: "/m/borescope", fa: "بوروسکوپ", en: "Borescope", section: "watch" },
  { domain: "exceedance", href: "/m/exceedance", fa: "تجاوز از حد", en: "Exceedance", section: "watch" },
  { domain: "llp", href: "/m/llp", fa: "LLP", en: "LLP", section: "life" },
  { domain: "directive", href: "/m/directive", fa: "AD/SB", en: "AD/SB", section: "life" },
  { domain: "testcell", href: "/m/testcell", fa: "سلول تست", en: "Test cell", section: "life" },
  { domain: "workscope", href: "/m/workscope", fa: "ورک‌اسکوپ", en: "Workscope", section: "shop" },
  { domain: "kit", href: "/m/kit", fa: "کیت قطعات", en: "Kitting", section: "shop" },
] as const;

export type DeskDomain = (typeof DESK_MODULES)[number]["domain"];

export function deskModule(domain: string) {
  return DESK_MODULES.find((item) => item.domain === domain) ?? null;
}
