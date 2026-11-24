import { MENU } from "./nav-menu";
import type { Role } from "./session";
import { hashPassword } from "./password";
import type { PrismaClient } from "@prisma/client";

export const MODULES = [
  { id: "dashboard", fa: "داشبورد", en: "Dashboard" },
  { id: "passport", fa: "پرونده دیجیتال موتور", en: "Engine Digital Passport" },
  { id: "ownership", fa: "مالکیت و کارکرد", en: "Ownership & Operational History" },
  { id: "configuration", fa: "پیکربندی موتور", en: "Engine Configuration" },
  { id: "genealogy", fa: "تبار قطعه", en: "Component Genealogy" },
  { id: "maintenance", fa: "مدیریت تعمیرات", en: "Maintenance Management" },
  { id: "inspection", fa: "بازرسی و یافته‌ها", en: "Inspection & Findings" },
  { id: "documents", fa: "اسناد فنی", en: "Technical Documents" },
  { id: "intelligence", fa: "خواندن سند", en: "Document Intelligence" },
  { id: "health", fa: "تحلیل سلامت", en: "Engine Health Analytics" },
  { id: "predictive", fa: "نگهداری پیش‌بینانه", en: "Predictive Maintenance" },
  { id: "admin", fa: "مدیریت و امنیت", en: "Administration & Security" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

export const JOBS = [
  { id: "org_admin", fa: "مدیر سازمان", en: "Organization Administrator" },
  { id: "owner", fa: "مالک موتور", en: "Engine Owner" },
  { id: "operator", fa: "بهره‌بردار", en: "Airline Operator" },
  { id: "mro_admin", fa: "مدیر تعمیرگاه", en: "MRO Administrator" },
  { id: "mro_engineer", fa: "مهندس تعمیرات", en: "MRO Engineer" },
  { id: "inspector", fa: "بازرس فنی", en: "Technical Inspector" },
  { id: "analyst", fa: "تحلیلگر داده", en: "Engine Data Analyst" },
  { id: "auditor", fa: "ممیز فقط‌خواندنی", en: "Read-only Auditor" },
  { id: "doc_controller", fa: "کنترل اسناد", en: "Document Controller" },
  { id: "super", fa: "مدیر سامانه", en: "Super Administrator" },
] as const;

const ALL = MODULES.map((item) => item.id).join(",");

const PRESET: Record<string, string> = {
  super: ALL,
  org_admin: ALL,
  owner: "dashboard,passport,ownership,configuration,genealogy,documents,health,predictive",
  operator: "dashboard,passport,ownership,inspection,documents,health",
  mro_admin: "dashboard,passport,maintenance,inspection,documents,intelligence,health,predictive,admin",
  mro_engineer: "dashboard,passport,maintenance,inspection,documents,health",
  inspector: "dashboard,passport,inspection,documents,intelligence,health",
  analyst: "dashboard,health,predictive,passport",
  auditor: "dashboard,passport,ownership,configuration,genealogy,maintenance,inspection,documents,health,predictive",
  doc_controller: "dashboard,passport,documents,intelligence",
};

export function modulesForJob(job: string) {
  return PRESET[job] ?? PRESET.owner;
}

export function parseModules(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function accessRole(job: string, orgKind: string): Role {
  if (job === "super" || job === "inspector") return "inspector";
  if (job === "auditor") return "auditor";
  if (job === "mro_admin" || job === "mro_engineer") return "mro";
  if (job === "operator") return "operator";
  if (job === "owner") return "owner";
  if (orgKind === "mro") return "mro";
  if (orgKind === "operator") return "operator";
  if (orgKind === "authority") return "inspector";
  if (orgKind === "audit") return "auditor";
  return "owner";
}

export function moduleForPath(path: string): ModuleId | null {
  if (path.startsWith("/login") || path === "/") return null;
  if (path.startsWith("/admin") || path.startsWith("/audit")) return "admin";
  if (path.startsWith("/history")) return "ownership";
  if (path.startsWith("/reports")) return "predictive";
  if (path.startsWith("/knowledge")) return "documents";
  if (path.startsWith("/documents")) return "documents";
  if (path.startsWith("/m/alert")) return "predictive";
  if (path.startsWith("/m/oil") || path.startsWith("/m/vibration") || path.startsWith("/m/fuel") || path.startsWith("/m/start") || path.startsWith("/m/indication") || path.startsWith("/m/sensors")) return "health";
  if (path.startsWith("/m/borescope") || path.startsWith("/m/exceedance") || path.startsWith("/m/directive")) return "inspection";
  if (path.startsWith("/m/llp")) return "passport";
  if (path.startsWith("/m/testcell") || path.startsWith("/m/workscope") || path.startsWith("/m/kit")) return "maintenance";
  if (path.startsWith("/components")) return "genealogy";
  if (path.startsWith("/desk") || path.startsWith("/fleet")) return "dashboard";
  if (path.startsWith("/s/")) {
    const group = MENU.find((item) => item.id === path.split("/")[2]);
    return group?.module ?? "dashboard";
  }
  const rest = path.match(/^\/engines\/[^/]+(\/[^/?]*)?/)?.[1] ?? "";
  if (path.startsWith("/engines")) {
    if (rest.startsWith("/configuration")) return "configuration";
    if (rest.startsWith("/operations")) return "ownership";
    if (rest.startsWith("/maintenance")) return "maintenance";
    if (rest.startsWith("/gas-path") || rest.startsWith("/performance")) return "health";
    if (rest.startsWith("/faults")) return "inspection";
    if (rest.startsWith("/prognostics") || rest.startsWith("/plan")) return "predictive";
    return "passport";
  }
  return "dashboard";
}

export function canOpen(modules: string[], moduleId: ModuleId | null) {
  if (!moduleId) return true;
  return modules.includes(moduleId);
}

const DEMO: [string, string, string, string][] = [
  ["shervan.admin", "مدیر سامانه", "super", "org-caa"],
  ["kavir.admin", "مدیر کویر", "org_admin", "org-kavir"],
  ["kavir.analyst", "تحلیلگر کویر", "analyst", "org-kavir"],
  ["alborz.admin", "مدیر البرز", "org_admin", "org-alborz"],
  ["narin.ops", "عملیات نارین", "operator", "org-narin"],
  ["rayyan.admin", "مدیر رایان", "org_admin", "org-rayyan"],
  ["rayyan.engineer", "مهندس رایان", "mro_engineer", "org-rayyan"],
  ["lanjan.engineer", "مهندس لنجان", "mro_engineer", "org-lanjan"],
  ["audit.reader", "ممیز سوابق", "auditor", "org-audit"],
];

export async function seedUsers(db: PrismaClient) {
  const passwordHash = hashPassword("Shervan-184");
  for (const [username, displayName, job, orgId] of DEMO) {
    await db.appUser.create({
      data: {
        id: `user-${username}`,
        username,
        passwordHash,
        displayName,
        job,
        modules: modulesForJob(job),
        orgId,
      },
    });
  }
}
