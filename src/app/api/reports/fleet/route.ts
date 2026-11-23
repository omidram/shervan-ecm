import { ensureDatabase } from "@/lib/bootstrap";
import { listEngines } from "@/lib/queries";
import { getPersona } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  await ensureDatabase();
  const persona = await getPersona();
  const rows = await listEngines(persona);
  const header = ["engine_sn", "model", "status", "owner", "tsn", "csn", "health", "open_faults", "min_llp_remaining_pct"];
  const lines = [header.join(",")];
  for (const row of rows) {
    const worst = row.assessment.llp.slice().sort((a, b) => a.remainingPct - b.remainingPct)[0];
    lines.push(
      [
        row.engine.serialNumber,
        row.engine.model.code,
        row.engine.status,
        row.engine.owner.name,
        Math.round(row.assessment.life.tsn),
        Math.round(row.assessment.life.csn),
        row.assessment.engineHealth ?? "",
        row.assessment.faults.filter((fault) => fault.reported).length,
        worst ? worst.remainingPct.toFixed(1) : "",
      ]
        .map(cell)
        .join(","),
    );
  }
  return new Response(`\uFEFF${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=shervan-fleet.csv",
      "Cache-Control": "no-store",
    },
  });
}
