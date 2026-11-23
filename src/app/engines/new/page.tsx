import { redirect } from "next/navigation";
import { createEngine } from "@/app/actions";
import { Flash } from "@/components/ui";
import { can } from "@/lib/access";
import { ensureDatabase } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { L } from "@/lib/i18n";
import { listOrgs } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";
import { utcToday } from "@/lib/format";

export default async function NewEnginePage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  await ensureDatabase();
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  if (!can(persona, null, "createEngine")) redirect("/");
  const [models, orgs] = await Promise.all([prisma.engineModel.findMany({ orderBy: { code: "asc" } }), listOrgs()]);
  return (
    <div className="stack">
      <Flash locale={locale} err={sp.err} />
      <header className="page-head">
        <div>
          <p className="kicker">SHERVAN ECM</p>
          <h1>{L(locale, "پرونده جدید", "New passport")}</h1>
          <p className="lede">{L(locale, "شماره سریال در ترکیب سازنده و مدل یکتا است. مدل از جدول می‌آید، نه از یک درخت ثابت.", "Serial number is unique for the manufacturer and model. The model comes from the table, not from one fixed tree.")}</p>
        </div>
      </header>
      <form action={createEngine} className="panel form-grid">
        <label>{L(locale, "مدل", "Model")}
          <select name="modelId">{models.map((model) => <option key={model.id} value={model.id}>{model.code}</option>)}</select>
        </label>
        <label>S/N<input name="serialNumber" required placeholder="779200" /></label>
        <label>P/N<input name="partNumber" required placeholder="SHV-7B27-CFG" /></label>
        <label>{L(locale, "تاریخ ساخت", "Build date")}<input type="date" name="buildDate" required defaultValue={utcToday()} /></label>
        {persona.role === "inspector" ? (
          <label>{L(locale, "مالک", "Owner")}
            <select name="ownerOrgId">{orgs.filter((org) => org.kind === "owner").map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select>
          </label>
        ) : null}
        <label className="wide">{L(locale, "پیکربندی", "Configuration")}<input name="configuration" required /></label>
        <button className="btn" type="submit">{L(locale, "ساخت پرونده", "Create passport")}</button>
      </form>
    </div>
  );
}
