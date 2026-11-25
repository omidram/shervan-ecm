import Link from "next/link";
import { fmtDate, fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { latestByVersion, reconstruct } from "@/lib/life";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

const COLUMNS = [
  "ردیف · Row",
  "شماره سریال موتور · Engine serial number",
  "مدل موتور · Engine model",
  "سازنده · Manufacturer",
  "کاربر / مالک فعلی · Current operator or owner",
  "موقعیت فعلی · Current location",
  "وضعیت عملیاتی · Operational status",
  "ساعت کارکرد کل (TSN)",
  "سیکل کارکرد کل (CSN)",
  "ساعت از آخرین تعمیر (TSO)",
  "سیکل از آخرین تعمیر (CSO)",
  "تاریخ آخرین بازدید · Last inspection date",
  "وضعیت سلامت · Health status",
  "تاریخ مراجعه بعدی · Next shop date",
  "توضیحات · Remarks",
];

export default async function FleetRegisterPage({
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
  const shops = rows
    .flatMap((row) =>
      latestByVersion(row.engine.records)
        .filter((record) => record.type === "shop_visit" || record.type === "overhaul")
        .map((record) => ({ record, serial: row.engine.serialNumber, id: row.engine.id })),
    )
    .sort((a, b) => b.record.performedAt.getTime() - a.record.performedAt.getTime())
    .slice(0, 5);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "فهرست موتورهای ناوگان", "Fleet Register")}</h1>
          <p className="lede">
            {L(
              locale,
              "ستون‌ها در یک ردیف می‌مانند و اگر از صفحه پهن‌تر باشند، به چپ و راست می‌روند. فیلترها با هم کار می‌کنند. خانه‌ای که در داده نیست، خالی می‌ماند.",
              "The columns stay on one row and scroll sideways when they are wider than the screen. The filters work together. A cell with no stored value stays blank.",
            )}
          </p>
        </div>
        <Link className="btn ghost" href="/fleet">{L(locale, "وضعیت کلی ناوگان", "Fleet Overview")}</Link>
      </header>
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
      <section className="panel table-wrap register-scroll" data-register="1">
        <table dir="rtl">
          <thead>
            <tr>
              {COLUMNS.map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => {
              const party = row.engine.operator ?? row.engine.owner;
              const installed = row.engine.installations.find((item) => item.removedAt == null);
              const timed = row.engine.utilization.some((event) => event.kind === "flight" || event.kind === "ground_run");
              const life = timed
                ? reconstruct(
                    row.engine.utilization.map((event) => ({
                      eventAt: event.eventAt,
                      kind: event.kind,
                      flightHours: event.flightHours,
                      flightCycles: event.flightCycles,
                    })),
                    latestByVersion(row.engine.records).map((record) => ({
                      type: record.type,
                      releasedAt: record.releasedAt,
                      performedAt: record.performedAt,
                    })),
                    new Date(),
                  )
                : null;
              const inspection = latestByVersion(row.engine.records)
                .filter((record) => record.type === "inspection")
                .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())[0];
              const now = Date.now();
              const nextShop = row.engine.plans
                .filter((plan) => (plan.inductionAt ?? plan.windowEnd).getTime() >= now)
                .sort((a, b) => (a.inductionAt ?? a.windowStart).getTime() - (b.inductionAt ?? b.windowStart).getTime())[0];
              const health = row.assessment.engineHealth != null && !row.assessment.insufficient ? fmtNum(row.assessment.engineHealth, 0) : "";
              const remarks = locale === "fa" ? row.engine.gapNoteFa : row.engine.gapNoteEn;
              return (
                <tr key={row.engine.id} className={row.engine.hero ? "hero" : ""} data-serial={row.engine.serialNumber}>
                  <td className="num">{index + 1}</td>
                  <td>
                    <Link href={`/engines/${row.engine.id}`}><b className="num">{row.engine.serialNumber}</b></Link>
                  </td>
                  <td className="num">{row.engine.model.code}</td>
                  <td>{row.engine.model.family.manufacturer}</td>
                  <td>{locale === "fa" ? party.nameFa : party.name}</td>
                  <td>{installed ? `${installed.aircraft.registration} · ${installed.position}` : ""}</td>
                  <td>{row.engine.status}</td>
                  <td className="num">{life ? fmtNum(life.tsn, 0) : ""}</td>
                  <td className="num">{life ? fmtNum(life.csn, 0) : ""}</td>
                  <td className="num">{life ? fmtNum(life.tso, 0) : ""}</td>
                  <td className="num">{life ? fmtNum(life.cso, 0) : ""}</td>
                  <td className="num">{inspection ? fmtDate(inspection.performedAt) : ""}</td>
                  <td className="num">{health}</td>
                  <td className="num">{nextShop ? fmtDate(nextShop.inductionAt ?? nextShop.windowStart) : ""}</td>
                  <td>{remarks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h2>{L(locale, "مراجعه‌های اخیر تعمیرگاه", "Recent shop visits")}</h2>
        {shops.length === 0 ? <p className="muted">—</p> : shops.map((item) => (
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
