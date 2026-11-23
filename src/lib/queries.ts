import { Prisma } from "@prisma/client";
import { canSeeDocument, canSeeEngine, type EngineAccess } from "./access";
import { assess, type Assessment, type EngineBundle } from "./assess";
import { ensureDatabase } from "./bootstrap";
import { prisma } from "./db";
import { cyclesInWindow } from "./life";
import type { Persona } from "./session";

export const engineInclude = {
  model: {
    include: {
      family: true,
      modules: { orderBy: { sortOrder: "asc" as const } },
      baselines: true,
      limitBands: true,
      failureModes: true,
    },
  },
  owner: true,
  operator: true,
  authorizations: true,
  statusEvents: { orderBy: { eventAt: "asc" as const } },
  transfers: {
    include: { fromOrg: true, toOrg: true },
    orderBy: { transferredAt: "asc" as const },
  },
  installations: {
    include: { aircraft: true },
    orderBy: { installedAt: "asc" as const },
  },
  utilization: { orderBy: { eventAt: "asc" as const } },
  compInstalls: {
    include: { component: true },
    orderBy: { installedAt: "asc" as const },
  },
  records: {
    include: { defects: true, partActions: true, mro: true },
    orderBy: { performedAt: "desc" as const },
  },
  documents: { include: { fields: true, owner: true, mro: true } },
  samples: { orderBy: { recordedAt: "asc" as const } },
  dispositions: { orderBy: { at: "desc" as const } },
  plans: { include: { mro: true }, orderBy: { windowStart: "asc" as const } },
} satisfies Prisma.EngineInclude;

export type FullEngine = Prisma.EngineGetPayload<{ include: typeof engineInclude }>;

export function engineWhere(persona: Persona): Prisma.EngineWhereInput {
  if (persona.job === "super" || persona.role === "inspector") return {};
  if (persona.role === "auditor" && persona.orgKind === "audit") return {};
  if (persona.role === "owner") return { ownerOrgId: persona.orgId };
  if (persona.role === "operator") return { operatorOrgId: persona.orgId };
  if (persona.role === "mro") return { authorizations: { some: { orgId: persona.orgId } } };
  if (persona.job === "analyst" || persona.job === "auditor" || persona.job === "doc_controller") {
    return {
      OR: [
        { ownerOrgId: persona.orgId },
        { operatorOrgId: persona.orgId },
        { authorizations: { some: { orgId: persona.orgId } } },
      ],
    };
  }
  return { id: "__none__" };
}

export function toBundle(engine: FullEngine): EngineBundle {
  return {
    id: engine.id,
    serialNumber: engine.serialNumber,
    status: engine.status,
    modules: engine.model.modules,
    baselines: engine.model.baselines,
    limitBands: engine.model.limitBands,
    failureModes: engine.model.failureModes,
    samples: engine.samples,
    records: engine.records.map((record) => ({
      id: record.id,
      versionGroupId: record.versionGroupId,
      version: record.version,
      type: record.type,
      performedAt: record.performedAt,
      releasedAt: record.releasedAt,
      defects: record.defects,
    })),
    utilization: engine.utilization,
    compInstalls: engine.compInstalls.map((row) => ({
      id: row.id,
      engineId: row.engineId,
      installedAt: row.installedAt,
      removedAt: row.removedAt,
      component: row.component,
    })),
    dispositions: engine.dispositions,
  };
}

export async function listEngines(persona: Persona) {
  await ensureDatabase();
  const engines = await prisma.engine.findMany({
    where: engineWhere(persona),
    include: engineInclude,
    orderBy: [{ hero: "desc" }, { serialNumber: "asc" }],
  });
  return engines.map((engine) => ({ engine, assessment: assess(toBundle(engine)) }));
}

export async function getEngine(id: string, persona: Persona, asOf = new Date()) {
  await ensureDatabase();
  const engine = await prisma.engine.findFirst({
    where: { id, AND: [engineWhere(persona)] },
    include: engineInclude,
  });
  if (!engine || !canSeeEngine(persona, engine)) return null;
  return { engine, assessment: assess(toBundle(engine), asOf) };
}

export async function listDocuments(persona: Persona) {
  await ensureDatabase();
  const engines = await prisma.engine.findMany({
    where: engineWhere(persona),
    include: { authorizations: true },
  });
  const ids = engines.map((engine) => engine.id);
  const docs = await prisma.document.findMany({
    where: { engineId: { in: ids } },
    include: { fields: true, engine: true, owner: true, mro: true },
    orderBy: { uploadedAt: "desc" },
  });
  const visible = [];
  let withheld = 0;
  for (const doc of docs) {
    const engine = engines.find((item) => item.id === doc.engineId) ?? null;
    if (canSeeDocument(persona, doc, engine)) visible.push(doc);
    else withheld += 1;
  }
  return { visible, withheld, engines };
}

export async function getDocument(id: string, persona: Persona) {
  await ensureDatabase();
  const doc = await prisma.document.findUnique({
    include: { fields: { orderBy: { confidence: "desc" } }, engine: { include: { authorizations: true } }, owner: true, mro: true },
    where: { id },
  });
  if (!doc) return null;
  const engine = doc.engine;
  if (engine && !canSeeEngine(persona, engine)) return null;
  if (!canSeeDocument(persona, doc, engine)) return null;
  return doc;
}

export async function listAudit(persona: Persona) {
  await ensureDatabase();
  if (persona.role === "inspector" || persona.role === "auditor") {
    return prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 300 });
  }
  const engines = await prisma.engine.findMany({ where: engineWhere(persona), select: { id: true } });
  const ids = engines.map((engine) => engine.id);
  return prisma.auditLog.findMany({
    where: { OR: [{ engineId: { in: ids } }, { orgId: persona.orgId }, { engineId: "" }] },
    orderBy: { at: "desc" },
    take: 300,
  });
}

export async function listBoard(persona: Persona, engineId?: string) {
  await ensureDatabase();
  const engines = await prisma.engine.findMany({
    where: engineWhere(persona),
    select: { id: true, serialNumber: true, model: { select: { code: true } }, hero: true },
    orderBy: [{ hero: "desc" }, { serialNumber: "asc" }],
  });
  const ids = engines.map((engine) => engine.id);
  const chosen = engineId && ids.includes(engineId) ? engineId : undefined;
  const items = await prisma.boardItem.findMany({
    where: { engineId: chosen ?? { in: ids } },
    orderBy: [{ recordedAt: "desc" }, { code: "asc" }],
  });
  return { items, engines };
}

export async function listOrgs() {
  await ensureDatabase();
  return prisma.organization.findMany({ orderBy: { name: "asc" } });
}

export async function getComponent(id: string, persona: Persona) {
  await ensureDatabase();
  const component = await prisma.component.findUnique({
    where: { id },
    include: {
      installs: {
        include: { engine: { include: { authorizations: true, model: true, owner: true } } },
        orderBy: { installedAt: "asc" },
      },
    },
  });
  if (!component) return null;
  const visible = component.installs.filter((row) => canSeeEngine(persona, row.engine));
  if (!visible.length) return null;
  const events = await prisma.utilizationEvent.findMany({
    where: { engineId: { in: component.installs.map((row) => row.engineId) } },
  });
  const asOf = new Date();
  let totalCycles = 0;
  let totalHours = 0;
  const intervals = component.installs.map((row) => {
    const allowed = canSeeEngine(persona, row.engine);
    const end = row.removedAt && row.removedAt < asOf ? row.removedAt : asOf;
    const gained =
      row.installedAt <= asOf ? cyclesInWindow(events.filter((event) => event.engineId === row.engineId), row.installedAt, end) : { cycles: 0, hours: 0 };
    if (allowed) {
      totalCycles += gained.cycles;
      totalHours += gained.hours;
    }
    return { row, allowed, gained, active: !row.removedAt || row.removedAt > asOf };
  });
  return { component, intervals, totalCycles, totalHours, hidden: intervals.filter((row) => !row.allowed).length };
}

export type EngineAssessment = {
  engine: FullEngine;
  assessment: Assessment;
};

export function accessOf(engine: { id: string; ownerOrgId: string; operatorOrgId: string | null; authorizations?: { orgId: string }[] }): EngineAccess {
  return engine;
}
