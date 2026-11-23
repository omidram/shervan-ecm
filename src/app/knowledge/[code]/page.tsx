import { notFound } from "next/navigation";
import { PlanningBanner } from "@/components/ui";
import { ensureDatabase } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function ModelKnowledgePage({ params }: { params: Promise<{ code: string }> }) {
  await ensureDatabase();
  const { code } = await params;
  const locale = await getLocale();
  const model = await prisma.engineModel.findUnique({
    where: { code: decodeURIComponent(code) },
    include: {
      family: true,
      modules: { orderBy: { sortOrder: "asc" } },
      baselines: true,
      limitBands: true,
      failureModes: true,
    },
  });
  if (!model) notFound();
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{model.family.manufacturer}</p>
          <h1 className="num">{model.code}</h1>
          <p className="lede">{model.note}</p>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      <section className="panel">
        <h2>{L(locale, "درخت ماژول", "Module tree")}</h2>
        <p>{L(locale, "توربوفن دو محوره: فن یک‌طبقه، LPC سه‌طبقه، HPC نه‌طبقه، محفظه حلقوی، HPT یک‌طبقه، LPT چهارطبقه، جعبه‌دنده ملحقات و روغن.", "Two-spool turbofan: 1-stage fan, 3-stage LPC, 9-stage HPC, annular combustor, 1-stage HPT, 4-stage LPT, accessory gearbox and oil system.")}</p>
        {model.modules.map((mod) => (
          <div className="pair" key={mod.id}>
            <b>{mod.code} · {locale === "fa" ? mod.nameFa : mod.name}</b>
            <span>{mod.stageNote}</span>
          </div>
        ))}
      </section>
      <section className="panel table-wrap">
        <h2>{L(locale, "خط مبنای عملکرد در کروز مطالعاتی", "Performance baseline at the study cruise point")}</h2>
        <table>
          <thead>
            <tr><th>{L(locale, "پارامتر", "Parameter")}</th><th>{L(locale, "مرجع", "Reference")}</th><th>/1000 ft</th><th>/°C OAT</th><th>/thrust %</th></tr>
          </thead>
          <tbody>
            {model.baselines.map((row) => (
              <tr key={row.id}>
                <td>{row.parameter} <span className="note">{row.unit}</span></td>
                <td className="num">{fmtNum(row.refValue, 2)}</td>
                <td className="num">{fmtNum(row.per1000Ft, 3)}</td>
                <td className="num">{fmtNum(row.perDegOat, 3)}</td>
                <td className="num">{fmtNum(row.perThrustPct, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">{model.baselines[0]?.note} Alt {model.baselines[0]?.refAltitudeFt} ft, OAT {model.baselines[0]?.refOatC} °C, thrust {model.baselines[0]?.refThrustPct}%.</p>
      </section>
      <section className="panel table-wrap">
        <h2>{L(locale, "باندهای مدل سلامت", "Health-model bands")}</h2>
        <table>
          <thead>
            <tr><th>{L(locale, "پارامتر", "Parameter")}</th><th>{L(locale, "نامی از", "Nominal min")}</th><th>{L(locale, "نامی تا", "Nominal max")}</th><th>{L(locale, "هشدار از", "Alert min")}</th><th>{L(locale, "هشدار تا", "Alert max")}</th></tr>
          </thead>
          <tbody>
            {model.limitBands.map((row) => (
              <tr key={row.id}>
                <td>{row.parameter}</td>
                <td className="num">{row.nominalMin ?? "—"}</td>
                <td className="num">{row.nominalMax ?? "—"}</td>
                <td className="num">{row.alertMin ?? "—"}</td>
                <td className="num">{row.alertMax ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="stack">
        <h2>{L(locale, "کتابخانه حالت خرابی", "Failure-mode library")}</h2>
        {model.failureModes.map((mode) => (
          <article key={mode.id} className="panel">
            <h3>{mode.moduleCode} · {locale === "fa" ? mode.nameFa : mode.name}</h3>
            <p>{locale === "fa" ? mode.summaryFa : mode.summaryEn}</p>
            <p className="note">{mode.indicators}</p>
            <p><b>{L(locale, "تأیید", "Confirm")}: </b>{locale === "fa" ? mode.confirmFa : mode.confirmEn}</p>
            <p><b>{L(locale, "رفع", "Clear")}: </b>{locale === "fa" ? mode.clearFa : mode.clearEn}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
