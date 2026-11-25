"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, setLocale, setTheme } from "@/app/actions";
import type { Locale } from "@/lib/i18n";
import type { Persona } from "@/lib/session";

export function EngineSelect({
  locale,
  engines,
}: {
  locale: Locale;
  engines: { id: string; serialNumber: string }[];
}) {
  const path = usePathname() || "/";
  const router = useRouter();
  const current = path.match(/^\/engines\/([^/]+)/)?.[1] ?? "";
  return (
    <label className="engine-select">
      <span>{locale === "fa" ? "موتور" : "Engine"}</span>
      <select
        data-engine-select
        value={engines.some((engine) => engine.id === current) ? current : ""}
        onChange={(event) => {
          const id = event.target.value;
          if (!id) return;
          const section = path.match(/^\/engines\/[^/]+(\/.*)?$/)?.[1] ?? "";
          router.push(`/engines/${id}${section}`);
        }}
      >
        <option value="">{locale === "fa" ? "انتخاب موتور" : "Choose an engine"}</option>
        {engines.map((engine) => (
          <option key={engine.id} value={engine.id}>{engine.serialNumber}</option>
        ))}
      </select>
    </label>
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
