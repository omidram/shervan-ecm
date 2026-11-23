import Link from "next/link";
import { notFound } from "next/navigation";
import { RangeBars, RingGauge } from "@/components/instruments";
import { PlanningBanner, Num } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function PrognosticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const found = await getEngine(id, persona);
  if (!found) notFound();
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{found.engine.serialNumber}</p>
          <h1>{L(locale, "عمر باقیمانده", "Remaining useful life")}</h1>
          <p className="lede">{L(locale, "بازه است، نه ساعت قطعی خرابی. اطمینان و عامل‌ها کنار بازه می‌آیند.", "A range, not a certain failure hour. Confidence and the drivers sit beside it.")}</p>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      {found.assessment.rul.length === 0 ? (
        <p className="panel">{L(locale, "روند نامطلوب کافی برای تنگ کردن بازه نیست، یا موتور در خدمت نیست.", "There is not enough adverse trend to narrow a range, or the engine is not in service.")}</p>
      ) : null}
      {found.assessment.rul.map((rul) => (
        <article key={rul.moduleCode} className="panel rul-card">
          <RingGauge value={Math.round(rul.confidence * 100)} label={rul.moduleCode} caption={L(locale, "اطمینان", "Confidence")} />
          <div>
          <div className="page-head">
            <h2>{locale === "fa" ? rul.titleFa : rul.titleEn}</h2>
            <span className="badge watch">{L(locale, "اطمینان", "Confidence")} <Num>{fmtNum(rul.confidence * 100, 0)}%</Num></span>
          </div>
          <div className="gauges">
            <div className="gauge"><span>{L(locale, "ساعت، کران پایین", "Hours, low")}</span><b className="num">{fmtNum(rul.hoursLow, 0)}</b></div>
            <div className="gauge"><span>{L(locale, "ساعت، کران بالا", "Hours, high")}</span><b className="num">{fmtNum(rul.hoursHigh, 0)}</b></div>
            <div className="gauge"><span>{L(locale, "سیکل، کران پایین", "Cycles, low")}</span><b className="num">{fmtNum(rul.cyclesLow, 0)}</b></div>
            <div className="gauge"><span>{L(locale, "سیکل، کران بالا", "Cycles, high")}</span><b className="num">{fmtNum(rul.cyclesHigh, 0)}</b></div>
          </div>
          {rul.crossed ? <p>{L(locale, "آستانه مطالعاتی رد شده و پنجره برنامه‌ریزی باز است. این زمان خرابی نیست.", "The study threshold is already crossed and the planning window is open. This is not a failure time.")}</p> : null}
          <h3>{L(locale, "عامل‌ها", "Drivers")}</h3>
          <ul>{(locale === "fa" ? rul.driversFa : rul.driversEn).map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
        </article>
      ))}
      <section className="panel">
        <h2>{L(locale, "مصرف حد سیکل قطعه", "Cycle-life consumption")}</h2>
        <p className="note">{L(locale, "این مصرف حد عمر ذخیره‌شده قطعه است، نه پیش‌بینی ساعت خرابی.", "This is consumption of the part's stored cycle limit, not a predicted failure hour.")}</p>
        {found.assessment.llp.map((llp) => (
          <div key={llp.componentId} className="pair">
            <Link href={`/components/${llp.componentId}`}><span className="num">{llp.serialNumber}</span> {llp.moduleCode}</Link>
            <span className="num">{fmtNum(llp.remaining, 0)} / {fmtNum(llp.lifeLimitCycles, 0)}</span>
          </div>
        ))}
        <RangeBars
          rows={found.assessment.llp.map((llp) => ({
            name: llp.serialNumber,
            used: llp.cyclesUsed,
            limit: llp.lifeLimitCycles,
          }))}
        />
      </section>
    </div>
  );
}
