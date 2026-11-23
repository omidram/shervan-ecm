import { notFound } from "next/navigation";
import { GasStudio, type StudioPart } from "@/components/gas-studio";
import { PlateBoard } from "@/components/plate-board";
import { PlanningBanner } from "@/components/ui";
import { L } from "@/lib/i18n";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";
import { STATIONS, stationFinding, stationHealth } from "@/lib/stations";

export default async function GasPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string; p?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [locale, persona] = await Promise.all([getLocale(), getPersona()]);
  const found = await getEngine(id, persona);
  if (!found) notFound();
  const initial = sp.m || found.assessment.limiting || found.assessment.modules[0]?.code || "FAN";
  const parts: StudioPart[] = STATIONS.map((station) => {
    const moduleRow = found.assessment.modules.find((item) => item.code === station.moduleCode);
    const live = found.engine.compInstalls.find((row) => !row.removedAt && (row.position === station.id || row.component.partNumber === station.partNumber));
    const llp = found.assessment.llp.find((item) => item.componentId === live?.component.id || item.partNumber === station.partNumber);
    const finding = stationFinding(found.engine.id, station.id);
    const defect = moduleRow?.defects[0];
    return {
      id: station.id,
      moduleCode: station.moduleCode,
      short: station.short,
      name: station.name,
      nameFa: station.nameFa,
      partNumber: live?.component.partNumber ?? station.partNumber,
      serialNumber: live?.component.serialNumber ?? "—",
      health: stationHealth(found.engine.id, station.id, moduleRow?.healthIndex ?? null),
      cycles: llp ? Math.round(llp.cyclesUsed) : Math.round(found.assessment.life.csn),
      lifeRemaining: llp ? Math.round(llp.remaining) : null,
      findingFa: finding.fa || defect?.descriptionFa || "",
      findingEn: finding.en || defect?.descriptionEn || "",
    };
  });
  return (
    <div>
      <header className="page-head">
        <div>
          <p className="kicker">{found.engine.model.code} · {found.engine.serialNumber}</p>
          <h1>{L(locale, "مسیر گاز", "Gas path")}</h1>
        </div>
      </header>
      <PlanningBanner locale={locale} />
      <GasStudio key={`${initial}-${sp.p || ""}`} modules={found.assessment.modules} parts={parts} initial={initial} initialPart={sp.p} locale={locale} />
      <PlateBoard locale={locale} topics={["flow", "sensors", "compressor", "vbv", "hptacc"]} />
    </div>
  );
}
