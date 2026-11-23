"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { JOBS, MODULES, modulesForJob } from "@/lib/accounts";
import { allowedVisibility, can, type Action } from "@/lib/access";
import { ensureDatabase } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { checkPassword } from "@/lib/password";
import { classifyDocument, extractFields } from "@/lib/extract";
import { STATUSES } from "@/lib/i18n";
import { parseDay } from "@/lib/format";
import { getPersona, personaById } from "@/lib/session";

function go(path: string, key: "ok" | "err", code: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}${key}=${encodeURIComponent(code)}`);
}

async function audit(input: {
  personaRole: string;
  actor: string;
  orgId: string;
  engineId?: string;
  action: string;
  entityType: string;
  entityId: string;
  summaryFa: string;
  summaryEn: string;
}) {
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      at: new Date(),
      actor: input.actor,
      actorRole: input.personaRole,
      orgId: input.orgId,
      engineId: input.engineId ?? "",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summaryFa: input.summaryFa,
      summaryEn: input.summaryEn,
    },
  });
}

async function writable(engineId: string, action: Action) {
  await ensureDatabase();
  const persona = await getPersona();
  const engine = await prisma.engine.findUnique({
    where: { id: engineId },
    include: { authorizations: true, model: true },
  });
  if (!engine || !can(persona, engine, action)) return { persona, engine: null };
  return { persona, engine };
}

export async function setPersona(formData: FormData) {
  const persona = personaById(String(formData.get("persona") || ""));
  if (!persona) go("/", "err", "denied");
  const jar = await cookies();
  jar.set("persona", persona.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}

export async function ackAlert(formData: FormData) {
  await ensureDatabase();
  const id = String(formData.get("id") || "");
  const back = String(formData.get("back") || "/m/alert");
  const persona = await getPersona();
  const item = await prisma.boardItem.findUnique({
    where: { id },
    include: { engine: { include: { authorizations: true } } },
  });
  if (!item || item.domain !== "alert" || item.ackedAt || !can(persona, item.engine, "ack")) go(back.startsWith("/") ? back : "/m/alert", "err", "denied");
  await prisma.boardItem.update({ where: { id }, data: { status: "acked", ackedAt: new Date(), severity: "info" } });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId: item.engineId,
    action: "ack_alert",
    entityType: "alert",
    entityId: item.id,
    summaryFa: `هشدار ${item.titleFa} روی موتور دیده شد.`,
    summaryEn: `Alert ${item.titleEn} was acknowledged.`,
  });
  revalidatePath("/");
  revalidatePath("/m/alert");
  go(back.startsWith("/") ? back : "/m/alert", "ok", "ack");
}

export async function setTheme(formData: FormData) {
  const theme = String(formData.get("theme")) === "light" ? "light" : "dark";
  const jar = await cookies();
  jar.set("theme", theme, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const back = String(formData.get("back") || "/");
  redirect(back.startsWith("/") ? back : "/");
}

export async function setLocale(formData: FormData) {
  const locale = String(formData.get("locale")) === "en" ? "en" : "fa";
  const jar = await cookies();
  jar.set("locale", locale, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const back = String(formData.get("back") || "/");
  redirect(back.startsWith("/") ? back : "/");
}

export async function changeStatus(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const status = String(formData.get("status") || "");
  const { persona, engine } = await writable(engineId, "status");
  if (!engine || !STATUSES.includes(status as (typeof STATUSES)[number])) go(`/engines/${engineId}`, "err", "denied");
  const eventAt = parseDay(String(formData.get("eventAt") || ""));
  const source = String(formData.get("source") || "").trim().slice(0, 120);
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);
  if (!source || !reason) go(`/engines/${engineId}`, "err", "empty");
  const id = crypto.randomUUID();
  await prisma.statusEvent.create({
    data: {
      id,
      engineId,
      status,
      eventAt,
      source,
      reasonFa: reason,
      reasonEn: reason,
      actor: persona.nameEn,
    },
  });
  await prisma.engine.update({ where: { id: engineId }, data: { status } });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "status_change",
    entityType: "engine",
    entityId: engineId,
    summaryFa: `وضعیت موتور ${engine.serialNumber} به ${status} تغییر کرد.`,
    summaryEn: `Engine ${engine.serialNumber} status changed to ${status}.`,
  });
  revalidatePath(`/engines/${engineId}`);
  go(`/engines/${engineId}`, "ok", "status");
}

export async function addUtilization(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const { persona, engine } = await writable(engineId, "utilization");
  if (!engine) go(`/engines/${engineId}/operations`, "err", "denied");
  const kind = String(formData.get("kind") || "flight");
  if (kind !== "flight" && kind !== "ground_run") go(`/engines/${engineId}/operations`, "err", "empty");
  const hours = Number(formData.get("flightHours"));
  const cycles = Number(formData.get("flightCycles") || 0);
  if (!Number.isFinite(hours) || hours < 0 || hours > 2000) go(`/engines/${engineId}/operations`, "err", "empty");
  if (!Number.isFinite(cycles) || cycles < 0 || cycles > 400) go(`/engines/${engineId}/operations`, "err", "empty");
  if (kind === "ground_run" && cycles !== 0) go(`/engines/${engineId}/operations`, "err", "empty");
  const id = crypto.randomUUID();
  await prisma.utilizationEvent.create({
    data: {
      id,
      engineId,
      eventAt: parseDay(String(formData.get("eventAt") || "")),
      kind,
      flightHours: hours,
      flightCycles: kind === "flight" ? cycles : 0,
      source: String(formData.get("source") || "manual").slice(0, 120),
      note: String(formData.get("note") || "").slice(0, 300),
      actor: persona.nameEn,
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "utilization",
    entityType: "utilization",
    entityId: id,
    summaryFa: `رویداد کارکرد برای موتور ${engine.serialNumber} ثبت شد.`,
    summaryEn: `A utilization event was recorded for engine ${engine.serialNumber}.`,
  });
  revalidatePath(`/engines/${engineId}`);
  go(`/engines/${engineId}/operations`, "ok", "util");
}

export async function transferOwnership(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const { persona, engine } = await writable(engineId, "transfer");
  if (!engine) go(`/engines/${engineId}`, "err", "denied");
  const toOrgId = String(formData.get("toOrgId") || "");
  const org = await prisma.organization.findUnique({ where: { id: toOrgId } });
  if (!org || org.kind !== "owner" || org.id === engine.ownerOrgId) go(`/engines/${engineId}`, "err", "empty");
  const reason = String(formData.get("reason") || "").trim().slice(0, 400);
  if (!reason) go(`/engines/${engineId}`, "err", "empty");
  const id = crypto.randomUUID();
  const when = parseDay(String(formData.get("eventAt") || ""));
  await prisma.ownershipTransfer.create({
    data: {
      id,
      engineId,
      fromOrgId: engine.ownerOrgId,
      toOrgId,
      transferredAt: when,
      reasonFa: reason,
      reasonEn: reason,
      actor: persona.nameEn,
    },
  });
  await prisma.engine.update({ where: { id: engineId }, data: { ownerOrgId: toOrgId } });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "ownership_transfer",
    entityType: "engine",
    entityId: engineId,
    summaryFa: `مالکیت موتور ${engine.serialNumber} به ${org.name} منتقل شد.`,
    summaryEn: `Engine ${engine.serialNumber} ownership moved to ${org.name}.`,
  });
  revalidatePath(`/engines/${engineId}`);
  go(`/engines/${engineId}`, "ok", "transfer");
}

export async function addInstallation(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const { persona, engine } = await writable(engineId, "installation");
  if (!engine) go(`/engines/${engineId}`, "err", "denied");
  const registration = String(formData.get("registration") || "").trim().toUpperCase().slice(0, 16);
  const typeName = String(formData.get("typeName") || "").trim().slice(0, 80);
  const position = String(formData.get("position") || "").trim().slice(0, 8);
  const reason = String(formData.get("reason") || "").trim().slice(0, 300);
  if (!/^FV-[A-Z0-9]{3,8}$/.test(registration) || !typeName || !position || !reason) {
    go(`/engines/${engineId}`, "err", "empty");
  }
  const open = await prisma.installation.findFirst({ where: { engineId, removedAt: null } });
  if (open) go(`/engines/${engineId}`, "err", "installed");
  let aircraft = await prisma.aircraft.findUnique({ where: { registration } });
  if (!aircraft) {
    aircraft = await prisma.aircraft.create({
      data: { id: crypto.randomUUID(), registration, typeName, operatorOrgId: engine.operatorOrgId },
    });
  }
  const id = crypto.randomUUID();
  await prisma.installation.create({
    data: {
      id,
      engineId,
      aircraftId: aircraft.id,
      position,
      installedAt: parseDay(String(formData.get("eventAt") || "")),
      installReasonFa: reason,
      installReasonEn: reason,
      actor: persona.nameEn,
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "installation",
    entityType: "installation",
    entityId: id,
    summaryFa: `موتور ${engine.serialNumber} روی ${registration} نصب شد.`,
    summaryEn: `Engine ${engine.serialNumber} was installed on ${registration}.`,
  });
  revalidatePath(`/engines/${engineId}`);
  go(`/engines/${engineId}`, "ok", "install");
}

export async function removeInstallation(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const installationId = String(formData.get("installationId") || "");
  const { persona, engine } = await writable(engineId, "installation");
  if (!engine) go(`/engines/${engineId}`, "err", "denied");
  const row = await prisma.installation.findFirst({ where: { id: installationId, engineId, removedAt: null } });
  if (!row) go(`/engines/${engineId}`, "err", "empty");
  const reason = String(formData.get("reason") || "").trim().slice(0, 300);
  if (!reason) go(`/engines/${engineId}`, "err", "empty");
  await prisma.installation.update({
    where: { id: row.id },
    data: {
      removedAt: parseDay(String(formData.get("eventAt") || "")),
      removalReasonFa: reason,
      removalReasonEn: reason,
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "removal",
    entityType: "installation",
    entityId: row.id,
    summaryFa: `موتور ${engine.serialNumber} از هواپیما پیاده شد.`,
    summaryEn: `Engine ${engine.serialNumber} was removed from the aircraft.`,
  });
  revalidatePath(`/engines/${engineId}`);
  go(`/engines/${engineId}`, "ok", "remove");
}

export async function createEngine(formData: FormData) {
  await ensureDatabase();
  const persona = await getPersona();
  if (!can(persona, null, "createEngine")) go("/engines/new", "err", "denied");
  const modelId = String(formData.get("modelId") || "");
  const serial = String(formData.get("serialNumber") || "").trim().toUpperCase();
  const partNumber = String(formData.get("partNumber") || "").trim().toUpperCase();
  const configuration = String(formData.get("configuration") || "").trim().slice(0, 180);
  if (!/^[\dA-Z-]{4,24}$/.test(serial) || !partNumber || !configuration) go("/engines/new", "err", "empty");
  const model = await prisma.engineModel.findUnique({ where: { id: modelId } });
  if (!model) go("/engines/new", "err", "empty");
  const ownerOrgId = persona.role === "owner" ? persona.orgId : String(formData.get("ownerOrgId") || "");
  const owner = await prisma.organization.findUnique({ where: { id: ownerOrgId } });
  if (!owner || owner.kind !== "owner") go("/engines/new", "err", "empty");
  const id = crypto.randomUUID();
  try {
    await prisma.engine.create({
      data: {
        id,
        modelId,
        serialNumber: serial,
        partNumber,
        buildDate: parseDay(String(formData.get("buildDate") || "")),
        configuration,
        status: "Standby",
        ownerOrgId,
        hero: false,
      },
    });
  } catch {
    go("/engines/new", "err", "unique");
  }
  await prisma.statusEvent.create({
    data: {
      id: crypto.randomUUID(),
      engineId: id,
      status: "Standby",
      eventAt: new Date(),
      source: "passport create",
      reasonFa: "ایجاد پرونده",
      reasonEn: "Passport created",
      actor: persona.nameEn,
    },
  });
  await prisma.ownershipTransfer.create({
    data: {
      id: crypto.randomUUID(),
      engineId: id,
      toOrgId: ownerOrgId,
      transferredAt: parseDay(String(formData.get("buildDate") || "")),
      reasonFa: "ثبت اولیه مالک",
      reasonEn: "Initial owner record",
      actor: persona.nameEn,
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId: id,
    action: "create_engine",
    entityType: "engine",
    entityId: id,
    summaryFa: `پرونده موتور ${serial} ساخته شد.`,
    summaryEn: `Engine passport ${serial} was created.`,
  });
  revalidatePath("/");
  redirect(`/engines/${id}?ok=engine`);
}

export async function addMaintenance(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const { persona, engine } = await writable(engineId, "maintenance");
  if (!engine) go(`/engines/${engineId}/maintenance`, "err", "denied");
  const type = String(formData.get("type") || "");
  const title = String(formData.get("title") || "").trim().slice(0, 180);
  const narrative = String(formData.get("narrative") || "").trim().slice(0, 2000);
  if (!type || !title || !narrative) go(`/engines/${engineId}/maintenance`, "err", "empty");
  const id = crypto.randomUUID();
  const group = crypto.randomUUID();
  await prisma.maintenanceRecord.create({
    data: {
      id,
      engineId,
      versionGroupId: group,
      version: 1,
      type,
      titleFa: title,
      titleEn: title,
      narrativeFa: narrative,
      narrativeEn: narrative,
      performedAt: parseDay(String(formData.get("eventAt") || "")),
      mroOrgId: persona.role === "mro" ? persona.orgId : null,
      workOrder: String(formData.get("workOrder") || "").slice(0, 40),
      approvalStatus: "original",
      immutable: false,
      actor: persona.nameEn,
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "maintenance_create",
    entityType: "maintenance",
    entityId: id,
    summaryFa: `سابقه تعمیراتی برای موتور ${engine.serialNumber} ثبت شد.`,
    summaryEn: `A maintenance record was added for engine ${engine.serialNumber}.`,
  });
  revalidatePath(`/engines/${engineId}/maintenance`);
  go(`/engines/${engineId}/maintenance`, "ok", "maintenance");
}

export async function verifyRecord(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const recordId = String(formData.get("recordId") || "");
  const { persona, engine } = await writable(engineId, "verify");
  if (!engine) go(`/engines/${engineId}/maintenance`, "err", "denied");
  const record = await prisma.maintenanceRecord.findFirst({ where: { id: recordId, engineId } });
  if (!record || record.immutable) go(`/engines/${engineId}/maintenance`, "err", "empty");
  await prisma.maintenanceRecord.update({
    where: { id: record.id },
    data: { approvalStatus: "verified", immutable: true },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "verify_record",
    entityType: "maintenance",
    entityId: record.id,
    summaryFa: `سابقه ${record.workOrder || record.id} برای موتور ${engine.serialNumber} تأیید شد.`,
    summaryEn: `Record ${record.workOrder || record.id} on engine ${engine.serialNumber} was verified.`,
  });
  revalidatePath(`/engines/${engineId}/maintenance`);
  go(`/engines/${engineId}/maintenance`, "ok", "verify");
}

export async function correctRecord(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const recordId = String(formData.get("recordId") || "");
  const { persona, engine } = await writable(engineId, "maintenance");
  if (!engine) go(`/engines/${engineId}/maintenance`, "err", "denied");
  const record = await prisma.maintenanceRecord.findFirst({
    where: { id: recordId, engineId },
    include: { defects: true, partActions: true },
  });
  if (!record || !record.immutable) go(`/engines/${engineId}/maintenance`, "err", "empty");
  const narrative = String(formData.get("narrative") || "").trim().slice(0, 2000);
  if (!narrative) go(`/engines/${engineId}/maintenance`, "err", "empty");
  const id = crypto.randomUUID();
  await prisma.maintenanceRecord.create({
    data: {
      id,
      engineId,
      versionGroupId: record.versionGroupId,
      version: record.version + 1,
      supersedesId: record.id,
      type: record.type,
      titleFa: record.titleFa,
      titleEn: record.titleEn,
      narrativeFa: narrative,
      narrativeEn: narrative,
      actionsFa: record.actionsFa,
      actionsEn: record.actionsEn,
      performedAt: record.performedAt,
      releasedAt: record.releasedAt,
      mroOrgId: record.mroOrgId,
      workOrder: record.workOrder,
      hoursAtEvent: record.hoursAtEvent,
      cyclesAtEvent: record.cyclesAtEvent,
      approvalStatus: "original",
      immutable: false,
      actor: persona.nameEn,
      defects: {
        create: record.defects.map((defect) => ({
          id: crypto.randomUUID(),
          moduleCode: defect.moduleCode,
          descriptionFa: defect.descriptionFa,
          descriptionEn: defect.descriptionEn,
          severity: defect.severity,
          disposition: defect.disposition,
          status: defect.status,
          foundAt: defect.foundAt,
        })),
      },
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "correct_record",
    entityType: "maintenance",
    entityId: id,
    summaryFa: `نسخه جدید برای سابقه تأییدشده موتور ${engine.serialNumber} ساخته شد. نسخه قبلی ماند.`,
    summaryEn: `A new version was issued for a verified record on engine ${engine.serialNumber}. The previous version remains.`,
  });
  revalidatePath(`/engines/${engineId}/maintenance`);
  go(`/engines/${engineId}/maintenance`, "ok", "version");
}

export async function setFieldStatus(formData: FormData) {
  const documentId = String(formData.get("documentId") || "");
  const fieldId = String(formData.get("fieldId") || "");
  const status = String(formData.get("status") || "");
  await ensureDatabase();
  const persona = await getPersona();
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { engine: { include: { authorizations: true } } },
  });
  if (!doc?.engine || !can(persona, doc.engine, "extract")) go(`/documents/${documentId}`, "err", "denied");
  if (status !== "approved" && status !== "rejected" && status !== "pending") go(`/documents/${documentId}`, "err", "empty");
  if (doc.committedAt) go(`/documents/${documentId}`, "err", "closed");
  await prisma.extractionField.updateMany({ where: { id: fieldId, documentId }, data: { status } });
  revalidatePath(`/documents/${documentId}`);
  go(`/documents/${documentId}`, "ok", "field");
}

export async function commitExtraction(formData: FormData) {
  const documentId = String(formData.get("documentId") || "");
  await ensureDatabase();
  const persona = await getPersona();
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { fields: true, engine: { include: { authorizations: true } } },
  });
  if (!doc?.engine || !can(persona, doc.engine, "extract")) go(`/documents/${documentId}`, "err", "denied");
  if (doc.committedAt) go(`/documents/${documentId}`, "err", "closed");
  const approved = doc.fields.filter((field) => field.status === "approved");
  if (!approved.length) go(`/documents/${documentId}`, "err", "empty");
  const value = (key: string) => approved.find((field) => field.fieldKey === key)?.value;
  const finding = value("finding");
  const id = crypto.randomUUID();
  await prisma.maintenanceRecord.create({
    data: {
      id,
      engineId: doc.engineId!,
      versionGroupId: crypto.randomUUID(),
      version: 1,
      type: doc.docClass === "shop_visit" ? "shop_visit" : "inspection",
      titleFa: `ثبت از سند ${doc.filename}`,
      titleEn: `Committed from ${doc.filename}`,
      narrativeFa: finding || approved.map((field) => `${field.labelFa}: ${field.value}`).join("\n"),
      narrativeEn: finding || approved.map((field) => `${field.labelEn}: ${field.value}`).join("\n"),
      performedAt: value("induced") ? parseDay(value("induced")) : doc.uploadedAt,
      releasedAt: value("released") ? parseDay(value("released")) : null,
      workOrder: value("workOrder") || "",
      hoursAtEvent: value("tsn") ? Number(value("tsn")) : null,
      cyclesAtEvent: value("csn") ? Number(value("csn")) : null,
      approvalStatus: "extracted",
      immutable: false,
      actor: persona.nameEn,
      documentId: doc.id,
      defects: finding
        ? {
            create: {
              id: crypto.randomUUID(),
              moduleCode: value("module") || "HPC",
              descriptionFa: finding,
              descriptionEn: finding,
              severity: "medium",
              disposition: "from document",
              status: "monitor",
              foundAt: value("induced") ? parseDay(value("induced")) : doc.uploadedAt,
            },
          }
        : undefined,
    },
  });
  await prisma.document.update({ where: { id: doc.id }, data: { committedAt: new Date() } });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId: doc.engineId || "",
    action: "commit_extraction",
    entityType: "document",
    entityId: doc.id,
    summaryFa: `فیلدهای تأییدشده سند ${doc.filename} به پرونده موتور ${doc.engine.serialNumber} نشست.`,
    summaryEn: `Approved fields from ${doc.filename} were committed to engine ${doc.engine.serialNumber}.`,
  });
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/engines/${doc.engineId}/maintenance`);
  go(`/documents/${documentId}`, "ok", "commit");
}

export async function uploadDocument(formData: FormData) {
  await ensureDatabase();
  const persona = await getPersona();
  const engineId = String(formData.get("engineId") || "");
  const engine = await prisma.engine.findUnique({ where: { id: engineId }, include: { authorizations: true } });
  if (!engine || !can(persona, engine, "upload")) go("/documents", "err", "denied");
  const visibility = String(formData.get("visibility") || "shared");
  if (!allowedVisibility(persona).includes(visibility)) go("/documents", "err", "denied");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go("/documents", "err", "file");
  if (file.size > 2_000_000) go("/documents", "err", "file");
  const name = file.name.toLowerCase();
  let text = "";
  try {
    if (name.endsWith(".txt") || file.type.startsWith("text/")) {
      text = await file.text();
    } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { extractText } = await import("unpdf");
      const extracted = await extractText(new Uint8Array(await file.arrayBuffer()), { mergePages: false });
      text = extracted.text.join("\n\f\n");
    } else {
      go("/documents", "err", "file");
    }
  } catch {
    go("/documents", "err", "file");
  }
  text = text.replace(/\u0000/g, "").slice(0, 200_000);
  if (text.trim().length < 8) go("/documents", "err", "empty");
  const docClass = classifyDocument(text);
  const id = crypto.randomUUID();
  const fields = extractFields(text);
  await prisma.document.create({
    data: {
      id,
      engineId,
      ownerOrgId: engine.ownerOrgId,
      mroOrgId: visibility === "mro_internal" ? persona.orgId : null,
      visibility,
      titleFa: file.name.slice(0, 120),
      titleEn: file.name.slice(0, 120),
      docClass,
      filename: file.name.slice(0, 120),
      bodyText: text,
      methodNote: "rule-based:v1",
      uploadedAt: new Date(),
      uploadedBy: persona.nameEn,
      fields: {
        create: fields.map((field) => ({
          id: crypto.randomUUID(),
          fieldKey: field.fieldKey,
          labelFa: field.labelFa,
          labelEn: field.labelEn,
          value: field.value.slice(0, 500),
          confidence: field.confidence,
          page: field.page,
          method: field.method,
          status: "pending",
          moduleCode: field.moduleCode,
        })),
      },
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "upload_document",
    entityType: "document",
    entityId: id,
    summaryFa: `سند برای موتور ${engine.serialNumber} بارگذاری و با قواعد استخراج شد.`,
    summaryEn: `A document was uploaded for engine ${engine.serialNumber} and extracted with rules.`,
  });
  revalidatePath("/documents");
  redirect(`/documents/${id}?ok=upload`);
}

export async function closePlan(formData: FormData) {
  const planId = String(formData.get("planId") || "");
  const engineId = String(formData.get("engineId") || "");
  const { persona, engine } = await writable(engineId, "plan");
  if (!engine) go(`/engines/${engineId}/plan`, "err", "denied");
  if (String(formData.get("ack") || "") !== "on") go(`/engines/${engineId}/plan`, "err", "empty");
  const plan = await prisma.maintenancePlan.findFirst({ where: { id: planId, engineId } });
  if (!plan || plan.status !== "proposed") go(`/engines/${engineId}/plan`, "err", "closed");
  const recordId = crypto.randomUUID();
  await prisma.maintenanceRecord.create({
    data: {
      id: recordId,
      engineId,
      versionGroupId: crypto.randomUUID(),
      version: 1,
      type: "shop_visit",
      titleFa: "القای برنامه‌ریزی‌شده از برنامه تعمیر",
      titleEn: "Scheduled induction from the maintenance plan",
      narrativeFa: plan.rationaleFa,
      narrativeEn: plan.rationaleEn,
      performedAt: plan.inductionAt ?? plan.windowStart,
      mroOrgId: plan.mroOrgId,
      workOrder: `PLAN-${plan.id.slice(0, 8).toUpperCase()}`,
      approvalStatus: "original",
      immutable: false,
      actor: persona.nameEn,
    },
  });
  await prisma.maintenancePlan.update({
    where: { id: plan.id },
    data: { status: "closed", closedRecordId: recordId },
  });
  const parts = JSON.parse(plan.partsJson) as { partNumber: string; qty: number }[];
  if (plan.mroOrgId) {
    for (const part of parts) {
      const item = await prisma.inventoryItem.findFirst({
        where: { orgId: plan.mroOrgId, partNumber: part.partNumber },
      });
      if (!item) continue;
      const free = Math.max(0, item.qtyOnHand - item.qtyReserved);
      const reserve = Math.min(free, part.qty);
      if (reserve > 0) {
        await prisma.inventoryItem.update({ where: { id: item.id }, data: { qtyReserved: item.qtyReserved + reserve } });
      }
    }
  }
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "close_plan",
    entityType: "plan",
    entityId: plan.id,
    summaryFa: `برنامه تعمیر موتور ${engine.serialNumber} بسته شد و یک رویداد تعمیراتی در پرونده نشست.`,
    summaryEn: `The maintenance plan for engine ${engine.serialNumber} was closed and a maintenance event was written to the passport.`,
  });
  revalidatePath(`/engines/${engineId}`);
  go(`/engines/${engineId}/maintenance`, "ok", "plan");
}

export async function clearFault(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const modeCode = String(formData.get("modeCode") || "");
  const { persona, engine } = await writable(engineId, "disposition");
  if (!engine) go(`/engines/${engineId}/faults`, "err", "denied");
  const note = String(formData.get("note") || "").trim().slice(0, 400);
  if (!note || !/^[a-z_]+$/.test(modeCode)) go(`/engines/${engineId}/faults`, "err", "empty");
  const id = crypto.randomUUID();
  await prisma.faultDisposition.create({
    data: { id, engineId, modeCode, status: "cleared", noteFa: note, noteEn: note, actor: persona.nameEn, at: new Date() },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "clear_fault",
    entityType: "fault",
    entityId: id,
    summaryFa: `عیب ${modeCode} روی موتور ${engine.serialNumber} با مشاهده جدید بسته شد.`,
    summaryEn: `Fault ${modeCode} on engine ${engine.serialNumber} was cleared by a new observation.`,
  });
  revalidatePath(`/engines/${engineId}/faults`);
  go(`/engines/${engineId}/faults`, "ok", "fault");
}

export async function installComponent(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const { persona, engine } = await writable(engineId, "component");
  if (!engine) go(`/engines/${engineId}/configuration`, "err", "denied");
  const partNumber = String(formData.get("partNumber") || "").trim().toUpperCase();
  const serialNumber = String(formData.get("serialNumber") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  const moduleCode = String(formData.get("moduleCode") || "").trim().toUpperCase();
  const position = String(formData.get("position") || "module").trim().slice(0, 40);
  const reason = String(formData.get("reason") || "").trim().slice(0, 300);
  if (!partNumber || !serialNumber || !name || !moduleCode || !reason) go(`/engines/${engineId}/configuration`, "err", "empty");
  let component = await prisma.component.findFirst({ where: { partNumber, serialNumber } });
  if (!component) {
    const llp = String(formData.get("llp") || "") === "on";
    const limit = Number(formData.get("lifeLimitCycles") || 0);
    component = await prisma.component.create({
      data: {
        id: crypto.randomUUID(),
        partNumber,
        serialNumber,
        name,
        nameFa: name,
        moduleCode,
        isLlp: llp,
        lifeLimitCycles: llp && limit > 0 ? limit : null,
        manufacturer: "operator entry",
      },
    });
  }
  const open = await prisma.componentInstallation.findFirst({ where: { componentId: component.id, removedAt: null } });
  if (open) go(`/engines/${engineId}/configuration`, "err", "installed");
  const id = crypto.randomUUID();
  await prisma.componentInstallation.create({
    data: {
      id,
      componentId: component.id,
      engineId,
      moduleCode: component.moduleCode,
      position,
      installedAt: parseDay(String(formData.get("eventAt") || "")),
      reasonFa: reason,
      reasonEn: reason,
      actor: persona.nameEn,
    },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "component_install",
    entityType: "component",
    entityId: component.id,
    summaryFa: `قطعه ${serialNumber} روی موتور ${engine.serialNumber} نصب شد.`,
    summaryEn: `Part ${serialNumber} was installed on engine ${engine.serialNumber}.`,
  });
  revalidatePath(`/engines/${engineId}/configuration`);
  go(`/engines/${engineId}/configuration`, "ok", "part");
}

export async function removeComponent(formData: FormData) {
  const engineId = String(formData.get("engineId") || "");
  const installationId = String(formData.get("installationId") || "");
  const { persona, engine } = await writable(engineId, "component");
  if (!engine) go(`/engines/${engineId}/configuration`, "err", "denied");
  const row = await prisma.componentInstallation.findFirst({ where: { id: installationId, engineId, removedAt: null } });
  if (!row) go(`/engines/${engineId}/configuration`, "err", "empty");
  const reason = String(formData.get("reason") || "").trim().slice(0, 300);
  if (!reason) go(`/engines/${engineId}/configuration`, "err", "empty");
  await prisma.componentInstallation.update({
    where: { id: row.id },
    data: { removedAt: parseDay(String(formData.get("eventAt") || "")), reasonFa: reason, reasonEn: reason },
  });
  await audit({
    personaRole: persona.role,
    actor: persona.nameEn,
    orgId: persona.orgId,
    engineId,
    action: "component_remove",
    entityType: "component",
    entityId: row.componentId,
    summaryFa: `یک قطعه از موتور ${engine.serialNumber} پیاده شد.`,
    summaryEn: `A part was removed from engine ${engine.serialNumber}.`,
  });
  revalidatePath(`/engines/${engineId}/configuration`);
  go(`/engines/${engineId}/configuration`, "ok", "part");
}

async function openSession(userId: string) {
  const token = randomBytes(24).toString("hex");
  await prisma.session.create({
    data: { id: crypto.randomUUID(), token, userId, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  });
  const jar = await cookies();
  jar.set("sid", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}

export async function login(formData: FormData) {
  await ensureDatabase();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.appUser.findUnique({ where: { username } });
  if (!user || !user.active || !checkPassword(password, user.passwordHash)) redirect("/login?err=bad");
  await openSession(user.id);
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get("sid")?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete("sid");
  redirect("/login");
}

export async function registerCompany(formData: FormData) {
  await ensureDatabase();
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  const nameFa = String(formData.get("nameFa") || "").trim().slice(0, 80) || name;
  const kind = ["owner", "operator", "mro"].includes(String(formData.get("kind"))) ? String(formData.get("kind")) : "owner";
  const code = String(formData.get("code") || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim().slice(0, 80) || username;
  if (!name || code.length < 3 || !/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) redirect("/login?err=form");
  const [orgTaken, userTaken] = await Promise.all([
    prisma.organization.findUnique({ where: { code } }),
    prisma.appUser.findUnique({ where: { username } }),
  ]);
  if (orgTaken || userTaken) redirect("/login?err=taken");
  const orgId = `org-${code.toLowerCase()}`;
  const userId = crypto.randomUUID();
  await prisma.organization.create({ data: { id: orgId, name, nameFa, kind, code } });
  await prisma.appUser.create({
    data: {
      id: userId,
      username,
      passwordHash: hashPassword(password),
      displayName,
      job: "org_admin",
      modules: modulesForJob("org_admin"),
      orgId,
    },
  });
  await openSession(userId);
  redirect("/admin/users?ok=company");
}

export async function createCompanyUser(formData: FormData) {
  await ensureDatabase();
  const persona = await getPersona();
  if (!persona.modules.includes("admin") || (persona.job !== "org_admin" && persona.job !== "super" && persona.job !== "mro_admin")) {
    redirect("/admin/users?err=denied");
  }
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim().slice(0, 80) || username;
  const job = JOBS.some((item) => item.id === String(formData.get("job"))) ? String(formData.get("job")) : "analyst";
  if (job === "super" && persona.job !== "super") redirect("/admin/users?err=denied");
  const picked = formData.getAll("modules").map(String).filter((id) => MODULES.some((item) => item.id === id));
  const modules = (picked.length ? picked : modulesForJob(job).split(",")).join(",");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) redirect("/admin/users?err=form");
  const taken = await prisma.appUser.findUnique({ where: { username } });
  if (taken) redirect("/admin/users?err=taken");
  const orgId = persona.job === "super" ? String(formData.get("orgId") || persona.orgId) : persona.orgId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) redirect("/admin/users?err=form");
  await prisma.appUser.create({
    data: { id: crypto.randomUUID(), username, passwordHash: hashPassword(password), displayName, job, modules, orgId: org.id },
  });
  redirect("/admin/users?ok=user");
}
