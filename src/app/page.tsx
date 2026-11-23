import Link from "next/link";
import { EnginePick } from "@/components/engine-pick";
import { Dial, RingGauge } from "@/components/instruments";
import { IndexChart } from "@/components/trend-chart";
import { PlanningBanner } from "@/components/ui";
import { referenceAt } from "@/lib/assess";
import { fmtDate, fmtNum } from "@/lib/format";
import { L, statusTone } from "@/lib/i18n";
import { DESK_MODULES } from "@/lib/modules";
import { listBoard, listEngines } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function CommandHome({ searchParams }: { searchParams: Promise<{ engine?: string }> }) {
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const rows = await listEngines(persona);
  const picked = rows.find((row) => row.engine.id === sp.engine) ?? rows.find((row) => row.engine.hero) ?? rows[0];
  if (!picked) return <p>{L(locale, "موتوری در این نشست نیست.", "No engine in this session.")}</p>;
  const board = await listBoard(persona, picked.engine.id);
  const openAlerts = board.items.filter((item) => item.domain === "alert" && !item.ackedAt);
  const latest = picked.assessment.latest;
  const inService = rows.filter((row) => row.engine.status === "In Service" || row.engine.status === "Active").length;
  const inShop = rows.filter((row) => row.engine.status === "Under Maintenance").length;
  const openFaults = rows.reduce((sum, row) => sum + row.assessment.faults.filter((fault) => fault.reported).length, 0);
  const samples = picked.engine.samples;
  const windowSamples = samples.slice(-8);
  const hiPoints = windowSamples.map((sample) => {
    const base = picked.engine.model.baselines.find((item) => item.parameter === "egtMargin");
    const ref = base ? referenceAt(base, sample) : sample.egtMargin;
    const hi = Math.round(Math.max(30, Math.min(98, 100 - Math.max(0, ref - sample.egtMargin) * 1.15)));
    return { t: fmtDate(sample.recordedAt), hi };
  });
  const plan = picked.engine.plans[0];
  const tileValue = (domain: string) => {
    const related = board.items.filter((item) => item.domain === domain);
    if (domain === "alert") return String(openAlerts.length);
    if (domain === "llp") {
      const worst = picked.assessment.llp.slice().sort((a, b) => a.remainingPct - b.remainingPct)[0];
      return worst ? `${fmtNum(worst.remainingPct, 0)}%` : "—";
    }
    if (domain === "directive") return String(related.filter((item) => item.status === "open" || item.status === "overdue").length);
    if (domain === "kit") return String(related.filter((item) => (item.qtyStock ?? 0) < (item.qtyNeed ?? 0)).length);
    if (domain === "testcell") return related[0]?.status ?? "—";
    if (domain === "vibration") {
      const loud = related.filter((item) => item.code === "fan-1rev" || item.code === "core-1rev").reduce((max, item) => Math.max(max, item.value ?? 0), 0);
      return loud ? fmtNum(loud, 2) : "—";
    }
    if (domain === "oil") {
      const use = related.find((item) => item.code === "consumption");
      return use?.value == null ? "—" : fmtNum(use.value, 2);
    }
    if (domain === "borescope") return String(related.filter((item) => item.status === "open").length || related.length);
    if (domain === "exceedance") return String(related.filter((item) => item.status === "watch" || item.status === "alert").length);
    if (domain === "workscope") return String(related.filter((item) => item.code.startsWith("task") || item.status === "in_work" || item.status === "planned").length || related.length);
    return "—";
  };
  const q = `engine=${picked.engine.id}`;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "میز فرمان", "Command desk")}</h1>
          <p className="lede">
            {L(
              locale,
              `${rows.length} موتور در این نشست · ${inService} در خدمت · ${inShop} در تعمیر · ${openFaults} عیب باز`,
              `${rows.length} engines in this session · ${inService} in service · ${inShop} in shop · ${openFaults} open faults`,
            )}
          </p>
        </div>
        <EnginePick
          label={L(locale, "موتور", "Engine")}
          value={picked.engine.id}
          engines={rows.map((row) => ({ id: row.engine.id, serialNumber: row.engine.serialNumber, model: row.engine.model.code }))}
        />
      </header>
      <PlanningBanner locale={locale} />
      <section className="plate desk-plate">
        <div>
          <p className="kicker">{picked.engine.model.code}</p>
          <h2 className="esn num">{picked.engine.serialNumber}</h2>
          <p>
            <span className={`pill ${statusTone(picked.engine.status)}`}>{picked.engine.status}</span>{" "}
            {locale === "fa" ? picked.engine.owner.nameFa : picked.engine.owner.name}
          </p>
        </div>
        <div className="desk-life">
          <span>TSN <b className="num">{fmtNum(picked.assessment.life.tsn, 0)}</b></span>
          <span>CSN <b className="num">{fmtNum(picked.assessment.life.csn, 0)}</b></span>
          <span>HI <b className="num">{picked.assessment.engineHealth ?? "—"}</b></span>
          <Link className="btn" href={`/engines/${picked.engine.id}`}>{L(locale, "شناسنامه", "Passport")}</Link>
        </div>
      </section>
      <section className="dial-row" dir="ltr">
        <Dial label="EGT Margin" value={latest?.egtMargin ?? null} unit="°C" min={20} max={90} />
        <Dial label="N1" value={latest?.n1 ?? null} unit="%" min={70} max={100} />
        <Dial label="N2" value={latest?.n2 ?? null} unit="%" min={80} max={104} />
        <Dial label="Fuel flow" value={latest?.fuelFlow ?? null} unit="kg/h" min={900} max={1700} higherIsBetter={false} />
        <Dial label="Oil P" value={latest?.oilPressure ?? null} unit="psi" min={20} max={80} />
        <Dial label="Oil T" value={latest?.oilTemp ?? null} unit="°C" min={60} max={140} higherIsBetter={false} />
        <Dial label="Vibration" value={latest ? Math.max(latest.vibFan, latest.vibCore) : null} unit="ips" min={0} max={2} higherIsBetter={false} />
      </section>
      <div className="grid-2">
        <section className="panel">
          <h2>{L(locale, "سلامت ماژول", "Module health")}</h2>
          <div className="ring-row">
            {picked.assessment.modules.map((mod) => (
              <Link key={mod.code} href={`/engines/${picked.engine.id}/gas-path?m=${mod.code}`}>
                <RingGauge value={mod.healthIndex} label={mod.code} caption={locale === "fa" ? mod.nameFa : mod.name} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="page-head">
            <h2>{L(locale, "هشدار باز", "Open alerts")}</h2>
            <Link href={`/m/alert?${q}`}>{L(locale, "همه", "All")}</Link>
          </div>
          {openAlerts.length === 0 ? <p className="muted">—</p> : openAlerts.map((item) => (
            <Link key={item.id} className={`alert-line ${item.severity}`} href={item.evidence || `/m/alert?${q}&item=${item.id}`}>
              <b>{locale === "fa" ? item.titleFa : item.titleEn}</b>
              <span>{item.moduleCode}{item.value != null ? ` · ${fmtNum(item.value, item.value < 10 ? 2 : 0)}` : ""}</span>
            </Link>
          ))}
        </section>
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="page-head">
            <h2>{L(locale, "بازه عمر باقیمانده", "Remaining-life range")}</h2>
            <Link href={`/engines/${picked.engine.id}/prognostics`}>{L(locale, "جزئیات", "Detail")}</Link>
          </div>
          {picked.assessment.rul.length === 0 ? <p className="muted">{L(locale, "بازه تنگ‌شده‌ای نیست.", "No narrowed range.")}</p> : (
            <div className="ring-row">
              {picked.assessment.rul.map((rul) => (
                <Link key={rul.moduleCode} href={`/engines/${picked.engine.id}/prognostics`}>
                  <RingGauge
                    value={Math.round(rul.confidence * 100)}
                    text={fmtNum(rul.hoursLow, 0)}
                    label={rul.moduleCode}
                    caption={`${fmtNum(rul.hoursLow, 0)}–${fmtNum(rul.hoursHigh, 0)} h`}
                  />
                </Link>
              ))}
            </div>
          )}
          <p className="note">{L(locale, "عدد وسط کران پایین ساعت است. حلقه اطمینان است، نه ساعت خرابی.", "The center number is the low hour bound. The ring is confidence, not a failure hour.")}</p>
        </section>
        <section className="panel">
          <h2>{L(locale, "شاخص سلامت، پنجره اخیر", "Health index, recent window")}</h2>
          <IndexChart points={hiPoints} />
          <p className="note">{L(locale, "از مانده EGT Margin در نمونه‌های کروز همین پنجره ساخته شده، نه از یک مدل عصبی.", "Built from the EGT Margin residual of the cruise samples in this window, not from a neural model.")}</p>
        </section>
      </div>
      <section className="panel">
        <div className="page-head">
          <h2>{L(locale, "پیش‌بینی تعمیر", "Maintenance forecast")}</h2>
          <Link href={plan ? `/engines/${picked.engine.id}/plan` : `/m/workscope?${q}`}>{L(locale, "برنامه", "Plan")}</Link>
        </div>
        {plan ? (
          <div className="pair">
            <span>{locale === "fa" ? plan.titleFa : plan.titleEn}</span>
            <b className="num">{fmtDate(plan.inductionAt)} · {plan.status}</b>
          </div>
        ) : (
          <p className="muted">{L(locale, "برنامه بازی برای این موتور نیست.", "No open plan for this engine.")}</p>
        )}
        <p className="note">{plan ? (locale === "fa" ? plan.rationaleFa : plan.rationaleEn) : ""}</p>
      </section>
      <section className="tile-grid">
        {DESK_MODULES.map((mod) => (
          <Link key={mod.domain} className="tile" href={`${mod.href}?${q}`}>
            <span>{locale === "fa" ? mod.fa : mod.en}</span>
            <b className="num">{tileValue(mod.domain)}</b>
          </Link>
        ))}
        <Link className="tile" href={`/engines/${picked.engine.id}/gas-path?m=HPC`}>
          <span>{L(locale, "مسیر گاز", "Gas path")}</span>
          <b className="num">{picked.assessment.modules.find((mod) => mod.code === "HPC")?.healthIndex ?? "—"}</b>
        </Link>
        <Link className="tile" href={`/engines/${picked.engine.id}/faults`}>
          <span>{L(locale, "عیب", "Faults")}</span>
          <b className="num">{picked.assessment.faults.filter((fault) => fault.reported).length}</b>
        </Link>
        <Link className="tile" href={`/engines/${picked.engine.id}/performance?p=egtMargin`}>
          <span>EGT Δ</span>
          <b className="num">{fmtNum(picked.assessment.deltas.egtMargin, 1)}</b>
        </Link>
        <Link className="tile" href="/reports"><span>{L(locale, "گزارش", "Reports")}</span><b>PDF</b></Link>
        <Link className="tile" href="/audit"><span>{L(locale, "ممیزی", "Audit")}</span><b>→</b></Link>
      </section>
    </div>
  );
}
