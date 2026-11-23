import Link from "next/link";
import { PlanningBanner } from "@/components/ui";
import { ensureDatabase } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { L } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function KnowledgePage() {
  await ensureDatabase();
  const locale = await getLocale();
  const models = await prisma.engineModel.findMany({ include: { family: true, modules: true }, orderBy: { code: "asc" } });
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{L(locale, "مرجع مهندسی", "Engineering reference")}</p>
          <h1>{L(locale, "دانش فنی", "Technical knowledge")}</h1>
          <p className="lede">{L(locale, "درخت ماژول، خط مبنای عملکرد و باندهای مدل سلامت برای CFM56-7B و CFM56-5B. این‌ها حد کنترل‌شده سازنده نیستند.", "Module tree, performance baselines, and the health-model bands for the CFM56-7B and CFM56-5B. These are not controlled OEM limits.")}</p>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      <section className="grid-2">
        {models.map((model) => (
          <article key={model.id} className="panel">
            <p className="kicker">{model.family.manufacturer}</p>
            <h2 className="num">{model.code}</h2>
            <p>{model.note}</p>
            <p className="num">{model.thrustLbf.toLocaleString("en-US")} lbf · BPR {model.bypassRatio} · fan {model.fanDiameterIn} in · OPR {model.opr} · {model.spoolCount}-spool</p>
            <p>{model.modules.map((mod) => mod.code).join(" · ")}</p>
            <Link className="btn" href={`/knowledge/${model.code}`}>{L(locale, "مدل مرجع", "Reference model")}</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
