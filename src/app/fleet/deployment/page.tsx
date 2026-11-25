import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { L } from "@/lib/i18n";
import { listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function FleetDeploymentPage({
  searchParams,
}: {
  searchParams: Promise<{ engine?: string }>;
}) {
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const selected = rows.find((row) => row.engine.id === sp.engine) ?? null;
  const open = selected?.engine.installations.find((item) => item.removedAt == null) ?? null;
  const movements = selected
    ? selected.engine.installations.flatMap((item) => [item.installedAt, item.removedAt].filter((value): value is Date => value != null))
    : [];
  const lastMove = movements.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const fields: { key: string; fa: string; en: string; value: string }[] = [
    { key: "place", fa: "کشور و شهر محل استقرار", en: "Country and city", value: "" },
    { key: "airport", fa: "فرودگاه محل استقرار", en: "Airport", value: "" },
    { key: "serial", fa: "سریال تقریبی", en: "Approximate serial", value: "" },
    { key: "store", fa: "موقعیت انبار", en: "Storage location", value: "" },
    { key: "aircraft", fa: "هواپیمای محل نصب", en: "Installed aircraft", value: open ? open.aircraft.typeName : "" },
    { key: "registration", fa: "رجیستر هواپیما محل نصب", en: "Aircraft registration", value: open ? open.aircraft.registration : "" },
    { key: "transport", fa: "وضعیت حمل و نقل موتور", en: "Engine transport status", value: "" },
    { key: "arrived", fa: "تاریخ ورود به محل فعلی", en: "Date arrived at the current place", value: open ? fmtDate(open.installedAt) : "" },
    { key: "moved", fa: "تاریخ آخرین جابجایی", en: "Date of the last move", value: lastMove ? fmtDate(lastMove) : "" },
  ];

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "وضعیت استقرار و تخصیص موتورها", "Fleet Deployment")}</h1>
          <p className="lede">
            {L(
              locale,
              "اول شماره سریال را از فهرست انتخاب کنید. کشور، شهر، فرودگاه، انبار، سریال تقریبی، و وضعیت حمل‌ونقل در داده نیست و خالی می‌ماند.",
              "Choose a serial from the list first. Country, city, airport, storage, approximate serial, and transport status are not stored and stay blank.",
            )}
          </p>
        </div>
        <details className="serial-menu" open data-serial-menu="deployment">
          <summary>{L(locale, "شماره سریال موتور", "Engine serial number")}</summary>
          <div>
            {rows.map((row) => (
              <Link key={row.engine.id} href={`/fleet/deployment?engine=${row.engine.id}`} data-pick={row.engine.serialNumber}>
                {row.engine.serialNumber}
              </Link>
            ))}
          </div>
        </details>
      </header>
      {selected ? (
        <section className="fleet-boxes" data-deploy={selected.engine.serialNumber}>
          {fields.map((field) => (
            <article key={field.key} className="panel stat fleet-box" data-field={field.key}>
              <span>{field.fa}</span>
              <span className="en">{field.en}</span>
              <b className="num">{field.value}</b>
            </article>
          ))}
        </section>
      ) : (
        <p className="muted">{L(locale, "موتوری انتخاب نشده است.", "No engine is selected.")}</p>
      )}
    </div>
  );
}
