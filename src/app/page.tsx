import { L } from "@/lib/i18n";
import { getLocale, getPersona } from "@/lib/session";
import pkg from "../../package.json";

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 3);
  const letters = parts.map((part) => part[0]).join("");
  return letters || "•";
}

export default async function WelcomePage() {
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const company = locale === "fa" ? persona.orgFa : persona.orgEn;
  return (
    <section className="welcome">
      <p className="kicker">SHERVAN ECM</p>
      <h1>{L(locale, "خوش آمدید", "Welcome")}</h1>
      <p className="lede">
        {L(
          locale,
          "از منوی سمت راست یک بخش را باز کنید. این صفحه عدد موتور، ناوگان، یا شاخص سلامت نشان نمی‌دهد.",
          "Open a section from the menu on the right. This page does not show an engine figure, a fleet total, or a health gauge.",
        )}
      </p>
      <div className="welcome-marks">
        <article className="mark-card">
          <div className="company-mark" aria-hidden>{initials(company)}</div>
          <p className="kicker">{L(locale, "نشان شرکت", "Company mark")}</p>
          <h2>{company}</h2>
        </article>
        <article className="mark-card">
          <svg className="product-mark" viewBox="0 0 88 88" aria-hidden>
            <circle cx="44" cy="44" r="40" fill="#071833" stroke="#7eb6ff" strokeWidth="2" />
            <circle cx="44" cy="44" r="24" fill="none" stroke="#e3a63a" strokeWidth="2" />
            <path d="M44 10v14M44 64v14M10 44h14M64 44h14" stroke="#d6e6ff" strokeWidth="2" />
            <circle cx="44" cy="44" r="5" fill="#f0c27a" />
          </svg>
          <p className="kicker">{L(locale, "نشان محصول", "Product mark")}</p>
          <h2>SHERVAN ECM</h2>
          <p>{L(locale, "پایش وضعیت موتور", "Engine condition monitoring")}</p>
          <p className="num">v{pkg.version}</p>
        </article>
      </div>
    </section>
  );
}
