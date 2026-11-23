"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, setLocale, setTheme } from "@/app/actions";
import type { Locale } from "@/lib/i18n";
import type { Persona } from "@/lib/session";

function menu(engineId: string) {
  const engine = engineId ? `/engines/${engineId}` : "/fleet";
  return [
    { id: "dashboard", fa: "داشبورد", en: "Dashboard", links: [
      { href: "/", fa: "میز فرمان", en: "Command desk" },
      { href: "/fleet", fa: "ناوگان شرکت", en: "Company fleet" },
    ]},
    { id: "passport", fa: "پرونده دیجیتال موتور", en: "Engine Digital Passport", links: [
      { href: engine, fa: "شناسنامه", en: "Identity" },
      { href: "/m/llp", fa: "قطعات محدودعمر", en: "Life limited parts" },
    ]},
    { id: "ownership", fa: "مالکیت و کارکرد", en: "Ownership & Operational History", links: [
      { href: engineId ? `/history?engine=${engineId}` : "/history", fa: "تاریخچه مالکیت", en: "Ownership history" },
      { href: `${engine}/operations`, fa: "ساعت و سیکل", en: "Hours and cycles" },
    ]},
    { id: "configuration", fa: "پیکربندی موتور", en: "Engine Configuration", links: [
      { href: `${engine}/configuration`, fa: "پیکربندی فعلی", en: "Current configuration" },
    ]},
    { id: "genealogy", fa: "تبار قطعه", en: "Component Genealogy", links: [
      { href: `${engine}/configuration`, fa: "قطعات سریال‌دار", en: "Serialized parts" },
    ]},
    { id: "maintenance", fa: "مدیریت تعمیرات", en: "Maintenance Management", links: [
      { href: `${engine}/maintenance`, fa: "سوابق تعمیر", en: "Maintenance records" },
      { href: `${engine}/plan`, fa: "برنامه تعمیر", en: "Maintenance plan" },
      { href: "/m/workscope", fa: "ورک‌اسکوپ", en: "Workscope" },
      { href: "/m/kit", fa: "کیت قطعات", en: "Kitting" },
      { href: "/m/testcell", fa: "سلول تست", en: "Test cell" },
    ]},
    { id: "inspection", fa: "بازرسی و یافته‌ها", en: "Inspection & Findings", links: [
      { href: `${engine}/faults`, fa: "عیب‌یابی", en: "Findings" },
      { href: "/m/borescope", fa: "بوروسکوپ", en: "Borescope" },
      { href: "/m/exceedance", fa: "تجاوز از حد", en: "Exceedance" },
      { href: "/m/directive", fa: "AD/SB", en: "AD/SB" },
    ]},
    { id: "documents", fa: "اسناد فنی", en: "Technical Documents", links: [
      { href: "/documents", fa: "پرونده اسناد", en: "Document file" },
      { href: "/knowledge", fa: "دانش فنی", en: "Knowledge base" },
    ]},
    { id: "intelligence", fa: "خواندن سند", en: "Document Intelligence", links: [
      { href: "/documents", fa: "صف استخراج", en: "Extraction queue" },
    ]},
    { id: "health", fa: "تحلیل سلامت", en: "Engine Health Analytics", links: [
      { href: `${engine}/gas-path`, fa: "مسیر گاز", en: "Gas path" },
      { href: `${engine}/performance`, fa: "روند عملکرد", en: "Performance trend" },
      { href: "/m/oil", fa: "روغن", en: "Oil" },
      { href: "/m/vibration", fa: "ارتعاش", en: "Vibration" },
    ]},
    { id: "predictive", fa: "نگهداری پیش‌بینانه", en: "Predictive Maintenance", links: [
      { href: `${engine}/prognostics`, fa: "عمر باقیمانده", en: "Remaining life" },
      { href: "/m/alert", fa: "هشدارها", en: "Alerts" },
      { href: "/reports", fa: "گزارش‌ها", en: "Reports" },
    ]},
    { id: "admin", fa: "مدیریت و امنیت", en: "Administration & Security", links: [
      { href: "/admin/users", fa: "کاربران شرکت", en: "Company users" },
      { href: "/audit", fa: "ممیزی", en: "Audit" },
    ]},
  ];
}

export function SideNav({ locale, alertCount = 0, modules, engineId }: { locale: Locale; alertCount?: number; modules: string[]; engineId: string }) {
  const path = usePathname();
  const groups = menu(engineId).filter((group) => modules.includes(group.id));
  return (
    <nav className="side-links">
      {groups.map((group) => (
        <div key={group.en}>
          <p className="side-label">{locale === "fa" ? group.fa : group.en}</p>
          {group.links.map((link) => {
            const active = link.href === "/" ? path === "/" : path === link.href || path.startsWith(`${link.href}/`);
            return (
              <Link key={`${group.id}-${link.en}`} href={link.href} className={active ? "active" : ""}>
                {locale === "fa" ? link.fa : link.en}
                {link.href === "/m/alert" && alertCount > 0 ? <span className="nav-pill num">{alertCount}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const ENGINE_LINKS = [
  { href: "", fa: "شناسنامه", en: "Passport" },
  { href: "/configuration", fa: "پیکربندی", en: "Configuration" },
  { href: "/operations", fa: "کارکرد", en: "Operation" },
  { href: "/maintenance", fa: "تعمیرات", en: "Maintenance" },
  { href: "/gas-path", fa: "مسیر گاز", en: "Gas path" },
  { href: "/performance", fa: "روند عملکرد", en: "Trends" },
  { href: "/faults", fa: "عیب‌یابی", en: "Faults" },
  { href: "/prognostics", fa: "عمر باقیمانده", en: "RUL" },
  { href: "/plan", fa: "برنامه تعمیر", en: "Plan" },
];

export function EngineNav({ id, locale }: { id: string; locale: Locale }) {
  const path = usePathname();
  return (
    <nav className="subnav">
      {ENGINE_LINKS.map((link) => {
        const href = `/engines/${id}${link.href}`;
        const active = link.href === "" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            {locale === "fa" ? link.fa : link.en}
          </Link>
        );
      })}
    </nav>
  );
}

export function SessionBar({
  locale,
  theme,
  persona,
}: {
  locale: Locale;
  theme: "light" | "dark";
  persona: Persona;
}) {
  const path = usePathname() || "/";
  return (
    <div className="session">
      <span className="role-chip">{persona.username}</span>
      <form action={logout}>
        <button className="btn ghost" type="submit">{locale === "fa" ? "خروج" : "Sign out"}</button>
      </form>
      <form action={setTheme} className="lang" data-theme-toggle={theme}>
        <input type="hidden" name="back" value={path} />
        <button name="theme" value="light" className={theme === "light" ? "on" : ""} type="submit">
          {locale === "fa" ? "روشن" : "Light"}
        </button>
        <button name="theme" value="dark" className={theme === "dark" ? "on" : ""} type="submit">
          {locale === "fa" ? "تیره" : "Dark"}
        </button>
      </form>
      <form action={setLocale} className="lang">
        <input type="hidden" name="back" value={path} />
        <button name="locale" value="fa" className={locale === "fa" ? "on" : ""} type="submit">
          فا
        </button>
        <button name="locale" value="en" className={locale === "en" ? "on" : ""} type="submit">
          EN
        </button>
      </form>
    </div>
  );
}
