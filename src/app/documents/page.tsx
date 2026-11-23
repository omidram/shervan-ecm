import Link from "next/link";
import { uploadDocument } from "@/app/actions";
import { Flash } from "@/components/ui";
import { allowedVisibility, can } from "@/lib/access";
import { classLabel } from "@/lib/extract";
import { fmtDate } from "@/lib/format";
import { L } from "@/lib/i18n";
import { listDocuments } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const { visible, withheld, engines } = await listDocuments(persona);
  const queue = visible.filter((doc) => doc.fields.some((field) => field.status === "pending") && !doc.committedAt);
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "هوش سند", "Document intelligence")}</h1>
          <p className="lede">
            {L(locale, "استخراج قاعده‌ای است و تا تأیید انسان در پرونده رسمی نمی‌نشیند. روش و اطمینان روی هر فیلد نوشته شده.", "Extraction is rule-based and does not enter the official record until a person approves it. Method and confidence are on every field.")}
          </p>
        </div>
      </header>
      <p className="note">{L(locale, "سند خارج از مجوز این نشست", "Documents withheld from this session")}: <b className="num">{withheld}</b></p>
      <section className="panel">
        <h2>{L(locale, "صف تأیید", "Verification queue")}</h2>
        {queue.length === 0 ? <p className="muted">{L(locale, "مورد بازی در صف این نشست نیست.", "Nothing is waiting in this session.")}</p> : queue.map((doc) => (
          <p key={doc.id}>
            <Link href={`/documents/${doc.id}`}>{locale === "fa" ? doc.titleFa : doc.titleEn}</Link>{" "}
            <span className="badge watch">{doc.fields.filter((field) => field.status === "pending").length}</span>{" "}
            <span className="num">{doc.engine?.serialNumber}</span> · {classLabel(doc.docClass, locale)}
          </p>
        ))}
      </section>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{L(locale, "سند", "Document")}</th>
              <th>ESN</th>
              <th>{L(locale, "دسته", "Class")}</th>
              <th>{L(locale, "دسترسی", "Access")}</th>
              <th>{L(locale, "روش", "Method")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((doc) => (
              <tr key={doc.id}>
                <td><Link href={`/documents/${doc.id}`}>{locale === "fa" ? doc.titleFa : doc.titleEn}</Link><div className="note">{fmtDate(doc.uploadedAt)}</div></td>
                <td className="num">{doc.engine?.serialNumber ?? "—"}</td>
                <td>{classLabel(doc.docClass, locale)}</td>
                <td>{doc.visibility}</td>
                <td className="num">{doc.methodNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {can(persona, null, "upload") || engines.some((engine) => can(persona, engine, "upload")) ? (
        <form action={uploadDocument} className="panel form-grid">
          <h2 className="wide">{L(locale, "بارگذاری PDF یا متن", "Upload a PDF or text file")}</h2>
          <label>{L(locale, "موتور", "Engine")}
            <select name="engineId">{engines.map((engine) => <option key={engine.id} value={engine.id}>{engine.serialNumber}</option>)}</select>
          </label>
          <label>{L(locale, "دسترسی", "Visibility")}
            <select name="visibility">{allowedVisibility(persona).map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label className="wide">{L(locale, "فایل", "File")}<input name="file" type="file" accept=".pdf,.txt,text/plain,application/pdf" required /></label>
          <button className="btn" type="submit">{L(locale, "استخراج", "Extract")}</button>
        </form>
      ) : null}
    </div>
  );
}
