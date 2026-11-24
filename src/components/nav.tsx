"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout, setLocale, setTheme } from "@/app/actions";
import type { Locale } from "@/lib/i18n";
import { MENU, menuHref } from "@/lib/nav-menu";
import type { Persona } from "@/lib/session";

export function SideNav({ locale, alertCount = 0, modules, engineId }: { locale: Locale; alertCount?: number; modules: string[]; engineId: string }) {
  const path = usePathname() || "/";
  const groups = MENU.filter((group) => modules.includes(group.module));
  const current = groups.find((group) => group.items.some((item) => {
    const href = menuHref(item, group, engineId);
    return href !== "/" && (path === href || path.startsWith(`${href}/`));
  }));
  const [open, setOpen] = useState<string | null>(current?.id ?? null);
  const shown = open ?? current?.id ?? null;
  return (
    <nav className="side-links" data-menu={groups.length} data-lang={locale}>
      {groups.map((group) => {
        const expanded = shown === group.id;
        return (
          <div key={group.id} className={expanded ? "nav-group open" : "nav-group"}>
            <button type="button" className="nav-head" aria-expanded={expanded} data-menu-item={group.en} onClick={() => setOpen(expanded ? null : group.id)}>
              <span>
                <b>{group.fa}</b>
                <small>{group.en}</small>
              </span>
              <i className="nav-arrow" aria-hidden>{expanded ? "▾" : "▸"}</i>
            </button>
            {expanded ? (
              <div className="nav-sub">
                {group.items.map((item) => {
                  const href = menuHref(item, group, engineId);
                  const depth = href.split("/").filter(Boolean).length;
                  const active = path === href || (depth >= 3 && path.startsWith(`${href}/`));
                  return (
                    <Link key={item.slug} href={href} className={active ? "active" : ""} data-sub={item.en}>
                      <span>
                        <b>{item.fa}</b>
                        <small>{item.en}</small>
                      </span>
                      {item.to === "/m/alert" && alertCount > 0 ? <span className="nav-pill num">{alertCount}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
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
