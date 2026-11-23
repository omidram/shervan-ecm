import Link from "next/link";
import { notFound } from "next/navigation";
import { TrendChart } from "@/components/trend-chart";
import { PlanningBanner } from "@/components/ui";
import { referenceAt, bandOf, type SampleRow } from "@/lib/assess";
import { fmtDate, fmtNum } from "@/lib/format";
import { L, PARAMETERS, parameterMeta, type ParameterId } from "@/lib/i18n";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function PerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const found = await getEngine(id, persona);
  if (!found) notFound();
  const param = (PARAMETERS.some((item) => item.id === sp.p) ? sp.p : "egtMargin") as ParameterId;
  const meta = parameterMeta(param);
  const baseline = found.engine.model.baselines.find((row) => row.parameter === param);
  const band = found.engine.model.limitBands.find((row) => row.parameter === param);
  const points = found.engine.samples.map((sample) => ({
    t: sample.recordedAt,
    measured: sample[param],
    reference: baseline ? referenceAt(baseline, sample as SampleRow) : sample[param],
    altitudeFt: sample.altitudeFt,
    oatC: sample.oatC,
    thrustPct: sample.thrustPct,
  }));
  const latest = points.at(-1);
  const tone = latest && band ? bandOf(latest.measured, band) : "unknown";
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{found.engine.serialNumber}</p>
          <h1>{meta.en}</h1>
          <p className="lede">
            {L(locale, "خط چین، مرجع تصحیح‌شده با ارتفاع، دمای محیط و تراست است. خط پر، مقدار ثبت‌شده است. مقایسه با یک خط قرمز ثابت نیست.", "The dashed line is the reference corrected for altitude, OAT, and thrust. The solid line is the recorded value. This is not a single fixed redline.")}
          </p>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      <div className="filters">
        {PARAMETERS.map((item) => (
          <Link key={item.id} className={item.id === param ? "btn" : "btn ghost"} href={`/engines/${id}/performance?p=${item.id}`}>{item.en}</Link>
        ))}
      </div>
      <section className="panel">
        <div className="legend-row">
          <span><i className="swatch" style={{ background: "var(--amber)" }} /> {L(locale, "ثبت‌شده", "Measured")}</span>
          <span><i className="swatch" style={{ background: "var(--cyan)" }} /> {L(locale, "مرجع شرایط", "Condition reference")}</span>
          {latest ? <span className={`badge ${tone === "alert" ? "bad" : tone === "watch" ? "watch" : tone === "nominal" ? "good" : "info"}`}>{tone}</span> : null}
        </div>
        <TrendChart points={points} unit={meta.unit} />
        {latest ? (
          <div className="grid-4">
            <div className="gauge"><span>{L(locale, "آخرین", "Latest")}</span><b className="num">{fmtNum(latest.measured, 2)} {meta.unit}</b></div>
            <div className="gauge"><span>{L(locale, "مرجع", "Reference")}</span><b className="num">{fmtNum(latest.reference, 2)}</b></div>
            <div className="gauge"><span>Delta</span><b className="num">{fmtNum(latest.measured - latest.reference, 2)}</b></div>
            <div className="gauge"><span>Alt / OAT / thrust</span><b className="num">{fmtNum(latest.altitudeFt, 0)} / {fmtNum(latest.oatC, 0)} / {fmtNum(latest.thrustPct, 0)}</b></div>
          </div>
        ) : <p className="muted">{L(locale, "نمونه عملکرد کافی نیست.", "Not enough performance samples.")}</p>}
      </section>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{L(locale, "تاریخ", "Date")}</th>
              <th>{L(locale, "ثبت", "Measured")}</th>
              <th>{L(locale, "مرجع", "Reference")}</th>
              <th>Delta</th>
              <th>Alt</th>
              <th>OAT</th>
              <th>Thrust %</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(-12).reverse().map((point) => (
              <tr key={point.t.toISOString()}>
                <td className="num">{fmtDate(point.t)}</td>
                <td className="num">{fmtNum(point.measured, 2)}</td>
                <td className="num">{fmtNum(point.reference, 2)}</td>
                <td className="num">{fmtNum(point.measured - point.reference, 2)}</td>
                <td className="num">{fmtNum(point.altitudeFt, 0)}</td>
                <td className="num">{fmtNum(point.oatC, 0)}</td>
                <td className="num">{fmtNum(point.thrustPct, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
