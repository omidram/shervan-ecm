import { notFound } from "next/navigation";
import { clearFault } from "@/app/actions";
import { Flash, PlanningBanner } from "@/components/ui";
import { can } from "@/lib/access";
import { fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function FaultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const found = await getEngine(id, persona);
  if (!found) notFound();
  const reported = found.assessment.faults.filter((fault) => fault.reported);
  const quiet = found.assessment.faults.filter((fault) => !fault.reported);
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <header className="page-head">
        <div>
          <p className="kicker">{found.engine.serialNumber}</p>
          <h1>{L(locale, "تشخیص و جداسازی عیب", "Fault detection and isolation")}</h1>
          <p className="lede">{L(locale, "ترکیب قاعده، انحراف آماری از پایه همین موتور، و سابقه تعمیر. شبکه عصبی در کار نیست.", "Rules, a statistical deviation from this engine's own baseline, and the maintenance history. No neural network is involved.")}</p>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      {reported.length === 0 ? <p className="panel">{L(locale, "عیب بازی بالای آستانه گزارش نیست.", "No open fault is above the reporting threshold.")}</p> : null}
      {reported.map((fault) => (
        <article key={fault.modeCode} className="panel">
          <div className="page-head">
            <h2>{locale === "fa" ? fault.titleFa : fault.titleEn}</h2>
            <b className="num">{fmtNum(fault.probability * 100, 0)}%</b>
          </div>
          <p className="note">{fault.moduleCode} · {fault.method}</p>
          <h3>{L(locale, "شواهد", "Evidence")}</h3>
          <ul>{(locale === "fa" ? fault.evidenceFa : fault.evidenceEn).map((line) => <li key={line}>{line}</li>)}</ul>
          <div className="grid-2">
            <div>
              <h3>{L(locale, "چه چیزی آن را تأیید می‌کند", "What would confirm it")}</h3>
              <p>{locale === "fa" ? fault.confirmFa : fault.confirmEn}</p>
            </div>
            <div>
              <h3>{L(locale, "چه چیزی آن را می‌بندد", "What would clear it")}</h3>
              <p>{locale === "fa" ? fault.clearFa : fault.clearEn}</p>
            </div>
          </div>
          {can(persona, found.engine, "disposition") ? (
            <form action={clearFault} className="form-grid">
              <input type="hidden" name="engineId" value={found.engine.id} />
              <input type="hidden" name="modeCode" value={fault.modeCode} />
              <label className="wide">{L(locale, "مشاهده‌ای که عیب را می‌بندد", "Observation that clears the fault")}<input name="note" required /></label>
              <button className="btn ghost" type="submit">{L(locale, "بستن عیب", "Clear fault")}</button>
            </form>
          ) : null}
        </article>
      ))}
      <section className="panel">
        <h2>{L(locale, "زیر آستانه گزارش", "Below the reporting threshold")}</h2>
        {quiet.map((fault) => (
          <p key={fault.modeCode}>
            {locale === "fa" ? fault.titleFa : fault.titleEn} · <span className="num">{fmtNum(fault.probability * 100, 0)}%</span>
            {fault.cleared ? ` · ${L(locale, "بسته‌شده", "cleared")}` : ""}
          </p>
        ))}
      </section>
    </div>
  );
}
