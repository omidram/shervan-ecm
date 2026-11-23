import Link from "next/link";
import { notFound } from "next/navigation";
import { commitExtraction, setFieldStatus } from "@/app/actions";
import { Flash, Num } from "@/components/ui";
import { can } from "@/lib/access";
import { classLabel } from "@/lib/extract";
import { fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getDocument } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const doc = await getDocument(id, persona);
  if (!doc) notFound();
  const writable = doc.engine ? can(persona, doc.engine, "extract") && !doc.committedAt : false;
  return (
    <div className="stack">
      <Flash locale={locale} ok={sp.ok} err={sp.err} />
      <header className="page-head">
        <div>
          <p className="kicker">{classLabel(doc.docClass, locale)} · {doc.visibility}</p>
          <h1>{locale === "fa" ? doc.titleFa : doc.titleEn}</h1>
          <p className="lede">
            {doc.engine ? <Link href={`/engines/${doc.engine.id}`}><Num>{doc.engine.serialNumber}</Num></Link> : null}
            {" · "}{doc.methodNote}
          </p>
        </div>
      </header>
      {doc.fields.length ? (
        <section className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>{L(locale, "فیلد", "Field")}</th>
                <th>{L(locale, "مقدار", "Value")}</th>
                <th>{L(locale, "اطمینان", "Confidence")}</th>
                <th>{L(locale, "صفحه", "Page")}</th>
                <th>{L(locale, "روش", "Method")}</th>
                <th>{L(locale, "وضعیت", "Status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {doc.fields.map((field) => (
                <tr key={field.id}>
                  <td>{locale === "fa" ? field.labelFa : field.labelEn}</td>
                  <td className="num">{field.value}</td>
                  <td className="num">{fmtNum(field.confidence * 100, 0)}%</td>
                  <td className="num">{field.page}</td>
                  <td className="num">{field.method}</td>
                  <td>{field.status}</td>
                  <td>
                    {writable ? (
                      <form action={setFieldStatus} className="session">
                        <input type="hidden" name="documentId" value={doc.id} />
                        <input type="hidden" name="fieldId" value={field.id} />
                        <button className="btn" name="status" value="approved" type="submit">{L(locale, "تأیید", "Approve")}</button>
                        <button className="btn ghost" name="status" value="rejected" type="submit">{L(locale, "رد", "Reject")}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {writable ? (
            <form action={commitExtraction}>
              <input type="hidden" name="documentId" value={doc.id} />
              <button className="btn" type="submit">{L(locale, "نشاندن فیلدهای تأییدشده در پرونده", "Commit approved fields")}</button>
            </form>
          ) : null}
          {doc.committedAt ? <p className="note">{L(locale, "این سند قبلاً به پرونده نشسته است.", "This document was already committed.")}</p> : null}
        </section>
      ) : null}
      <pre className="doc">{doc.bodyText}</pre>
    </div>
  );
}
