import Link from "next/link";
import { EnginePick } from "@/components/engine-pick";
import { UsageChart } from "@/components/usage-chart";
import { canSeeDocument } from "@/lib/access";
import { fmtDate, fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ engine?: string }> }) {
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const picked = rows.find((row) => row.engine.id === sp.engine) ?? rows[0];
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Ownership & Operational History</p>
          <h1>{L(locale, "مالکیت و کارکرد", "Ownership and operation")}</h1>
        </div>
        <EnginePick
          label={L(locale, "موتور", "Engine")}
          value={picked?.engine.id ?? ""}
          engines={rows.map((row) => ({ id: row.engine.id, serialNumber: row.engine.serialNumber, model: row.engine.model.code }))}
        />
      </header>
      {!picked ? <p>{L(locale, "موتوری برای این شرکت نیست.", "This company has no engine.")}</p> : (
        <div className="stack">
          <section className="grid-2">
            <article className="panel">
              <h2>{L(locale, "شناسنامه موتور", "Engine overview")}</h2>
              <p className="esn num">{picked.engine.serialNumber}</p>
              <div className="pair"><span>{L(locale, "مدل", "Model")}</span><b>{picked.engine.model.code}</b></div>
              <div className="pair"><span>{L(locale, "سازنده", "Manufacturer")}</span><b>{picked.engine.model.family.manufacturer}</b></div>
              <div className="pair"><span>TSN</span><b className="num">{fmtNum(picked.assessment.life.tsn, 0)} h</b></div>
              <div className="pair"><span>CSN</span><b className="num">{fmtNum(picked.assessment.life.csn, 0)}</b></div>
              <div className="pair"><span>{L(locale, "مالک", "Owner")}</span><b>{locale === "fa" ? picked.engine.owner.nameFa : picked.engine.owner.name}</b></div>
              <div className="pair"><span>{L(locale, "بهره‌بردار", "Operator")}</span><b>{picked.engine.operator ? (locale === "fa" ? picked.engine.operator.nameFa : picked.engine.operator.name) : "—"}</b></div>
              <div className="pair"><span>{L(locale, "وضعیت", "Status")}</span><b>{picked.engine.status}</b></div>
              <p><Link href={`/engines/${picked.engine.id}`}>{L(locale, "پرونده کامل", "Full passport")}</Link></p>
            </article>
            <article className="panel">
              <h2>{L(locale, "تاریخچه مالکیت", "Ownership history")}</h2>
              <table>
                <thead><tr><th>#</th><th>{L(locale, "مالک", "Owner")}</th><th>{L(locale, "از", "From")}</th><th>{L(locale, "توضیح", "Remarks")}</th></tr></thead>
                <tbody>
                  {picked.engine.transfers.map((row, index) => (
                    <tr key={row.id}>
                      <td className="num">{index + 1}</td>
                      <td>{row.toOrg.name}</td>
                      <td className="num">{fmtDate(row.transferredAt)}</td>
                      <td>{locale === "fa" ? row.reasonFa : row.reasonEn}<div className="note">{row.actor}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
          <section className="panel" id="ops">
            <h2>{L(locale, "کارکرد", "Operational history")}</h2>
            <table>
              <thead><tr><th>{L(locale, "تاریخ", "Date")}</th><th>{L(locale, "نوع", "Kind")}</th><th>{L(locale, "ساعت", "Hours")}</th><th>{L(locale, "سیکل", "Cycles")}</th></tr></thead>
              <tbody>
                {picked.engine.utilization.slice(-8).reverse().map((row) => (
                  <tr key={row.id}>
                    <td className="num">{fmtDate(row.eventAt)}</td>
                    <td>{row.kind}</td>
                    <td className="num">{fmtNum(row.flightHours, 1)}</td>
                    <td className="num">{fmtNum(row.flightCycles, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h2>{L(locale, "روند ساعت و سیکل", "Hours and cycles")}</h2>
            <UsageChart points={picked.engine.utilization.map((row) => ({ t: fmtDate(row.eventAt), hours: row.flightHours, cycles: row.flightCycles }))} />
          </section>
          <section className="grid-2">
            <article className="panel">
              <h2>{L(locale, "رویدادهای اصلی", "Key events")}</h2>
              {picked.engine.records.slice(0, 6).map((row) => (
                <p key={row.id}><span className="num">{fmtDate(row.performedAt)}</span> · {locale === "fa" ? row.titleFa : row.titleEn}</p>
              ))}
            </article>
            <article className="panel">
              <h2>{L(locale, "اسناد", "Documents")}</h2>
              {picked.engine.documents.filter((doc) => canSeeDocument(persona, doc, picked.engine)).slice(0, 6).map((doc) => (
                <p key={doc.id}><Link href={`/documents/${doc.id}`}>{locale === "fa" ? doc.titleFa : doc.titleEn}</Link></p>
              ))}
              <p className="note">
                <Link href={`/engines/${picked.engine.id}/configuration`}>{L(locale, "پیکربندی", "Configuration")}</Link>
                {" · "}
                <Link href={`/engines/${picked.engine.id}/maintenance`}>{L(locale, "تعمیرات", "Maintenance")}</Link>
                {" · "}
                <Link href={`/engines/${picked.engine.id}/gas-path`}>{L(locale, "سلامت", "Health")}</Link>
              </p>
            </article>
          </section>
        </div>
      )}
    </div>
  );
}
