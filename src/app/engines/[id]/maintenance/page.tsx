import { notFound } from "next/navigation";
import { addMaintenance, correctRecord, verifyRecord } from "@/app/actions";
import { Flash, Num } from "@/components/ui";
import { can } from "@/lib/access";
import { fmtDate, fmtNum, utcToday } from "@/lib/format";
import { L, MAINT_TYPES, APPROVAL, maintType } from "@/lib/i18n";
import { latestByVersion } from "@/lib/life";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function MaintenancePage({
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
  const { engine } = found;
  const latest = latestByVersion(engine.records).sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <header className="page-head">
        <div>
          <p className="kicker"><Num>{engine.serialNumber}</Num></p>
          <h1>{L(locale, "سوابق تعمیرات", "Maintenance records")}</h1>
          <p className="lede">{L(locale, "سابقه تأییدشده عوض نمی‌شود. اصلاح، نسخه جدید با رد ممیزی است.", "A verified record is not edited. A correction is a new version with an audit trail.")}</p>
        </div>
      </header>
      {can(persona, engine, "maintenance") ? (
        <form action={addMaintenance} className="panel form-grid">
          <input type="hidden" name="engineId" value={engine.id} />
          <label>{L(locale, "نوع", "Type")}
            <select name="type">{MAINT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.en}</option>)}</select>
          </label>
          <label>{L(locale, "تاریخ", "Date")}<input type="date" name="eventAt" defaultValue={utcToday()} required /></label>
          <label>WO<input name="workOrder" /></label>
          <label>{L(locale, "عنوان", "Title")}<input name="title" required /></label>
          <label className="wide">{L(locale, "شرح", "Narrative")}<textarea name="narrative" required rows={3} /></label>
          <button className="btn" type="submit">{L(locale, "ثبت سابقه", "Add record")}</button>
        </form>
      ) : null}
      {latest.map((record) => {
        const versions = engine.records.filter((item) => item.versionGroupId === record.versionGroupId).sort((a, b) => b.version - a.version);
        const label = maintType(record.type);
        const approval = APPROVAL[record.approvalStatus as keyof typeof APPROVAL];
        const state = record.releasedAt ? "released" : record.performedAt > new Date() ? "scheduled" : "open";
        return (
          <article key={record.id} className="panel">
            <div className="page-head">
              <div>
                <p className="kicker">{label.en} · {L(locale, label.fa, label.en)} · v{record.version}</p>
                <h2>{locale === "fa" ? record.titleFa : record.titleEn}</h2>
              </div>
              <div>
                <span className={`badge ${record.approvalStatus === "verified" ? "good" : record.approvalStatus === "extracted" ? "info" : "watch"}`}>
                  {approval ? L(locale, approval.fa, approval.en) : record.approvalStatus}
                </span>{" "}
                <span className="badge info">{state}</span>
              </div>
            </div>
            <p>{locale === "fa" ? record.narrativeFa : record.narrativeEn}</p>
            <p className="note">
              <Num>{fmtDate(record.performedAt)}</Num>
              {record.releasedAt ? <> → <Num>{fmtDate(record.releasedAt)}</Num></> : null}
              {" · "}WO <Num>{record.workOrder || "—"}</Num>
              {record.mro ? ` · ${locale === "fa" ? record.mro.nameFa : record.mro.name}` : ""}
              {record.hoursAtEvent != null ? <> · TSN <Num>{fmtNum(record.hoursAtEvent, 0)}</Num></> : null}
              {record.cyclesAtEvent != null ? <> · CSN <Num>{fmtNum(record.cyclesAtEvent, 0)}</Num></> : null}
              {" · "}{record.actor}
            </p>
            {record.defects.map((defect) => (
              <p key={defect.id}><span className="badge watch">{defect.moduleCode}</span> {locale === "fa" ? defect.descriptionFa : defect.descriptionEn}</p>
            ))}
            {record.partActions.map((part) => (
              <p key={part.id} className="note">{part.action.toUpperCase()} ×{part.qty} {part.partNumber} <span className="num">{part.serialNumber}</span></p>
            ))}
            {versions.length > 1 ? (
              <p className="note">{L(locale, "نسخه‌ها", "Versions")}: {versions.map((item) => `v${item.version} ${item.approvalStatus}`).join(" · ")}</p>
            ) : null}
            {can(persona, engine, "verify") && !record.immutable ? (
              <form action={verifyRecord}>
                <input type="hidden" name="engineId" value={engine.id} />
                <input type="hidden" name="recordId" value={record.id} />
                <button className="btn" type="submit">{L(locale, "تأیید و قفل", "Verify and lock")}</button>
              </form>
            ) : null}
            {can(persona, engine, "maintenance") && record.immutable ? (
              <form action={correctRecord} className="form-grid">
                <input type="hidden" name="engineId" value={engine.id} />
                <input type="hidden" name="recordId" value={record.id} />
                <label className="wide">{L(locale, "شرح نسخه اصلاحی", "Correction narrative")}<textarea name="narrative" required rows={3} defaultValue={locale === "fa" ? record.narrativeFa : record.narrativeEn} /></label>
                <button className="btn ghost" type="submit">{L(locale, "صدور نسخه جدید", "Issue new version")}</button>
              </form>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
