import Link from "next/link";
import { fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

const OPERATIONAL = new Set(["In Service", "Active"]);

export default async function FleetOverviewPage() {
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const total = rows.length;
  const owned = rows.filter((row) => row.engine.ownerOrgId === persona.orgId).length;
  const leased = rows.filter((row) => row.engine.operatorOrgId === persona.orgId && row.engine.ownerOrgId !== persona.orgId).length;
  const operational = rows.filter((row) => OPERATIONAL.has(row.engine.status)).length;
  const maintenance = rows.filter((row) => row.engine.status === "Under Maintenance").length;
  const standby = rows.filter((row) => row.engine.status === "Standby").length;
  const storage = rows.filter((row) => row.engine.status === "In Storage").length;
  const scored = rows.filter((row) => row.assessment.engineHealth != null && !row.assessment.insufficient);
  const health = scored.length
    ? Math.round(scored.reduce((sum, row) => sum + (row.assessment.engineHealth ?? 0), 0) / scored.length)
    : 0;
  const now = Date.now();
  const near = now + 90 * 86400000;
  const upcoming = rows.filter((row) =>
    row.engine.plans.some((plan) => plan.windowEnd.getTime() >= now && plan.windowStart.getTime() <= near),
  ).length;
  const shorts = total
    ? await prisma.boardItem.findMany({
        where: { engineId: { in: rows.map((row) => row.engine.id) }, domain: "kit", status: "short" },
        select: { engineId: true },
      })
    : [];
  const awaiting = new Set(shorts.map((item) => item.engineId)).size;
  const boxes: { key: string; fa: string; en: string; value: number }[] = [
    { key: "total", fa: "تعداد کل موتورهای تحت مدیریت شرکت", en: "Total fleet size", value: total },
    { key: "owned", fa: "تعداد موتورهای متعلق به شرکت", en: "Company-owned Engines", value: owned },
    { key: "leased", fa: "تعداد موتورهای اجاره‌شده", en: "Leased Engines", value: leased },
    { key: "subleased", fa: "تعداد موتورهای اجاره‌داده‌شده به دیگران", en: "Subleased Engines", value: 0 },
    { key: "operational", fa: "تعداد موتورهای در حال بهره‌برداری", en: "Operational Engines", value: operational },
    { key: "non-operational", fa: "تعداد موتورهای خارج از بهره‌برداری", en: "Non-operational Engines", value: total - operational },
    { key: "maintenance", fa: "تعداد موتورهای در حال تعمیر", en: "Engines under maintenance", value: maintenance },
    { key: "aog", fa: "تعداد موتورهای زمین‌گیر", en: "AOG Engines", value: 0 },
    { key: "sold", fa: "تعداد موتورهای فروخته‌شده", en: "Sold Engines", value: 0 },
    { key: "retired", fa: "تعداد موتورهای خارج‌شدهٔ دائمی از ناوگان", en: "Retired Engines", value: 0 },
    { key: "standby", fa: "تعداد موتورهای آماده‌به‌کار", en: "Standby Engines", value: standby },
    { key: "storage", fa: "تعداد موتورهای انبارشده", en: "Engines in storage", value: storage },
    { key: "health", fa: "میانگین شاخص سلامت موتورهای دارای ارزیابی معتبر", en: "Average fleet health", value: health },
    { key: "upcoming", fa: "تعداد موتورهایی که موعد بازرسی یا تعمیرشان نزدیک است", en: "Upcoming maintenance", value: upcoming },
    { key: "parts", fa: "تعداد موتورهای منتظر قطعه", en: "Engines awaiting parts", value: awaiting },
  ];

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "وضعیت کلی ناوگان", "Fleet Overview")}</h1>
          <p className="lede">
            {L(
              locale,
              "شمارها فقط از موتورهای همین شرکت است. وضعیتی که در داده نیست، صفر است.",
              "Each number uses only this company's engines. A status the data does not have is zero.",
            )}
          </p>
        </div>
        <Link className="btn" href="/fleet/register">{L(locale, "فهرست موتورهای ناوگان", "Fleet Register")}</Link>
      </header>
      <section className="fleet-boxes" data-fleet-count={boxes.length}>
        {boxes.map((box) => (
          <article key={box.key} className="panel stat fleet-box" data-box={box.key}>
            <span>{box.fa}</span>
            <span className="en">{box.en}</span>
            <b className="num">{box.key === "health" ? fmtNum(box.value, 0) : box.value}</b>
          </article>
        ))}
      </section>
    </div>
  );
}
