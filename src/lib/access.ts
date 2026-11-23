import type { Persona } from "./session";

export type EngineAccess = {
  id: string;
  ownerOrgId: string;
  operatorOrgId: string | null;
  authorizations?: { orgId: string }[];
};

export type DocAccess = {
  visibility: string;
  ownerOrgId: string;
  mroOrgId: string | null;
};

function orgTouches(persona: Persona, engine: EngineAccess) {
  return (
    engine.ownerOrgId === persona.orgId ||
    engine.operatorOrgId === persona.orgId ||
    (engine.authorizations ?? []).some((row) => row.orgId === persona.orgId)
  );
}

export function canSeeEngine(persona: Persona, engine: EngineAccess) {
  if (persona.job === "super" || persona.role === "inspector") return true;
  if (persona.role === "auditor" && persona.orgKind === "audit") return true;
  if (persona.role === "owner") return engine.ownerOrgId === persona.orgId;
  if (persona.role === "operator") return engine.operatorOrgId === persona.orgId;
  if (persona.role === "mro") return (engine.authorizations ?? []).some((row) => row.orgId === persona.orgId);
  if (persona.job === "analyst" || persona.job === "auditor" || persona.job === "doc_controller") return orgTouches(persona, engine);
  return false;
}

export function canSeeDocument(persona: Persona, doc: DocAccess, engine: EngineAccess | null) {
  if (engine && !canSeeEngine(persona, engine)) return false;
  if (!engine && persona.role !== "inspector" && persona.role !== "auditor") {
    if (doc.ownerOrgId !== persona.orgId && doc.mroOrgId !== persona.orgId) return false;
  }
  if (doc.visibility === "shared") return true;
  if (doc.visibility === "owner_confidential") {
    return persona.role === "owner" && persona.orgId === doc.ownerOrgId;
  }
  if (doc.visibility === "mro_internal") {
    return persona.role === "mro" && persona.orgId === doc.mroOrgId;
  }
  return false;
}

export type Action =
  | "status"
  | "transfer"
  | "utilization"
  | "installation"
  | "maintenance"
  | "component"
  | "plan"
  | "verify"
  | "disposition"
  | "extract"
  | "upload"
  | "createEngine"
  | "ack";

export function can(persona: Persona, engine: EngineAccess | null, action: Action) {
  if (persona.job === "auditor" || persona.job === "analyst" || persona.role === "auditor") return false;
  if (persona.job === "doc_controller") return action === "upload" || action === "extract";
  if (persona.job === "mro_engineer" && (action === "status" || action === "transfer" || action === "verify" || action === "createEngine")) return false;
  if (action === "createEngine") return persona.role === "owner" || persona.role === "inspector";
  if (!engine || !canSeeEngine(persona, engine)) return false;
  switch (action) {
    case "status":
    case "transfer":
      return persona.role === "owner" || persona.role === "inspector";
    case "utilization":
    case "installation":
      return persona.role === "owner" || persona.role === "operator" || persona.role === "inspector";
    case "maintenance":
    case "component":
    case "plan":
      return persona.role === "owner" || persona.role === "mro" || persona.role === "inspector";
    case "verify":
    case "disposition":
      return persona.role === "inspector";
    case "extract":
    case "upload":
    case "ack":
      return persona.role === "owner" || persona.role === "mro" || persona.role === "inspector" || persona.role === "operator";
    default:
      return false;
  }
}

export function allowedVisibility(persona: Persona) {
  if (persona.role === "owner") return ["shared", "owner_confidential"];
  if (persona.role === "mro") return ["shared", "mro_internal"];
  if (persona.role === "operator" || persona.role === "inspector") return ["shared"];
  return [];
}
