import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanningBanner } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/format";
import { L } from "@/lib/i18n";
import { findLeaf } from "@/lib/nav-menu";
import { prisma } from "@/lib/db";
import { engineWhere } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function SectionPage({ params }: { params: Promise<{ module: string; slug: string }> }) {
  const { module: groupId, slug } = await params;
  const found = findLeaf(groupId, slug);
  if (!found || found.leaf.to) notFound();
  const { group, leaf } = found;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const engines = await prisma.engine.findMany({
    where: engineWhere(persona),
    include: {
      model: true,
      owner: true,
      operator: true,
      statusEvents: { orderBy: { eventAt: "desc" }, take: 8 },
      transfers: { include: { fromOrg: true, toOrg: true }, orderBy: { transferredAt: "desc" }, take: 8 },
      installations: { include: { aircraft: true }, orderBy: { installedAt: "desc" }, take: 8 },
      utilization: { orderBy: { eventAt: "desc" }, take: 12 },
      samples: { orderBy: { recordedAt: "desc" }, take: 1 },
      dispositions: { orderBy: { at: "desc" }, take: 12 },
      compInstalls: { include: { component: true }, orderBy: { installedAt: "desc" }, take: 16 },
      records: { orderBy: { performedAt: "desc" }, take: 16 },
      plans: { orderBy: { windowStart: "desc" }, take: 8 },
      documents: { orderBy: { uploadedAt: "desc" }, take: 12 },
    },
    orderBy: { serialNumber: "asc" },
  });
  const ids = engines.map((engine) => engine.id);
  const org = await prisma.organization.findUnique({ where: { id: persona.orgId }, include: { users: { orderBy: { username: "asc" } } } });
  const users = persona.job === "super"
    ? await prisma.appUser.findMany({ include: { org: true }, orderBy: { username: "asc" }, take: 24 })
    : org?.users ?? [];
  const audit = await prisma.auditLog.findMany({
    where: persona.job === "super" ? {} : { OR: [{ orgId: persona.orgId }, { engineId: { in: ids } }] },
    orderBy: { at: "desc" },
    take: 12,
  });
  const fields = await prisma.extractionField.findMany({
    where: { document: { OR: [{ ownerOrgId: persona.orgId }, { engineId: { in: ids } }] } },
    include: { document: true },
    take: 16,
  });
  const rows = rowsFor(leaf.view ?? "none", leaf.recordType, leaf.released, { engines, users, audit, fields, locale, orgName: locale === "fa" ? persona.orgFa : persona.orgEn, org });

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{locale === "fa" ? group.en : group.fa}</p>
          <h1>{locale === "fa" ? leaf.fa : leaf.en}</h1>
          <p className="lede">{locale === "fa" ? leaf.en : leaf.fa}</p>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      {leaf.noteFa ? <p className="note">{locale === "fa" ? leaf.noteFa : leaf.noteEn}</p> : null}
      {leaf.view === "parameters" ? (
        <section className="panel">
          <h2>{L(locale, "میزهای موجود", "Desks already in the product")}</h2>
          <div className="plate-calls">
            <Link className="btn ghost" href={engines[0] ? `/engines/${engines[0].id}/gas-path` : "/fleet"}>{L(locale, "مسیر گاز", "Gas path")}</Link>
            <Link className="btn ghost" href="/m/indication">{L(locale, "نمایش موتور", "Indication")}</Link>
            <Link className="btn ghost" href="/m/sensors">{L(locale, "حسگرها", "Sensors")}</Link>
            <Link className="btn ghost" href="/m/fuel">{L(locale, "سوخت", "Fuel")}</Link>
            <Link className="btn ghost" href="/m/start">{L(locale, "استارت", "Start")}</Link>
          </div>
        </section>
      ) : null}
      <section className="panel">
        {rows.length === 0 ? <p className="muted">{L(locale, "برای این شرکت داده‌ای در این بخش ذخیره نشده است.", "Nothing is stored for this company in this section.")}</p> : rows.map((row) => (
          <div className="pair" key={row.key}>
            <span>{row.label}</span>
            <b className="num">{row.value}</b>
          </div>
        ))}
      </section>
    </div>
  );
}

type EngineBundle = {
  id: string;
  serialNumber: string;
  status: string;
  recordGap: boolean;
  gapNoteFa: string;
  gapNoteEn: string;
  model: { code: string };
  owner: { name: string; nameFa: string };
  samples: { n1: number; n2: number; egtMargin: number; fuelFlow: number }[];
  transfers: { id: string; transferredAt: Date; fromOrg: { name: string; nameFa: string } | null; toOrg: { name: string; nameFa: string } }[];
  installations: { id: string; position: string; installedAt: Date; removedAt: Date | null; aircraft: { registration: string } }[];
  utilization: { id: string; kind: string; flightHours: number; flightCycles: number }[];
  statusEvents: { id: string; eventAt: Date; status: string }[];
  compInstalls: { id: string; removedAt: Date | null; component: { serialNumber: string; partNumber: string } }[];
  dispositions: { id: string; modeCode: string; status: string; noteFa: string; noteEn: string }[];
  plans: { id: string; titleFa: string; titleEn: string; windowStart: Date; status: string; costLow: number; costHigh: number; currency: string }[];
  records: { id: string; type: string; titleFa: string; titleEn: string; releasedAt: Date | null }[];
  documents: { id: string; titleFa: string; titleEn: string; docClass: string; uploadedAt: Date }[];
}[];

function rowsFor(
  view: string,
  recordType: string | undefined,
  released: boolean | undefined,
  bag: {
    engines: EngineBundle;
    users: { username: string; displayName: string; job: string; modules: string; org?: { name: string } }[];
    audit: { id: string; at: Date; summaryFa: string; summaryEn: string; action: string }[];
    fields: { id: string; labelFa: string; labelEn: string; value: string; page: number; document: { titleFa: string; titleEn: string } }[];
    locale: "fa" | "en";
    orgName: string;
    org: { name: string; nameFa: string; code: string; kind: string } | null;
  },
) {
  const fa = bag.locale === "fa";
  const line = (key: string, label: string, value: string) => ({ key, label, value });
  if (view === "org" && bag.org) {
    return [
      line("name", fa ? "شرکت" : "Company", fa ? bag.org.nameFa : bag.org.name),
      line("code", fa ? "کد" : "Code", bag.org.code),
      line("kind", fa ? "نوع" : "Kind", bag.org.kind),
      line("users", fa ? "کاربران همین شرکت" : "Users in this company", String(bag.users.length)),
    ];
  }
  if (view === "users") {
    return bag.users.map((user) => line(user.username, user.username, `${user.job} · ${user.modules}`));
  }
  if (view === "audit") {
    return bag.audit.map((item) => line(item.id, fmtDate(item.at), fa ? item.summaryFa : item.summaryEn));
  }
  if (view === "fields") {
    return bag.fields.map((item) => line(item.id, `${fa ? item.document.titleFa : item.document.titleEn} · p.${item.page}`, `${fa ? item.labelFa : item.labelEn}: ${item.value}`));
  }
  if (view === "counts") {
    const hours = bag.engines.reduce((sum, engine) => sum + engine.utilization.reduce((inner, event) => inner + event.flightHours, 0), 0);
    const findings = bag.engines.reduce((sum, engine) => sum + engine.dispositions.length, 0);
    return [
      line("engines", fa ? "موتورهای همین شرکت" : "Engines for this company", String(bag.engines.length)),
      line("samples", fa ? "نمونه ذخیره‌شده" : "Stored samples", String(bag.engines.filter((engine) => engine.samples[0]).length)),
      line("hours", fa ? "ساعت در رویدادهای ذخیره‌شده" : "Hours on stored events", fmtNum(hours, 0)),
      line("findings", fa ? "یافته ذخیره‌شده" : "Stored findings", String(findings)),
    ];
  }
  if (view === "gaps") {
    return bag.engines.map((engine) => line(engine.id, engine.serialNumber, engine.recordGap ? (fa ? engine.gapNoteFa : engine.gapNoteEn) || (fa ? "فاصله در سابقه" : "Record gap") : (fa ? "فاصله ثبت نشده" : "No gap recorded")));
  }
  if (view === "none") return [];
  const out: { key: string; label: string; value: string }[] = [];
  for (const engine of bag.engines) {
    if (view === "engines" || view === "compare" || view === "parameters" || view === "samples") {
      const sample = engine.samples[0];
      const value = view === "engines"
        ? `${engine.model.code} · ${engine.status} · ${fa ? engine.owner.nameFa : engine.owner.name}`
        : sample
          ? `N1 ${fmtNum(sample.n1, 1)} · N2 ${fmtNum(sample.n2, 1)} · EGT Margin ${fmtNum(sample.egtMargin, 1)} · FF ${fmtNum(sample.fuelFlow, 0)}`
          : (fa ? "نمونه نیست" : "No sample");
      out.push(line(engine.id, engine.serialNumber, value));
    }
    if (view === "transfers") {
      for (const item of engine.transfers) out.push(line(item.id, `${engine.serialNumber} · ${fmtDate(item.transferredAt)}`, `${item.fromOrg ? (fa ? item.fromOrg.nameFa : item.fromOrg.name) : "—"} → ${fa ? item.toOrg.nameFa : item.toOrg.name}`));
    }
    if (view === "installs") {
      for (const item of engine.installations) out.push(line(item.id, `${engine.serialNumber} · ${item.aircraft.registration}`, `${item.position} · ${fmtDate(item.installedAt)}${item.removedAt ? ` → ${fmtDate(item.removedAt)}` : ""}`));
    }
    if (view === "utilization") {
      for (const item of engine.utilization) out.push(line(item.id, engine.serialNumber, `${item.kind} · ${fmtNum(item.flightHours, 0)} h · ${fmtNum(item.flightCycles, 0)} cyc`));
    }
    if (view === "status") {
      for (const item of engine.statusEvents) out.push(line(item.id, `${engine.serialNumber} · ${fmtDate(item.eventAt)}`, item.status));
    }
    if (view === "components") {
      for (const item of engine.compInstalls.filter((row) => !row.removedAt)) out.push(line(item.id, item.component.serialNumber, `${item.component.partNumber} · ${engine.serialNumber} · ${fa ? engine.owner.nameFa : engine.owner.name}`));
    }
    if (view === "removals") {
      for (const item of engine.compInstalls.filter((row) => row.removedAt)) out.push(line(item.id, item.component.serialNumber, `${engine.serialNumber} · ${fmtDate(item.removedAt)}`));
    }
    if (view === "faults") {
      for (const item of engine.dispositions) out.push(line(item.id, `${engine.serialNumber} · ${item.modeCode}`, `${item.status} · ${fa ? item.noteFa : item.noteEn}`));
    }
    if (view === "defects") {
      out.push(line(`${engine.id}-def`, engine.serialNumber, String(engine.dispositions.length)));
    }
    if (view === "plans" || view === "cost") {
      for (const item of engine.plans) out.push(line(item.id, `${engine.serialNumber} · ${fa ? item.titleFa : item.titleEn}`, view === "cost" ? `${fmtNum(item.costLow, 0)}–${fmtNum(item.costHigh, 0)} ${item.currency}` : `${fmtDate(item.windowStart)} · ${item.status}`));
    }
    if (view === "records") {
      for (const item of engine.records) {
        if (recordType && item.type !== recordType) continue;
        if (released && !item.releasedAt) continue;
        out.push(line(item.id, `${engine.serialNumber} · ${item.type}`, `${fa ? item.titleFa : item.titleEn}${item.releasedAt ? ` · ${fmtDate(item.releasedAt)}` : ""}`));
      }
    }
    if (view === "documents") {
      for (const item of engine.documents) out.push(line(item.id, engine.serialNumber, `${fa ? item.titleFa : item.titleEn} · ${item.docClass} · ${fmtDate(item.uploadedAt)}`));
    }
  }
  return out.slice(0, 24);
}
