import Link from "next/link";
import { notFound } from "next/navigation";
import { ackAlert } from "@/app/actions";
import { EnginePick } from "@/components/engine-pick";
import { RangeBars } from "@/components/instruments";
import { OrderBars, TrendChart } from "@/components/trend-chart";
import { Flash, PlanningBanner } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { deskModule, type DeskDomain } from "@/lib/modules";
import { listBoard, listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export async function DeskModule({
  domain,
  searchParams,
}: {
  domain: DeskDomain;
  searchParams: Promise<{ engine?: string; item?: string; ok?: string; err?: string }>;
}) {
  const meta = deskModule(domain);
  if (!meta) notFound();
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const engines = await listEngines(persona);
  const picked = engines.find((row) => row.engine.id === sp.engine) ?? engines.find((row) => row.engine.hero) ?? engines[0];
  if (!picked) return <p>{L(locale, "موتوری در این نشست نیست.", "No engine in this session.")}</p>;
  const board = await listBoard(persona, picked.engine.id);
  const items = board.items.filter((item) => item.domain === domain);
  const focus = items.find((item) => item.id === sp.item) ?? items.find((item) => item.status !== "acked" && item.status !== "closed") ?? items[0];
  const back = `${meta.href}?engine=${picked.engine.id}${focus ? `&item=${focus.id}` : ""}`;
  const fe = items.filter((item) => item.code === "debris-fe" && item.recordedAt && item.value != null);
  const bins = items.filter((item) => item.code === "bin");

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{picked.engine.serialNumber} · {picked.engine.model.code}</p>
          <h1>{locale === "fa" ? meta.fa : meta.en}</h1>
          <p className="lede">
            {L(locale, "از میز فرمان آمده‌اید. عددها برای همین موتور است و روش تشخیص قاعده و انحراف آماری است.", "Opened from the command desk. Figures are for this engine. Detection stays a rule plus a statistical deviation.")}
          </p>
        </div>
        <EnginePick
          label={L(locale, "موتور", "Engine")}
          value={picked.engine.id}
          engines={engines.map((row) => ({ id: row.engine.id, serialNumber: row.engine.serialNumber, model: row.engine.model.code }))}
        />
      </header>
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <PlanningBanner locale={locale} />
      <div className="grid-2">
        <section className="panel">
          <h2>{L(locale, "موارد", "Items")}</h2>
          {items.length === 0 ? <p className="muted">{L(locale, "برای این موتور موردی ثبت نشده.", "Nothing is stored for this engine.")}</p> : null}
          {items.map((item) => (
            <Link key={item.id} className={item.id === focus?.id ? "pair on-row" : "pair"} href={`${meta.href}?engine=${picked.engine.id}&item=${item.id}`}>
              <span>{locale === "fa" ? item.titleFa : item.titleEn}</span>
              <b className="num">{item.value == null ? item.status : `${fmtNum(item.value, item.value < 10 ? 2 : 0)}${item.unit ? ` ${item.unit}` : ""}`}</b>
            </Link>
          ))}
        </section>
        <section className="panel">
          {focus ? (
            <>
              <p className="kicker">{focus.code}</p>
              <h2>{locale === "fa" ? focus.titleFa : focus.titleEn}</h2>
              <div className="pair"><span>{L(locale, "وضعیت", "Status")}</span><b>{focus.status}</b></div>
              <div className="pair"><span>{L(locale, "ماژول", "Module")}</span><b>{focus.moduleCode || "—"}</b></div>
              {focus.partNumber ? <div className="pair"><span>P/N</span><b className="num">{focus.partNumber}</b></div> : null}
              {focus.value != null ? <div className="pair"><span>{L(locale, "مقدار", "Value")}</span><b className="num">{fmtNum(focus.value, focus.value < 10 ? 2 : 1)} {focus.unit}</b></div> : null}
              {focus.limitValue != null ? <div className="pair"><span>{L(locale, "باند مطالعاتی", "Study band")}</span><b className="num">{fmtNum(focus.limitValue, focus.limitValue < 10 ? 2 : 0)} {focus.unit}</b></div> : null}
              {focus.spanMin != null ? <div className="pair"><span>{L(locale, "مدت", "Duration")}</span><b className="num">{fmtNum(focus.spanMin, 0)} min</b></div> : null}
              {focus.qtyNeed != null ? <div className="pair"><span>{L(locale, "نیاز / موجودی", "Need / stock")}</span><b className="num">{focus.qtyStock ?? 0} / {focus.qtyNeed}</b></div> : null}
              {focus.leadDays != null ? <div className="pair"><span>{L(locale, "زمان تأمین", "Lead time")}</span><b className="num">{focus.leadDays} d</b></div> : null}
              <div className="pair"><span>{L(locale, "تاریخ", "Date")}</span><b className="num">{fmtDate(focus.recordedAt)}</b></div>
              <p>{locale === "fa" ? focus.detailFa : focus.detailEn}</p>
              {focus.evidence ? <p><Link href={focus.evidence}>{L(locale, "شاهد", "Evidence")}</Link></p> : null}
              {domain === "alert" && !focus.ackedAt && persona.role !== "auditor" ? (
                <form action={ackAlert}>
                  <input type="hidden" name="id" value={focus.id} />
                  <input type="hidden" name="back" value={back} />
                  <button className="btn" type="submit">{L(locale, "دیده شد", "Acknowledge")}</button>
                </form>
              ) : null}
              {focus.ackedAt ? <p className="note">{L(locale, "دیده شده", "Acknowledged")} <span className="num">{fmtDate(focus.ackedAt)}</span></p> : null}
            </>
          ) : (
            <p className="muted">—</p>
          )}
        </section>
      </div>
      {domain === "oil" && fe.length > 1 ? (
        <section className="panel">
          <h2>{L(locale, "روند آهن", "Iron trend")}</h2>
          <TrendChart points={fe.slice().reverse().map((item) => ({ t: item.recordedAt!, measured: item.value!, reference: item.limitValue ?? 6 }))} unit="ppm" />
        </section>
      ) : null}
      {domain === "vibration" && bins.length > 0 ? (
        <section className="panel">
          <h2>{L(locale, "خطوط مرتبه", "Order lines")}</h2>
          <p className="note">{L(locale, "این میله‌ها از برداشت ذخیره‌شده‌اند. تبدیلی روی این صفحه حساب نمی‌شود.", "These bars are the stored survey. Nothing is transformed on this page.")}</p>
          <OrderBars points={bins.map((item) => ({ name: item.titleEn, amp: item.value ?? 0 }))} />
        </section>
      ) : null}
      {domain === "borescope" ? (
        <section className="panel">
          <h2>{L(locale, "جای تصویر", "Photo placeholder")}</h2>
          <div className="photo-ph">{L(locale, "تصویر بوروسکوپ در این نسخه نیست. یافته و تعداد پره از سابقه تعمیرگاه است.", "No borescope image is stored in this build. The finding and the blade count come from the shop record.")}</div>
        </section>
      ) : null}
      {domain === "llp" ? (
        <section className="panel">
          <h2>{L(locale, "مانده سیکل", "Cycles remaining")}</h2>
          <p className="note">{L(locale, "پیش‌بینی پیاده یک بازه برنامه‌ریزی است، نه ساعت خرابی.", "A removal forecast is a planning range, not a failure hour.")}</p>
          {picked.assessment.llp.map((llp) => (
            <div className="pair" key={llp.componentId}>
              <Link href={`/components/${llp.componentId}`}><span className="num">{llp.serialNumber}</span> {llp.partNumber}</Link>
              <span className="num">{fmtNum(llp.remaining, 0)} / {fmtNum(llp.lifeLimitCycles, 0)}</span>
            </div>
          ))}
          <RangeBars rows={picked.assessment.llp.map((llp) => ({ name: llp.serialNumber, used: llp.cyclesUsed, limit: llp.lifeLimitCycles }))} />
          {picked.engine.plans[0] ? (
            <p>
              {L(locale, "پنجره القا", "Induction window")}{" "}
              <Link href={`/engines/${picked.engine.id}/plan`}><span className="num">{fmtDate(picked.engine.plans[0].inductionAt)}</span></Link>
            </p>
          ) : null}
        </section>
      ) : null}
      {domain === "testcell" && focus?.code === "accept-2025" ? (
        <section className="grid-4">
          {[
            [L(locale, "نتیجه", "Result"), "pass"],
            ["EGT Margin", "62 °C"],
            [L(locale, "تراست", "Thrust"), "92%"],
            [L(locale, "ارتعاش فن / هسته", "Fan / core"), "0.30 / 0.35"],
          ].map(([label, value]) => (
            <article key={label} className="panel stat good"><span>{label}</span><b className="num">{value}</b></article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
