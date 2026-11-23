import { prisma } from "../src/lib/db";
import { ensureDatabase } from "../src/lib/bootstrap";
import { getEngine, listDocuments } from "../src/lib/queries";
import { PERSONAS } from "../src/lib/session";

async function main() {
  await ensureDatabase();
  const inspector = PERSONAS[0];
  const kavir = PERSONAS.find((p) => p.id === "owner-kavir")!;
  const alborz = PERSONAS.find((p) => p.id === "owner-alborz")!;
  const rayyan = PERSONAS.find((p) => p.id === "mro-rayyan")!;
  const lanjan = PERSONAS.find((p) => p.id === "mro-lanjan")!;
  const engines = await prisma.engine.count();
  if (engines !== 8) throw new Error(`expected 8 engines, got ${engines}`);
  const hero = await getEngine("eng-779184", inspector);
  if (!hero) throw new Error("hero missing");
  const owners = new Set(hero.engine.transfers.map((t) => t.toOrgId));
  if (owners.size < 2) throw new Error("hero needs two owners");
  const regs = new Set(hero.engine.installations.map((i) => i.aircraft.registration));
  if (regs.size < 2) throw new Error("hero needs two aircraft");
  const blade = await prisma.componentInstallation.findMany({ where: { componentId: "cmp-blade" } });
  if (blade.length < 2) throw new Error("moved part missing");
  const llp = hero.assessment.llp.find((row) => row.serialNumber === "HPTD-18442");
  if (!llp) throw new Error("LLP missing");
  if (llp.remainingPct > 15) throw new Error(`LLP not near limit: ${llp.remainingPct.toFixed(1)}% remaining (${llp.cyclesUsed})`);
  const hpc = hero.assessment.faults.find((f) => f.modeCode === "hpc_deterioration");
  if (!hpc?.reported) throw new Error(`HPC fault not reported: ${hpc?.probability}`);
  const rul = hero.assessment.rul.find((r) => r.moduleCode === "HPC");
  if (!rul || rul.hoursLow >= rul.hoursHigh) throw new Error("RUL range invalid");
  if (!hero.engine.plans.length) throw new Error("plan missing");
  const pending = await prisma.extractionField.count({ where: { status: "pending" } });
  if (pending < 8) throw new Error(`extraction queue thin: ${pending}`);
  const docs = await prisma.document.count({ where: { docClass: "shop_visit" } });
  if (docs < 2) throw new Error("shop docs missing");
  const kavirDocs = await listDocuments(kavir);
  const alborzDocs = await listDocuments(alborz);
  if (kavirDocs.visible.some((d) => d.id === "doc-alborz-lease")) throw new Error("Kavir saw Alborz file");
  if (!alborzDocs.visible.some((d) => d.id === "doc-alborz-lease")) throw new Error("Alborz missing own file");
  if (kavirDocs.visible.some((d) => d.id === "doc-rayyan-note")) throw new Error("owner saw MRO note");
  const rayyanDocs = await listDocuments(rayyan);
  const lanjanDocs = await listDocuments(lanjan);
  if (!rayyanDocs.visible.some((d) => d.id === "doc-rayyan-note")) throw new Error("Rayyan missing own note");
  if (lanjanDocs.visible.some((d) => d.id === "doc-rayyan-note")) throw new Error("Lanjan saw Rayyan note");
  if (rayyanDocs.visible.some((d) => d.engineId === "eng-697221")) throw new Error("Rayyan saw Lanjan engine doc");
  const mod = hero.assessment.modules.find((m) => m.code === "HPC");
  console.log(
    JSON.stringify(
      {
        engines,
        tsn: Math.round(hero.assessment.life.tsn),
        csn: Math.round(hero.assessment.life.csn),
        tso: Math.round(hero.assessment.life.tso),
        cso: Math.round(hero.assessment.life.cso),
        hpcHealth: mod?.healthIndex,
        hpcP: hpc.probability,
        rul: [rul.hoursLow, rul.hoursHigh, rul.confidence],
        llpRemaining: Math.round(llp.remaining),
        llpPct: Number(llp.remainingPct.toFixed(1)),
        faults: hero.assessment.faults.filter((f) => f.reported).map((f) => [f.modeCode, f.probability]),
        withheldKavir: kavirDocs.withheld,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
