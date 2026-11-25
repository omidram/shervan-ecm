import Link from "next/link";
import { MonthLine, NamedBars } from "@/components/fleet-charts";
import { fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { latestByVersion } from "@/lib/life";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

const OPERATIONAL = new Set(["In Service", "Active"]);
const DAY = 86400000;

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number, from: Date) {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(monthKey(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1))));
  }
  return keys;
}

export default async function FleetUtilizationPage() {
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const now = new Date();
  const flights = rows.flatMap((row) => row.engine.utilization.filter((event) => event.kind === "flight"));
  const totalHours = flights.reduce((sum, event) => sum + event.flightHours, 0);
  const totalCycles = flights.reduce((sum, event) => sum + event.flightCycles, 0);
  const byMonth = new Map<string, { hours: number; cycles: number }>();
  for (const event of flights) {
    const key = monthKey(event.eventAt);
    const bucket = byMonth.get(key) ?? { hours: 0, cycles: 0 };
    bucket.hours += event.flightHours;
    bucket.cycles += event.flightCycles;
    byMonth.set(key, bucket);
  }
  const months = [...byMonth.values()];
  const avgMonthHours = months.length ? months.reduce((sum, item) => sum + item.hours, 0) / months.length : null;
  const avgMonthCycles = months.length ? months.reduce((sum, item) => sum + item.cycles, 0) / months.length : null;
  const avgEngine = rows.length ? totalHours / rows.length : null;
  const availability = rows.length ? (rows.filter((row) => OPERATIONAL.has(row.engine.status)).length / rows.length) * 100 : null;
  const outside = rows.filter((row) =>
    latestByVersion(row.engine.records).some((record) => record.type === "shop_visit" && !record.releasedAt),
  ).length;
  const outsideShare = rows.length ? (outside / rows.length) * 100 : null;
  const stopByEngine = rows.map((row) => {
    const days = latestByVersion(row.engine.records)
      .filter((record) => record.type === "shop_visit")
      .reduce((sum, record) => {
        const end = record.releasedAt ?? now;
        return sum + Math.max(0, Math.round((end.getTime() - record.performedAt.getTime()) / DAY));
      }, 0);
    return { serial: row.engine.serialNumber, days };
  });
  const stopTotal = stopByEngine.reduce((sum, item) => sum + item.days, 0);
  const stopped = stopByEngine.filter((item) => item.days > 0);
  const stopAverage = stopped.length ? stopTotal / stopped.length : null;
  const ownedHours = rows
    .filter((row) => row.engine.ownerOrgId === persona.orgId)
    .flatMap((row) => row.engine.utilization.filter((event) => event.kind === "flight"))
    .reduce((sum, event) => sum + event.flightHours, 0);
  const leasedHours = rows
    .filter((row) => row.engine.operatorOrgId === persona.orgId && row.engine.ownerOrgId !== persona.orgId)
    .flatMap((row) => row.engine.utilization.filter((event) => event.kind === "flight"))
    .reduce((sum, event) => sum + event.flightHours, 0);
  const trend = lastMonths(12, now).map((key) => ({ t: key, hours: byMonth.get(key)?.hours ?? 0, cycles: byMonth.get(key)?.cycles ?? 0 }));
  const num = (value: number | null, digits = 0) => (value == null ? "" : fmtNum(value, digits));
  const boxes: { key: string; fa: string; en: string; value: string }[] = [
    { key: "hours", fa: "جمع ساعات پروازی ناوگان", en: "Total fleet flight hours", value: flights.length ? num(totalHours) : "" },
    { key: "cycles", fa: "جمع سیکل کلی ناوگان", en: "Total fleet cycles", value: flights.length ? num(totalCycles) : "" },
    { key: "month-hours", fa: "میانگین ساعات پروازی ماهانه", en: "Average monthly flight hours", value: num(avgMonthHours) },
    { key: "month-cycles", fa: "میانگین سیکل ماهانه", en: "Average monthly cycles", value: num(avgMonthCycles) },
    { key: "per-engine", fa: "متوسط بهره‌برداری هر موتور", en: "Average utilization per engine", value: num(avgEngine) },
    { key: "availability", fa: "درصد دسترس‌پذیری ناوگان", en: "Fleet availability", value: availability == null ? "" : `${num(availability)}%` },
    { key: "capacity", fa: "نرخ بهره‌برداری از ظرفیت ناوگان", en: "Fleet capacity utilization", value: "" },
    { key: "outside", fa: "نسبت موتورهای برون استعلام", en: "Share of engines at an outside shop", value: outsideShare == null ? "" : `${num(outsideShare)}%` },
    { key: "stop", fa: "زمان توقف ناشی از تغییرات", en: "Stop time from shop changes", value: stopped.length ? num(stopTotal) : "" },
  ];

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "میزان بهره‌برداری ناوگان", "Fleet Utilization")}</h1>
          <p className="lede">
            {L(
              locale,
              "شمارها از ساعت و سیکل پروازهای ذخیره‌شدهٔ همین شرکت است. ظرفیتی برای ناوگان ذخیره نشده، پس نرخ ظرفیت خالی می‌ماند. زمان توقف، مدت shop visit ذخیره‌شده است.",
              "The figures use this company's stored flight hours and cycles. No fleet capacity is stored, so the capacity rate stays blank. Stop time is the length of a stored shop visit.",
            )}
          </p>
        </div>
        <details className="serial-menu" data-serial-menu="utilization">
          <summary>{L(locale, "شماره سریال موتور", "Engine serial number")}</summary>
          <div>
            {rows.map((row) => (
              <Link key={row.engine.id} href={`/engines/${row.engine.id}/operations`}>{row.engine.serialNumber}</Link>
            ))}
          </div>
        </details>
      </header>
      <section className="fleet-boxes" data-util-count={boxes.length}>
        {boxes.map((box) => (
          <article key={box.key} className="panel stat fleet-box" data-util={box.key}>
            <span>{box.fa}</span>
            <span className="en">{box.en}</span>
            <b className="num">{box.value}</b>
          </article>
        ))}
      </section>
      <section className="grid-2">
        <article className="panel">
          <h2>{L(locale, "روند ساعات پروازی ناوگان در ۱۲ ماه گذشته", "Fleet flight hours over the last 12 months")}</h2>
          <MonthLine points={trend.map((item) => ({ t: item.t, value: item.hours }))} name={L(locale, "ساعت", "Hours")} color="#3d7dff" />
        </article>
        <article className="panel">
          <h2>{L(locale, "روند سیکل‌های عملیاتی", "Operational cycles")}</h2>
          <MonthLine points={trend.map((item) => ({ t: item.t, value: item.cycles }))} name={L(locale, "سیکل", "Cycles")} color="#e3a63a" />
        </article>
        <article className="panel">
          <h2>{L(locale, "مقایسه بهره‌برداری موتورهای ملکی و اجاره‌ای", "Owned and leased utilization")}</h2>
          <NamedBars
            name={L(locale, "ساعت پرواز", "Flight hours")}
            points={[
              { name: L(locale, "ملکی", "Owned"), value: Math.round(ownedHours) },
              { name: L(locale, "اجاره‌ای", "Leased"), value: Math.round(leasedHours) },
            ]}
          />
        </article>
        <article className="panel">
          <h2>{L(locale, "میانگین زمان توقف موتورها در تغییرات", "Average stop time during changes")}</h2>
          <p className="num">{stopAverage == null ? "" : fmtNum(stopAverage, 0)}</p>
          <NamedBars name={L(locale, "روز", "Days")} points={stopByEngine.map((item) => ({ name: item.serial, value: item.days }))} />
        </article>
      </section>
    </div>
  );
}
