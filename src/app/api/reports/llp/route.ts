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
  const header = ["engine_sn", "model", "module", "part_number", "serial", "life_limit_cycles", "cycles_used", "remaining", "remaining_pct"];
  const lines = [header.join(",")];
  for (const row of rows) {
    for (const llp of row.assessment.llp) {
      lines.push(
        [
          row.engine.serialNumber,
          row.engine.model.code,
          llp.moduleCode,
          llp.partNumber,
          llp.serialNumber,
          Math.round(llp.lifeLimitCycles),
          Math.round(llp.cyclesUsed),
          Math.round(llp.remaining),
          llp.remainingPct.toFixed(1),
        ]
          .map(cell)
          .join(","),
      );
    }
  }
  const body = `\uFEFF${lines.join("\n")}\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=shervan-llp.csv",
      "Cache-Control": "no-store",
    },
  });
}
