import "@fontsource/vazirmatn/arabic-400.css";
import "@fontsource/vazirmatn/arabic-600.css";
import "@fontsource/vazirmatn/arabic-700.css";
import "@fontsource/vazirmatn/latin-400.css";
import "@fontsource/vazirmatn/latin-600.css";
import "@fontsource/vazirmatn/latin-700.css";
import "./globals.css";
import { headers } from "next/headers";
import { SideNav, SessionBar } from "@/components/nav";
import { canOpen, moduleForPath } from "@/lib/accounts";
import { ensureDatabase } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { L } from "@/lib/i18n";
import { engineWhere } from "@/lib/queries";
import { getLocale, getOptionalPersona, getTheme } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SHERVAN ECM",
  description: "Engine condition monitoring and digital passport for CFM56 engines.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureDatabase();
  const locale = await getLocale();
  const theme = await getTheme();
  const path = (await headers()).get("x-pathname") || "/";
  const persona = path === "/login" ? null : await getOptionalPersona();
  if (!persona) {
    return (
      <html lang={locale === "fa" ? "fa" : "en"} dir={locale === "fa" ? "rtl" : "ltr"} data-theme={theme}>
        <body>{children}</body>
      </html>
    );
  }
  const visible = await prisma.engine.findMany({ where: engineWhere(persona), select: { id: true, hero: true } });
  const focus = visible.find((engine) => engine.hero)?.id ?? visible[0]?.id ?? "";
  const alertCount = focus
    ? await prisma.boardItem.count({
        where: { domain: "alert", ackedAt: null, engineId: { in: visible.map((engine) => engine.id) } },
      })
    : 0;
  const needed = moduleForPath(path);
  const blocked = !canOpen(persona.modules, needed);
  return (
    <html lang={locale === "fa" ? "fa" : "en"} dir={locale === "fa" ? "rtl" : "ltr"} data-theme={theme}>
      <body>
        <div className="app">
          <aside>
            <div className="brand">
              <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
                <circle cx="18" cy="18" r="16" fill="#071833" stroke="#7eb6ff" />
                <path d="M18 6l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" fill="#d6e6ff" />
              </svg>
              <div>
                <strong>SHERVAN</strong>
                <span>ECM</span>
                <small>{L(locale, "پایش وضعیت موتور", "Engine condition monitoring")}</small>
              </div>
            </div>
            <SideNav locale={locale} alertCount={alertCount} modules={persona.modules} engineId={focus} />
            <p className="aside-foot">
              {L(
                locale,
                "نمودارها اصلی‌اند. پیش‌بینی، تصمیم صلاحیت پروازی نیست.",
                "Diagrams are original. A prediction is not an airworthiness decision.",
              )}
            </p>
          </aside>
          <div className="main-col">
            <header className="topbar">
              <div className="role-chip">
                {locale === "fa" ? persona.orgFa : persona.orgEn} · {persona.job}
              </div>
              <SessionBar locale={locale} theme={theme} persona={persona} />
            </header>
            <main>
              {blocked ? (
                <section className="panel">
                  <h1>{L(locale, "این بخش برای شغل شما باز نیست", "This section is closed for your job")}</h1>
                  <p className="lede">{L(locale, "مدیر شرکت می‌تواند سطح دسترسی را از مدیریت کاربران عوض کند.", "A company administrator can change this from company users.")}</p>
                </section>
              ) : children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
