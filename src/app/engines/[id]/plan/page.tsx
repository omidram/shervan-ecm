import Link from "next/link";
import { notFound } from "next/navigation";
import { closePlan } from "@/app/actions";
import { PlanningBanner, Num } from "@/components/ui";
import { can } from "@/lib/access";
import { prisma } from "@/lib/db";
import { fmtDate, fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

type PlanPart = { partNumber: string; nameFa: string; nameEn: string; qty: number; moduleCode: string };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const found = await getEngine(id, persona);
  if (!found) notFound();
  const plan = found.engine.plans[0];
  const parts: PlanPart[] = plan ? JSON.parse(plan.partsJson) : [];
  const stock = plan?.mroOrgId
    ? await prisma.inventoryItem.findMany({ where: { orgId: plan.mroOrgId, partNumber: { in: parts.map((part) => part.partNumber) } } })
    : [];
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{found.engine.serialNumber}</p>
          <h1>{L(locale, "برنامه تعمیر پیش‌بینانه", "Predictive maintenance plan")}</h1>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      {!plan ? <p className="panel">{L(locale, "برای این موتور برنامه بازی نیست.", "No open plan for this engine.")}</p> : (
        <article className="panel stack" data-plan={plan.status}>
          <div className="page-head">
            <h2>{locale === "fa" ? plan.titleFa : plan.titleEn}</h2>
            <span className={`badge ${plan.status === "proposed" ? "watch" : "good"}`}>{plan.status}</span>
          </div>
          <div className="grid-3">
            <div className="gauge"><span>{L(locale, "پنجره", "Window")}</span><b className="num">{fmtDate(plan.windowStart)} → {fmtDate(plan.windowEnd)}</b></div>
            <div className="gauge"><span>{L(locale, "القای پیشنهادی", "Suggested induction")}</span><b className="num">{fmtDate(plan.inductionAt)}</b></div>
            <div className="gauge"><span>{L(locale, "باند هزینه", "Cost band")}</span><b className="num">{fmtNum(plan.costLow, 0)}–{fmtNum(plan.costHigh, 0)} {plan.currency}</b></div>
          </div>
          <p>{locale === "fa" ? plan.rationaleFa : plan.rationaleEn}</p>
          <h3>{plan.moduleCode}</h3>
          <p>{locale === "fa" ? plan.slotNoteFa : plan.slotNoteEn}</p>
          <p><b>{L(locale, "مهارت", "Skills")}: </b>{locale === "fa" ? plan.skillsFa : plan.skillsEn}</p>
          <p className="note">{L(locale, "مرکز", "Shop")}: {plan.mro ? (locale === "fa" ? plan.mro.nameFa : plan.mro.name) : "—"} · {L(locale, "زمان روی زمین", "Ground time")} <Num>{plan.groundTimeDays}</Num> {L(locale, "روز", "days")}</p>
          <h3>{L(locale, "قطعات نامزد و موجودی", "Candidate parts and stock")}</h3>
          <table>
            <thead>
              <tr>
                <th>P/N</th>
                <th>{L(locale, "نام", "Name")}</th>
                <th>{L(locale, "نیاز", "Need")}</th>
                <th>{L(locale, "موجود", "On hand")}</th>
                <th>{L(locale, "رزرو", "Reserved")}</th>
                <th>{L(locale, "کسری", "Short")}</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const item = stock.find((row) => row.partNumber === part.partNumber);
                const onHand = item?.qtyOnHand ?? 0;
                const reserved = item?.qtyReserved ?? 0;
                const short = Math.max(0, part.qty - (onHand - reserved));
                return (
                  <tr key={part.partNumber}>
                    <td className="num">{part.partNumber}</td>
                    <td>{locale === "fa" ? part.nameFa : part.nameEn}</td>
                    <td className="num">{part.qty}</td>
                    <td className="num">{onHand}</td>
                    <td className="num">{reserved}</td>
                    <td className="num">{short}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {plan.status === "closed" && plan.closedRecordId ? (
            <p><Link href={`/engines/${found.engine.id}/maintenance`}>{L(locale, "رویداد در شناسنامه نوشته شد.", "The event is on the passport.")}</Link></p>
          ) : null}
          {plan.status === "proposed" && can(persona, found.engine, "plan") ? (
            <form action={closePlan} className="stack">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="engineId" value={found.engine.id} />
              <label>
                <input type="checkbox" name="ack" required />{" "}
                {L(locale, "می‌دانم این تصمیم صلاحیت پروازی نیست و با بستن برنامه یک سابقه تعمیر در پرونده می‌نشیند.", "I understand this is not an airworthiness decision and closing the plan writes a maintenance record.")}
              </label>
              <button className="btn" type="submit">{L(locale, "بستن برنامه و نوشتن در پرونده", "Close plan and write to the passport")}</button>
            </form>
          ) : null}
        </article>
      )}
    </div>
  );
}
