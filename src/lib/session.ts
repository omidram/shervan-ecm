import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accessRole, parseModules } from "./accounts";
import { prisma } from "./db";
import type { Locale } from "./i18n";

export type Role = "owner" | "operator" | "mro" | "inspector" | "auditor";

export type Persona = {
  id: string;
  role: Role;
  orgId: string;
  nameEn: string;
  nameFa: string;
  orgEn: string;
  orgFa: string;
  username: string;
  job: string;
  orgKind: string;
  modules: string[];
};

const RAW_PERSONAS = [
  {
    id: "inspector",
    role: "inspector",
    orgId: "org-caa",
    nameEn: "Technical Inspector",
    nameFa: "بازرس فنی",
    orgEn: "Demo Airworthiness Desk",
    orgFa: "میز بازرسی نمایشی",
  },
  {
    id: "owner-kavir",
    role: "owner",
    orgId: "org-kavir",
    nameEn: "Engine Owner",
    nameFa: "مالک موتور",
    orgEn: "Kavir Aero Capital",
    orgFa: "کویر آیرو کاپیتال",
  },
  {
    id: "owner-alborz",
    role: "owner",
    orgId: "org-alborz",
    nameEn: "Engine Owner",
    nameFa: "مالک موتور",
    orgEn: "Alborz Asset Leasing",
    orgFa: "اجاره دارایی البرز",
  },
  {
    id: "operator-narin",
    role: "operator",
    orgId: "org-narin",
    nameEn: "Airline Operator",
    nameFa: "بهره‌بردار",
    orgEn: "Narin Air",
    orgFa: "نارین ایر",
  },
  {
    id: "mro-rayyan",
    role: "mro",
    orgId: "org-rayyan",
    nameEn: "MRO Engineer",
    nameFa: "مهندس تعمیرات",
    orgEn: "Rayyan AeroWorks",
    orgFa: "رایان آئروورکس",
  },
  {
    id: "mro-lanjan",
    role: "mro",
    orgId: "org-lanjan",
    nameEn: "MRO Engineer",
    nameFa: "مهندس تعمیرات",
    orgEn: "Lanjan Propulsion",
    orgFa: "پیشران لنجان",
  },
  {
    id: "auditor",
    role: "auditor",
    orgId: "org-audit",
    nameEn: "Read-only Auditor",
    nameFa: "ممیز فقط‌خواندنی",
    orgEn: "Records Audit Cell",
    orgFa: "واحد ممیزی سوابق",
  },
];

export const PERSONAS: Persona[] = RAW_PERSONAS.map((row) => ({
  ...row,
  role: row.role as Role,
  username: row.id,
  job: row.role,
  orgKind: row.role === "inspector" ? "authority" : row.role === "auditor" ? "audit" : row.role,
  modules: [] as string[],
}));

export async function getTheme(): Promise<"light" | "dark"> {
  const jar = await cookies();
  return jar.get("theme")?.value === "light" ? "light" : "dark";
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return jar.get("locale")?.value === "en" ? "en" : "fa";
}

function toPersona(user: {
  id: string;
  username: string;
  displayName: string;
  job: string;
  modules: string;
  org: { id: string; name: string; nameFa: string; kind: string };
}): Persona {
  return {
    id: user.id,
    username: user.username,
    role: accessRole(user.job, user.org.kind),
    job: user.job,
    orgId: user.org.id,
    orgKind: user.org.kind,
    nameEn: user.displayName,
    nameFa: user.displayName,
    orgEn: user.org.name,
    orgFa: user.org.nameFa,
    modules: parseModules(user.modules),
  };
}

async function loadUser() {
  const jar = await cookies();
  const token = jar.get("sid")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { org: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.active) return null;
  return session.user;
}

export async function getOptionalPersona() {
  const user = await loadUser();
  return user ? toPersona(user) : null;
}

export async function getPersona(): Promise<Persona> {
  const persona = await getOptionalPersona();
  if (!persona) redirect("/login");
  return persona;
}

export function personaById(id: string) {
  return PERSONAS.find((p) => p.id === id) ?? null;
}
