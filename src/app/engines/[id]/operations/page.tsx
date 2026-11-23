import { notFound } from "next/navigation";
import { addUtilization } from "@/app/actions";
import { Flash, Num } from "@/components/ui";
import { can } from "@/lib/access";
import { fmtDate, fmtNum, utcToday } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function OperationsPage({
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
  const { engine, assessment } = found;
  const life = assessment.life;
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <header className="page-head">
        <div>
          <p className="kicker"><Num>{engine.serialNumber}</Num></p>
          <h1>{L(locale, "تاریخچه کارکرد", "Operational history")}</h1>
          <p className="lede">{L(locale, "هر پرواز یک رویداد است. TSN و CSN از جمع همین رویدادها ساخته می‌شوند.", "Each flight is an event. TSN and CSN are rebuilt from those events.")}</p>
        </div>
      </header>
      <section className="gauges">
        {[["TSN", life.tsn], ["CSN", life.csn], ["TSO", life.tso], ["CSO", life.cso]].map(([label, value]) => (
          <div key={String(label)} className="gauge"><span>{label}</span><b className="num">{fmtNum(Number(value), 0)}</b></div>
        ))}
      </section>
      {can(persona, engine, "utilization") ? (
        <form action={addUtilization} className="panel form-grid">
          <input type="hidden" name="engineId" value={engine.id} />
          <label>{L(locale, "نوع", "Kind")}
            <select name="kind"><option value="flight">flight</option><option value="ground_run">ground run</option></select>
          </label>
          <label>{L(locale, "تاریخ", "Date")}<input type="date" name="eventAt" defaultValue={utcToday()} required /></label>
          <label>{L(locale, "ساعت", "Hours")}<input name="flightHours" type="number" min="0" step="0.1" required /></label>
          <label>{L(locale, "سیکل", "Cycles")}<input name="flightCycles" type="number" min="0" step="1" defaultValue="1" /></label>
          <label>{L(locale, "منبع", "Source")}<input name="source" defaultValue="operator flight log" /></label>
          <label>{L(locale, "یادداشت", "Note")}<input name="note" /></label>
          <button className="btn" type="submit">{L(locale, "ثبت رویداد", "Add event")}</button>
        </form>
      ) : null}
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{L(locale, "تاریخ", "Date")}</th>
              <th>{L(locale, "نوع", "Kind")}</th>
              <th>h</th>
              <th>cyc</th>
              <th>{L(locale, "منبع", "Source")}</th>
              <th>{L(locale, "عامل", "Actor")}</th>
            </tr>
          </thead>
          <tbody>
            {[...engine.utilization].reverse().slice(0, 80).map((event) => (
              <tr key={event.id}>
                <td className="num">{fmtDate(event.eventAt)}</td>
                <td>{event.kind}</td>
                <td className="num">{fmtNum(event.flightHours, 0)}</td>
                <td className="num">{fmtNum(event.flightCycles, 0)}</td>
                <td>{event.source}</td>
                <td>{event.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
