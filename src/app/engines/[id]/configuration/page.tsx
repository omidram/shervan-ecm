import Link from "next/link";
import { notFound } from "next/navigation";
import { installComponent, removeComponent } from "@/app/actions";
import { PlateBoard } from "@/components/plate-board";
import { Flash, Num, PlanningBanner } from "@/components/ui";
import { can } from "@/lib/access";
import { endOfDay, fmtDate, utcToday } from "@/lib/format";
import { L } from "@/lib/i18n";
import { cyclesInWindow } from "@/lib/life";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function ConfigurationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asOf?: string; ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const asOfText = sp.asOf || utcToday();
  const asOf = endOfDay(asOfText);
  const found = await getEngine(id, persona, asOf);
  if (!found) notFound();
  const { engine } = found;
  const fitted = engine.compInstalls.filter((row) => row.installedAt <= asOf && (!row.removedAt || row.removedAt > asOf));
  const removed = engine.compInstalls.filter((row) => row.removedAt && row.removedAt <= asOf);
  const byModule = new Map<string, typeof fitted>();
  for (const mod of engine.model.modules) byModule.set(mod.code, []);
  for (const row of fitted) {
    const list = byModule.get(row.moduleCode) ?? [];
    list.push(row);
    byModule.set(row.moduleCode, list);
  }
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <PlanningBanner locale={locale} />
      <PlateBoard locale={locale} topics={["modules", "core", "lpt", "agb"]} />
      <header className="page-head">
        <div>
          <p className="kicker"><Num>{engine.serialNumber}</Num></p>
          <h1>{L(locale, "پیکربندی و تبار", "Configuration and genealogy")}</h1>
          <p className="lede">
            {L(locale, "قطعه پیاده از این موتور و نصب‌شده روی موتور دیگر، هر دو بازه را نگه می‌دارد. تاریخ را عوض کنید تا پیکربندی گذشته ساخته شود.", "A part removed here and fitted to another engine keeps both intervals. Change the date to rebuild a past configuration.")}
          </p>
        </div>
        <form method="get" className="filters">
          <label>{L(locale, "تا تاریخ", "As of")}<input type="date" name="asOf" defaultValue={asOfText} /></label>
          <button className="btn" type="submit">{L(locale, "بازسازی", "Rebuild")}</button>
        </form>
      </header>
      <section className="grid-2">
        {[...byModule.entries()].map(([code, rows]) => (
          <article key={code} className="panel">
            <h2>{code}</h2>
            {rows.length === 0 ? <p className="muted">{L(locale, "در این تاریخ قطعه‌ای ثبت نشده.", "Nothing fitted on this date.")}</p> : rows.map((row) => {
              const gained = cyclesInWindow(engine.utilization, row.installedAt, asOf);
              return (
                <div key={row.id} className="pair">
                  <div>
                    <Link href={`/components/${row.component.id}`}><b className="num">{row.component.serialNumber}</b></Link>
                    <div className="note">{row.component.partNumber} · {row.position}{row.component.isLlp ? " · LLP" : ""}</div>
                  </div>
                  <div className="num">{fmtDate(row.installedAt)} · {Math.round(gained.cycles)} cyc</div>
                </div>
              );
            })}
          </article>
        ))}
      </section>
      <section className="panel">
        <h2>{L(locale, "پیاده شده تا این تاریخ", "Removed by this date")}</h2>
        {removed.map((row) => (
          <p key={row.id}>
            <Link href={`/components/${row.component.id}`}><span className="num">{row.component.serialNumber}</span></Link>{" "}
            {fmtDate(row.installedAt)} → {fmtDate(row.removedAt)} · {locale === "fa" ? row.reasonFa : row.reasonEn}
          </p>
        ))}
      </section>
      {can(persona, engine, "component") ? (
        <section className="panel">
          <details className="drawer" open>
            <summary>{L(locale, "نصب قطعه", "Install a part")}</summary>
            <form action={installComponent} className="form-grid">
              <input type="hidden" name="engineId" value={engine.id} />
              <label>P/N<input name="partNumber" required /></label>
              <label>S/N<input name="serialNumber" required /></label>
              <label>{L(locale, "نام", "Name")}<input name="name" required /></label>
              <label>{L(locale, "ماژول", "Module")}
                <select name="moduleCode">{engine.model.modules.map((mod) => <option key={mod.code}>{mod.code}</option>)}</select>
              </label>
              <label>{L(locale, "موقعیت", "Position")}<input name="position" defaultValue="module" /></label>
              <label>{L(locale, "تاریخ", "Date")}<input type="date" name="eventAt" defaultValue={asOfText} required /></label>
              <label className="wide">{L(locale, "دلیل", "Reason")}<input name="reason" required /></label>
              <label><input type="checkbox" name="llp" /> LLP</label>
              <label>{L(locale, "حد سیکل", "Cycle limit")}<input name="lifeLimitCycles" type="number" min="0" /></label>
              <button className="btn" type="submit">{L(locale, "نصب", "Install")}</button>
            </form>
          </details>
          <h3>{L(locale, "پیاده کردن قطعه نصب", "Remove a fitted part")}</h3>
          {fitted.map((row) => (
            <form key={row.id} action={removeComponent} className="filters">
              <input type="hidden" name="engineId" value={engine.id} />
              <input type="hidden" name="installationId" value={row.id} />
              <b className="num">{row.component.serialNumber}</b>
              <input type="date" name="eventAt" defaultValue={asOfText} required />
              <input name="reason" placeholder={L(locale, "دلیل", "Reason")} required />
              <button className="btn ghost" type="submit">{L(locale, "پیاده", "Remove")}</button>
            </form>
          ))}
        </section>
      ) : null}
    </div>
  );
}
