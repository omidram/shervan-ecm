import { fmtDate } from "@/lib/format";
import { L } from "@/lib/i18n";
import { listAudit } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function AuditPage() {
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listAudit(persona);
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{locale === "fa" ? persona.nameFa : persona.nameEn}</p>
          <h1>{L(locale, "ممیزی", "Audit log")}</h1>
          <p className="lede">{L(locale, "تغییرهای حساس: وضعیت، مالکیت، تأیید سابقه، سند، برنامه تعمیر و قطعات.", "Sensitive changes: status, ownership, record verification, documents, maintenance plans, and parts.")}</p>
        </div>
      </header>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{L(locale, "زمان", "When")}</th>
              <th>{L(locale, "عمل", "Action")}</th>
              <th>{L(locale, "عامل", "Actor")}</th>
              <th>{L(locale, "شرح", "Summary")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="num">{fmtDate(row.at)}</td>
                <td className="num">{row.action}</td>
                <td>{row.actor}<div className="note">{row.actorRole}</div></td>
                <td>{locale === "fa" ? row.summaryFa : row.summaryEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
