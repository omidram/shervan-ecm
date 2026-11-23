import Link from "next/link";
import { Spark } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/format";
import { L, STATUS_GLOSS, statusTone } from "@/lib/i18n";
import { latestByVersion } from "@/lib/life";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";
import { can } from "@/lib/access";

export default async function FleetListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; model?: string; owner?: string; alert?: string }>;
}) {
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const owners = [...new Map(rows.map((row) => [row.engine.owner.id, row.engine.owner])).values()];
  const models = [...new Set(rows.map((row) => row.engine.model.code))];
  const alertOf = (row: (typeof rows)[number]) =>
    row.engine.recordGap ||
    row.assessment.insufficient ||
    row.assessment.faults.some((fault) => fault.reported) ||
    row.assessment.llp.some((llp) => llp.remainingPct < 15);
  const filtered = rows.filter((row) => {
    if (sp.q && !`${row.engine.serialNumber} ${row.engine.partNumber}`.toLowerCase().includes(sp.q.toLowerCase())) return false;
    if (sp.status && row.engine.status !== sp.status) return false;
    if (sp.model && row.engine.model.code !== sp.model) return false;
    if (sp.owner && row.engine.owner.id !== sp.owner) return false;
    if (sp.alert === "1" && !alertOf(row)) return false;
    return true;
  });
  const count = (status: string) => rows.filter((row) => row.engine.status === status).length;
  const shops = rows
    .flatMap((row) =>
      latestByVersion(row.engine.records)
        .filter((record) => record.type === "shop_visit" || record.type === "overhaul")
        .map((record) => ({ record, serial: row.engine.serialNumber, id: row.engine.id })),
    )
    .sort((a, b) => b.record.performedAt.getTime() - a.record.performedAt.getTime())
    .slice(0, 5);
  const llpAlerts = rows.flatMap((row) =>
    row.assessment.llp
      .filter((llp) => llp.remainingPct < 15)
      .map((llp) => ({ llp, serial: row.engine.serialNumber, id: row.engine.id })),
  );
  const openFaults = rows.flatMap((row) =>
    row.assessment.faults
      .filter((fault) => fault.reported)
      .map((fault) => ({ fault, serial: row.engine.serialNumber, id: row.engine.id })),
  );
  const gaps = rows.filter((row) => row.engine.recordGap || row.assessment.insufficient);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "فرمان ناوگان", "Fleet command")}</h1>
          <p className="lede">
            {L(
              locale,
              "موتورهای همین شرکت، بر اساس وضعیت و مدل. هشدار باز، قطعه نزدیک حد عمر، و پرونده ناقص همین‌جا دیده می‌شود.",
              "This company's engines, by status and model. Open alerts, life-limited parts near their limit, and incomplete files are listed here.",
            )}
          </p>
        </div>
        {can(persona, null, "createEngine") ? (
          <Link className="btn" href="/engines/new">{L(locale, "پرونده جدید", "New passport")}</Link>
        ) : null}
      </header>
      <section className="grid-4">
        {[
          ["In Service", count("In Service") + count("Active")],
          ["Under Maintenance", count("Under Maintenance")],
          ["Under Inspection", count("Under Inspection")],
          ["Standby", count("Standby") + count("In Storage") + count("Unserviceable")],
        ].map(([label, value]) => (
          <article key={String(label)} className={`panel stat ${label === "Under Maintenance" || label === "Under Inspection" ? "watch" : label === "Standby" ? "bad" : "good"}`}>
            <span>{label}</span>
            <b className="num">{value}</b>
          </article>
        ))}
      </section>
      <section className="grid-3">
        <article className="panel">
          <h2>{L(locale, "عیب باز", "Open faults")}</h2>
          {openFaults.length === 0 ? <p className="muted">—</p> : openFaults.map((item) => (
            <p key={`${item.id}-${item.fault.modeCode}`}>
              <Link href={`/engines/${item.id}/faults`}><span className="num">{item.serial}</span></Link> {item.fault.modeCode}{" "}
              <span className="num">{fmtNum(item.fault.probability * 100, 0)}%</span>
            </p>
          ))}
        </article>
        <article className="panel">
          <h2>LLP</h2>
          {llpAlerts.length === 0 ? <p className="muted">—</p> : llpAlerts.map((item) => (
            <p key={item.llp.componentId}>
              <Link href={`/engines/${item.id}`}><span className="num">{item.serial}</span></Link> {item.llp.serialNumber}{" "}
              <span className="num">{fmtNum(item.llp.remainingPct, 1)}%</span>
            </p>
          ))}
        </article>
        <article className="panel">
          <h2>{L(locale, "پرونده ناقص", "Incomplete records")}</h2>
          {gaps.length === 0 ? <p className="muted">—</p> : gaps.map((row) => (
            <p key={row.engine.id}>
              <Link href={`/engines/${row.engine.id}`}><span className="num">{row.engine.serialNumber}</span></Link>{" "}
              {locale === "fa" ? row.engine.gapNoteFa || "داده عملکرد کم است" : row.engine.gapNoteEn || "Thin performance history"}
            </p>
          ))}
        </article>
      </section>
      <form className="filters" method="get">
        <label>
          {L(locale, "سریال", "Serial")}
          <input name="q" defaultValue={sp.q || ""} placeholder="ESN" />
        </label>
        <label>
          {L(locale, "وضعیت", "Status")}
          <select name="status" defaultValue={sp.status || ""}>
            <option value="">{L(locale, "همه", "All")}</option>
            {[...new Set(rows.map((row) => row.engine.status))].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          {L(locale, "مدل", "Model")}
          <select name="model" defaultValue={sp.model || ""}>
            <option value="">{L(locale, "همه", "All")}</option>
            {models.map((model) => <option key={model}>{model}</option>)}
          </select>
        </label>
        <label>
          {L(locale, "مالک", "Owner")}
          <select name="owner" defaultValue={sp.owner || ""}>
            <option value="">{L(locale, "همه", "All")}</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>{locale === "fa" ? owner.nameFa : owner.name}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" name="alert" value="1" defaultChecked={sp.alert === "1"} /> {L(locale, "فقط هشدار", "Alerts only")}
        </label>
        <button className="btn" type="submit">{L(locale, "اعمال", "Apply")}</button>
      </form>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{L(locale, "وضعیت", "Status")}</th>
              <th>ESN</th>
              <th>{L(locale, "مدل", "Model")}</th>
              <th>{L(locale, "مالک", "Owner")}</th>
              <th>{L(locale, "بهره‌بردار", "Operator")}</th>
              <th>{L(locale, "سلامت", "Health")}</th>
              <th>EGT</th>
              <th>{L(locale, "عیب", "Faults")}</th>
              <th>LLP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const gloss = STATUS_GLOSS[row.engine.status];
              const minLlp = row.assessment.llp.slice().sort((a, b) => a.remainingPct - b.remainingPct)[0];
              return (
                <tr key={row.engine.id} className={row.engine.hero ? "hero" : ""} data-serial={row.engine.serialNumber}>
                  <td>
                    <span className={`pill ${statusTone(row.engine.status)}`}>
                      <i className="lamp" /> {row.engine.status}
                    </span>
                    <div className="note">{gloss ? L(locale, gloss.fa, gloss.en) : ""}</div>
                  </td>
                  <td>
                    <Link href={`/engines/${row.engine.id}`}><b className="num">{row.engine.serialNumber}</b></Link>
                    {row.engine.hero ? <div className="badge watch">HERO</div> : null}
                  </td>
                  <td className="num">{row.engine.model.code}</td>
                  <td>{locale === "fa" ? row.engine.owner.nameFa : row.engine.owner.name}</td>
                  <td>{row.engine.operator ? (locale === "fa" ? row.engine.operator.nameFa : row.engine.operator.name) : "—"}</td>
                  <td className="num">{row.assessment.engineHealth == null ? "—" : fmtNum(row.assessment.engineHealth, 0)}</td>
                  <td><Spark values={row.engine.samples.map((sample) => sample.egtMargin)} /></td>
                  <td className="num">{row.assessment.faults.filter((fault) => fault.reported).length}</td>
                  <td className="num">{minLlp ? `${fmtNum(minLlp.remainingPct, 0)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h2>{L(locale, "مراجعه‌های اخیر تعمیرگاه", "Recent shop visits")}</h2>
        {shops.map((item) => (
          <p key={item.record.id}>
            <Link href={`/engines/${item.id}/maintenance`}><span className="num">{item.serial}</span></Link>{" "}
            {locale === "fa" ? item.record.titleFa : item.record.titleEn} · <span className="num">{fmtDate(item.record.performedAt)}</span>
            {item.record.releasedAt ? "" : ` · ${L(locale, "باز", "open")}`}
          </p>
        ))}
      </section>
    </div>
  );
}
