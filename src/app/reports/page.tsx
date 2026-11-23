import Link from "next/link";
import { canSeeDocument } from "@/lib/access";
import { fmtDate, fmtNum } from "@/lib/format";
import { L, maintType } from "@/lib/i18n";
import { latestByVersion } from "@/lib/life";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ engine?: string }> }) {
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const selected = rows.find((row) => row.engine.id === sp.engine) ?? rows.find((row) => row.engine.hero) ?? rows[0];
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "گزارش‌ها", "Reports")}</h1>
          <p className="lede">{L(locale, "ده گزارش پرونده روی همین صفحه است. وضعیت موتور PDF انگلیسی است و LLP و خلاصه ناوگان CSV. اکسل جدا ساخته نمی‌شود.", "The ten passport reports are on this page. Engine status is an English PDF. LLP and the fleet summary are CSV. There is no separate Excel file.")}</p>
        </div>
      </header>
      <section className="tile-grid">
        <a className="tile" href={selected ? `/api/reports/status?engine=${selected.engine.id}` : "/reports"}><span>{L(locale, "وضعیت موتور", "Engine status")}</span><b>PDF</b></a>
        <a className="tile" href="/api/reports/llp"><span>LLP</span><b>CSV</b></a>
        <a className="tile" href="/api/reports/fleet"><span>{L(locale, "خلاصه ناوگان", "Fleet summary")}</span><b>CSV</b></a>
        <Link className="tile" href="/audit"><span>{L(locale, "ممیزی", "Audit")}</span><b>→</b></Link>
      </section>
      <form className="filters" method="get">
        <select name="engine" defaultValue={selected?.engine.id}>
          {rows.map((row) => <option key={row.engine.id} value={row.engine.id}>{row.engine.serialNumber} · {row.engine.model.code}</option>)}
        </select>
        <button className="btn" type="submit">{L(locale, "نمایش", "Show")}</button>
        {selected ? (
          <>
            <a className="btn" href={`/api/reports/status?engine=${selected.engine.id}`}>PDF</a>
            <a className="btn ghost" href="/api/reports/llp">CSV LLP</a>
          </>
        ) : null}
      </form>
      {selected ? (
        <div className="stack">
          <section className="panel">
            <h2>{L(locale, "وضعیت موتور", "Engine status")}</h2>
            <p className="num">{selected.engine.serialNumber} · {selected.engine.model.code} · {selected.engine.status}</p>
            <p>TSN <span className="num">{fmtNum(selected.assessment.life.tsn, 0)}</span> · CSN <span className="num">{fmtNum(selected.assessment.life.csn, 0)}</span> · {L(locale, "سلامت", "Health")} <span className="num">{selected.assessment.engineHealth ?? "—"}</span></p>
          </section>
          <section className="panel">
            <h2>{L(locale, "پیکربندی", "Configuration")}</h2>
            {selected.engine.compInstalls.filter((row) => !row.removedAt).map((row) => (
              <div className="pair" key={row.id}><span>{row.moduleCode} <span className="num">{row.component.serialNumber}</span></span><span>{row.component.partNumber}</span></div>
            ))}
          </section>
          <section className="panel">
            <h2>{L(locale, "تاریخچه تعمیرات", "Maintenance history")}</h2>
            {latestByVersion(selected.engine.records).map((record) => (
              <p key={record.id}>{fmtDate(record.performedAt)} · {maintType(record.type).en} · {locale === "fa" ? record.titleFa : record.titleEn}</p>
            ))}
          </section>
          <section className="panel">
            <h2>LLP</h2>
            {selected.assessment.llp.map((llp) => (
              <p key={llp.componentId}><span className="num">{llp.serialNumber}</span> {fmtNum(llp.remaining, 0)} / {fmtNum(llp.lifeLimitCycles, 0)} ({fmtNum(llp.remainingPct, 1)}%)</p>
            ))}
          </section>
          <section className="panel">
            <h2>{L(locale, "مالکیت", "Ownership")}</h2>
            {selected.engine.transfers.map((row) => (
              <p key={row.id}>{fmtDate(row.transferredAt)} · {row.fromOrg?.name ?? "—"} → {row.toOrg.name} · {row.actor}</p>
            ))}
          </section>
          <section className="panel">
            <h2>{L(locale, "کارکرد", "Operational history")}</h2>
            <p>TSN <span className="num">{fmtNum(selected.assessment.life.tsn, 0)}</span> · CSN <span className="num">{fmtNum(selected.assessment.life.csn, 0)}</span> · TSO <span className="num">{fmtNum(selected.assessment.life.tso, 0)}</span> · CSO <span className="num">{fmtNum(selected.assessment.life.cso, 0)}</span></p>
            {selected.engine.utilization.slice(-4).reverse().map((row) => (
              <p key={row.id}><span className="num">{fmtDate(row.eventAt)}</span> · {row.kind} · {fmtNum(row.flightHours, 0)} h / {fmtNum(row.flightCycles, 0)} cyc</p>
            ))}
          </section>
          <section className="panel">
            <h2>{L(locale, "تاریخچه قطعه", "Component history")}</h2>
            {selected.engine.compInstalls.filter((row) => row.component.partNumber.startsWith("SHV-H") || row.component.isLlp).slice(0, 8).map((row) => (
              <p key={row.id}><span className="num">{row.component.serialNumber}</span> {fmtDate(row.installedAt)}{row.removedAt ? ` → ${fmtDate(row.removedAt)}` : ""} · {row.component.partNumber}</p>
            ))}
          </section>
          <section className="panel">
            <h2>{L(locale, "خلاصه shop visit", "Shop visit summary")}</h2>
            {latestByVersion(selected.engine.records).filter((row) => row.type === "shop_visit" || row.type === "overhaul").map((row) => (
              <p key={row.id}>{fmtDate(row.performedAt)} · {row.workOrder || "—"} · {row.releasedAt ? fmtDate(row.releasedAt) : L(locale, "باز", "open")} · {locale === "fa" ? row.titleFa : row.titleEn}</p>
            ))}
          </section>
          <section className="panel">
            <h2>{L(locale, "کامل بودن اسناد", "Document completeness")}</h2>
            {(() => {
              const docs = selected.engine.documents.filter((doc) => canSeeDocument(persona, doc, selected.engine));
              const waiting = docs.reduce((sum, doc) => sum + doc.fields.filter((field) => field.status === "pending").length, 0);
              return (
                <>
            <p>{L(locale, "سند قابل دیدن", "Visible documents")} <span className="num">{docs.length}</span> · {L(locale, "فیلد در صف", "Fields waiting")} <span className="num">{waiting}</span></p>
            {docs.map((doc) => (
              <p key={doc.id}>{locale === "fa" ? doc.titleFa : doc.titleEn} · {doc.docClass} · {doc.committedAt ? L(locale, "نشسته", "committed") : L(locale, "باز", "open")}</p>
            ))}
                </>
              );
            })()}
          </section>
        </div>
      ) : <p>{L(locale, "موتوری در این نشست نیست.", "No engine in this session.")}</p>}
    </div>
  );
}
