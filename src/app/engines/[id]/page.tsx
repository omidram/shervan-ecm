import Link from "next/link";
import { notFound } from "next/navigation";
import { addInstallation, changeStatus, removeInstallation, transferOwnership } from "@/app/actions";
import { HealthRows, RingGauge } from "@/components/instruments";
import { Flash, Num } from "@/components/ui";
import { can, canSeeDocument } from "@/lib/access";
import { fmtDate, fmtNum, utcToday } from "@/lib/format";
import { L, STATUSES, STATUS_GLOSS, maintType, statusTone } from "@/lib/i18n";
import { latestByVersion } from "@/lib/life";
import { listOrgs, getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function PassportPage({
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
  const orgs = await listOrgs();
  const life = assessment.life;
  const gloss = STATUS_GLOSS[engine.status];
  const openInstall = engine.installations.find((row) => !row.removedAt);
  const records = latestByVersion(engine.records).slice().sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  const lastShop = records.filter((row) => ["shop_visit", "overhaul", "repair", "replacement"].includes(row.type)).slice(0, 3);
  const lastLook = records.filter((row) => ["inspection", "borescope", "ndt", "performance_test"].includes(row.type)).slice(0, 3);
  const docs = engine.documents.filter((doc) => canSeeDocument(persona, doc, engine));
  const history = [
    ...engine.statusEvents.map((event) => ({ at: event.eventAt, title: event.status, note: locale === "fa" ? event.reasonFa : event.reasonEn })),
    ...engine.transfers.map((row) => ({ at: row.transferredAt, title: locale === "fa" ? "انتقال مالکیت" : "Ownership transfer", note: `${row.fromOrg ? row.fromOrg.name : "—"} → ${row.toOrg.name} · ${row.actor}` })),
    ...engine.installations.flatMap((row) => {
      const fitted = { at: row.installedAt, title: `${row.aircraft.registration} pos ${row.position}`, note: locale === "fa" ? row.installReasonFa : row.installReasonEn };
      return row.removedAt ? [fitted, { at: row.removedAt, title: locale === "fa" ? "پیاده از هواپیما" : "Removed from aircraft", note: locale === "fa" ? row.removalReasonFa : row.removalReasonEn }] : [fitted];
    }),
    ...records.slice(0, 6).map((row) => ({ at: row.performedAt, title: locale === "fa" ? row.titleFa : row.titleEn, note: maintType(row.type).en })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
  const gauges = [
    ["TSN", fmtNum(life.tsn, 0), "h"],
    ["CSN", fmtNum(life.csn, 0), "cyc"],
    ["TSO", fmtNum(life.tso, 0), "h"],
    ["CSO", fmtNum(life.cso, 0), "cyc"],
    ["TSLSV", fmtNum(life.tslsv, 0), "h"],
    ["CSLSV", fmtNum(life.cslsv, 0), "cyc"],
    ["Flight hours", fmtNum(life.flightHours, 0), "h"],
    ["Flight cycles", fmtNum(life.flightCycles, 0), "cyc"],
  ];
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <section className="plate">
        <div>
          <p className="kicker">{engine.model.family.manufacturer} · {engine.model.family.name}</p>
          <h1 className="esn num">{engine.serialNumber} {engine.hero ? <span className="badge watch">HERO</span> : null}</h1>
          <p>
            <span className={`pill ${statusTone(engine.status)}`}><i className="lamp" /> {engine.status}</span>{" "}
            <span className="muted">{gloss ? L(locale, gloss.fa, gloss.en) : ""}</span>
          </p>
          <div className="pair"><span>{L(locale, "مدل", "Model")}</span><b className="num">{engine.model.code}</b></div>
          <div className="pair"><span>P/N</span><b className="num">{engine.partNumber}</b></div>
          <div className="pair"><span>{L(locale, "تاریخ ساخت", "Build date")}</span><b className="num">{fmtDate(engine.buildDate)}</b></div>
          <div className="pair"><span>{L(locale, "پیکربندی", "Configuration")}</span><b>{engine.configuration}</b></div>
          <div className="pair"><span>{L(locale, "مالک", "Owner")}</span><b>{locale === "fa" ? engine.owner.nameFa : engine.owner.name}</b></div>
          <div className="pair"><span>{L(locale, "بهره‌بردار", "Operator")}</span><b>{engine.operator ? (locale === "fa" ? engine.operator.nameFa : engine.operator.name) : "—"}</b></div>
        </div>
        <div>
          <h2>{L(locale, "آخرین مقادیر بازسازی‌شده", "Latest reconstructed values")}</h2>
          <div className="gauges">
            {gauges.map(([label, value, unit]) => (
              <div key={label} className="gauge">
                <span>{label}</span>
                <b className="num">{value}</b>
                <span>{unit}</span>
              </div>
            ))}
          </div>
          <p className="note">
            {L(locale, "این عددها از رویدادهای کارکرد جمع شده‌اند، نه از یک شمارنده قابل ویرایش.", "These figures are summed from utilization events, not from one editable counter.")}
            {life.lastShop ? ` ${L(locale, "آخرین ترخیص shop", "Last shop release")}: ` : ""}
            {life.lastShop ? <Num>{fmtDate(life.lastShop)}</Num> : null}
          </p>
        </div>
      </section>
      {engine.recordGap ? <div className="banner-warn">{locale === "fa" ? engine.gapNoteFa : engine.gapNoteEn}</div> : null}
      <section className="panel">
        <h2>{L(locale, "سلامت ماژول", "Module health")}</h2>
        <div className="ring-row">
          {assessment.modules.map((mod) => (
            <RingGauge key={mod.code} value={mod.healthIndex} label={mod.code} caption={locale === "fa" ? mod.nameFa : mod.name} />
          ))}
        </div>
        <HealthRows
          rows={assessment.modules.map((mod) => ({
            href: `/engines/${engine.id}/gas-path?m=${mod.code}`,
            code: mod.code,
            label: locale === "fa" ? mod.nameFa : mod.name,
            value: mod.healthIndex,
          }))}
        />
      </section>
      <section className="grid-2">
        <article className="panel">
          <h2>{L(locale, "رویدادهای وضعیت", "Status events")}</h2>
          <div className="timeline">
            {engine.statusEvents.map((event) => (
              <div className="tl" key={event.id}>
                <span className="num">{fmtDate(event.eventAt)}</span>
                <div>
                  <b>{event.status}</b>
                  <div>{locale === "fa" ? event.reasonFa : event.reasonEn}</div>
                  <div className="note">{event.source} · {event.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>{L(locale, "مالکیت", "Ownership")}</h2>
          {engine.transfers.map((row) => (
            <div className="tl" key={row.id}>
              <span className="num">{fmtDate(row.transferredAt)}</span>
              <div>
                <b>{row.fromOrg ? (locale === "fa" ? row.fromOrg.nameFa : row.fromOrg.name) : "—"} → {locale === "fa" ? row.toOrg.nameFa : row.toOrg.name}</b>
                <div>{locale === "fa" ? row.reasonFa : row.reasonEn}</div>
                <div className="note">{row.actor}</div>
              </div>
            </div>
          ))}
          <h2>{L(locale, "نصب روی هواپیما", "Aircraft installations")}</h2>
          {engine.installations.map((row) => (
            <div className="tl" key={row.id}>
              <span className="num">{fmtDate(row.installedAt)}</span>
              <div>
                <b className="num">{row.aircraft.registration}</b> {row.aircraft.typeName} · pos {row.position}
                <div>{locale === "fa" ? row.installReasonFa : row.installReasonEn}</div>
                {row.removedAt ? (
                  <div className="note">{fmtDate(row.removedAt)} · {locale === "fa" ? row.removalReasonFa : row.removalReasonEn}</div>
                ) : (
                  <div className="note">{L(locale, "هنوز نصب است", "Still installed")}</div>
                )}
              </div>
            </div>
          ))}
        </article>
      </section>
      <section className="grid-2">
        <article className="panel">
          <h2>{L(locale, "آخرین تعمیرات", "Latest maintenance")}</h2>
          {lastShop.length === 0 ? <p className="muted">—</p> : lastShop.map((row) => (
            <p key={row.id}><Link href={`/engines/${engine.id}/maintenance`}>{fmtDate(row.performedAt)}</Link> · {locale === "fa" ? row.titleFa : row.titleEn}</p>
          ))}
          <h2>{L(locale, "آخرین بازرسی‌ها", "Latest inspections")}</h2>
          {lastLook.length === 0 ? <p className="muted">—</p> : lastLook.map((row) => (
            <p key={row.id}>{fmtDate(row.performedAt)} · {locale === "fa" ? row.titleFa : row.titleEn} · {row.approvalStatus}</p>
          ))}
        </article>
        <article className="panel">
          <h2>{L(locale, "اسناد فنی", "Technical documents")}</h2>
          {docs.length === 0 ? <p className="muted">{L(locale, "سندی در این نشست نیست.", "No document in this session.")}</p> : docs.slice(0, 6).map((doc) => (
            <p key={doc.id}>
              <Link href={`/documents/${doc.id}`}>{locale === "fa" ? doc.titleFa : doc.titleEn}</Link>{" "}
              <span className="note">{doc.fields.some((field) => field.status === "pending") ? L(locale, "در صف تأیید", "pending") : doc.committedAt ? L(locale, "نشسته", "committed") : doc.visibility}</span>
            </p>
          ))}
          <h2>{L(locale, "تاریخچه رویداد", "Event history")}</h2>
          {history.map((item) => (
            <div className="tl" key={`${item.at.toISOString()}-${item.title}`}>
              <span className="num">{fmtDate(item.at)}</span>
              <div><b>{item.title}</b><div className="note">{item.note}</div></div>
            </div>
          ))}
        </article>
      </section>
      <section className="grid-2">
        <article className="panel">
          <h2>{L(locale, "عیب‌های گزارش‌شده", "Reported faults")}</h2>
          {assessment.faults.filter((fault) => fault.reported).map((fault) => (
            <p key={fault.modeCode}>
              <Link href={`/engines/${engine.id}/faults`}>{locale === "fa" ? fault.titleFa : fault.titleEn}</Link>{" "}
              <span className="num">{fmtNum(fault.probability * 100, 0)}%</span>
            </p>
          ))}
          <h2>LLP</h2>
          {assessment.llp.map((llp) => (
            <p key={llp.componentId}>
              <Link href={`/components/${llp.componentId}`}><span className="num">{llp.serialNumber}</span></Link>{" "}
              {L(locale, "باقیمانده", "remaining")} <span className="num">{fmtNum(llp.remaining, 0)}</span> / <span className="num">{fmtNum(llp.lifeLimitCycles, 0)}</span>
            </p>
          ))}
        </article>
        <article className="panel">
          {can(persona, engine, "status") ? (
            <details className="drawer" open>
              <summary>{L(locale, "تغییر وضعیت", "Change status")}</summary>
              <form action={changeStatus} className="form-grid">
                <input type="hidden" name="engineId" value={engine.id} />
                <label>{L(locale, "وضعیت", "Status")}
                  <select name="status" defaultValue={engine.status}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                </label>
                <label>{L(locale, "تاریخ", "Date")}<input type="date" name="eventAt" defaultValue={utcToday()} required /></label>
                <label>{L(locale, "منبع", "Source")}<input name="source" required placeholder="operator log" /></label>
                <label className="wide">{L(locale, "دلیل", "Reason")}<input name="reason" required /></label>
                <button className="btn" type="submit">{L(locale, "ثبت رویداد", "Record event")}</button>
              </form>
            </details>
          ) : null}
          {can(persona, engine, "transfer") ? (
            <details className="drawer">
              <summary>{L(locale, "انتقال مالکیت", "Transfer ownership")}</summary>
              <form action={transferOwnership} className="form-grid">
                <input type="hidden" name="engineId" value={engine.id} />
                <label>{L(locale, "مالک جدید", "New owner")}
                  <select name="toOrgId">{orgs.filter((org) => org.kind === "owner").map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select>
                </label>
                <label>{L(locale, "تاریخ", "Date")}<input type="date" name="eventAt" defaultValue={utcToday()} required /></label>
                <label className="wide">{L(locale, "دلیل", "Reason")}<input name="reason" required /></label>
                <button className="btn" type="submit">{L(locale, "انتقال", "Transfer")}</button>
              </form>
            </details>
          ) : null}
          {can(persona, engine, "installation") ? (
            <details className="drawer">
              <summary>{L(locale, "نصب یا پیاده", "Install or remove")}</summary>
              {openInstall ? (
                <form action={removeInstallation} className="form-grid">
                  <input type="hidden" name="engineId" value={engine.id} />
                  <input type="hidden" name="installationId" value={openInstall.id} />
                  <label>{L(locale, "تاریخ پیاده", "Removal date")}<input type="date" name="eventAt" defaultValue={utcToday()} required /></label>
                  <label>{L(locale, "دلیل", "Reason")}<input name="reason" required /></label>
                  <button className="btn ghost" type="submit">{L(locale, "پیاده کردن", "Remove")}</button>
                </form>
              ) : (
                <form action={addInstallation} className="form-grid">
                  <input type="hidden" name="engineId" value={engine.id} />
                  <label>{L(locale, "رجیستر", "Registration")}<input name="registration" required placeholder="FV-4500" /></label>
                  <label>{L(locale, "نوع", "Type")}<input name="typeName" required placeholder="Boeing 737-800" /></label>
                  <label>{L(locale, "موقعیت", "Position")}<input name="position" required defaultValue="1" /></label>
                  <label>{L(locale, "تاریخ", "Date")}<input type="date" name="eventAt" defaultValue={utcToday()} required /></label>
                  <label className="wide">{L(locale, "دلیل", "Reason")}<input name="reason" required /></label>
                  <button className="btn" type="submit">{L(locale, "نصب", "Install")}</button>
                </form>
              )}
            </details>
          ) : null}
        </article>
      </section>
    </div>
  );
}
