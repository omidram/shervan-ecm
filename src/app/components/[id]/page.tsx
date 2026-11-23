import Link from "next/link";
import { notFound } from "next/navigation";
import { Num } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getComponent } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const data = await getComponent(id, persona);
  if (!data) notFound();
  const { component, intervals, totalCycles, totalHours, hidden } = data;
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{component.moduleCode}{component.isLlp ? " · LLP" : ""}</p>
          <h1 className="num">{component.serialNumber}</h1>
          <p className="lede">{locale === "fa" ? component.nameFa : component.name} · <Num>{component.partNumber}</Num></p>
        </div>
      </header>
      <section className="panel">
        <div className="gauges">
          <div className="gauge"><span>{L(locale, "سیکل روی بازه‌های قابل‌دیدن", "Cycles on visible intervals")}</span><b className="num">{fmtNum(totalCycles, 0)}</b></div>
          <div className="gauge"><span>{L(locale, "ساعت", "Hours")}</span><b className="num">{fmtNum(totalHours, 0)}</b></div>
          {component.lifeLimitCycles ? <div className="gauge"><span>{L(locale, "حد مطالعاتی", "Study limit")}</span><b className="num">{fmtNum(component.lifeLimitCycles, 0)}</b></div> : null}
        </div>
        <p className="note">{L(locale, "سیکل قطعه جمع کارکرد موتورها در بازه نصب است و با CSN یک موتور یکی نیست.", "Part cycles are the sum of engine operation during each installation. They are not one engine's CSN.")}</p>
        {hidden ? <p className="note">{L(locale, "یک یا چند بازه خارج از این نشست پنهان است.", "One or more intervals are hidden from this session.")} <Num>{hidden}</Num></p> : null}
      </section>
      <section className="panel">
        {intervals.map((interval) => (
          <div key={interval.row.id} className="tl">
            <span className="num">{fmtDate(interval.row.installedAt)}</span>
            <div>
              {interval.allowed ? (
                <Link href={`/engines/${interval.row.engine.id}`}><b className="num">{interval.row.engine.serialNumber}</b></Link>
              ) : (
                <b>{L(locale, "موتور خارج از نشست", "Engine outside this session")}</b>
              )}
              <div>{interval.row.position} · {fmtDate(interval.row.installedAt)} → {interval.row.removedAt ? fmtDate(interval.row.removedAt) : L(locale, "باز", "open")}</div>
              {interval.allowed ? <div className="note">{Math.round(interval.gained.cycles)} cyc · {Math.round(interval.gained.hours)} h · {locale === "fa" ? interval.row.reasonFa : interval.row.reasonEn}</div> : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
