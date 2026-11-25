"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Cutaway } from "./cutaway";
import { L, type Locale } from "@/lib/i18n";
import { fmtNum } from "@/lib/format";
import { moduleOfStation } from "@/lib/mesh-map";
import { MESH_SYSTEM } from "@/lib/plates";

const Engine3D = dynamic(() => import("./engine-3d"), {
  ssr: false,
  loading: () => <div className="canvas-box" />,
});

const SuppliedEngine = dynamic(() => import("./supplied-engine"), {
  ssr: false,
  loading: () => <div className="canvas-box" />,
});

export type StudioModule = {
  code: string;
  name: string;
  nameFa: string;
  stageNote: string;
  healthIndex: number | null;
  effDelta: number | null;
  prDelta: number | null;
  evidenceFa: string[];
  evidenceEn: string[];
  defects: { id: string; descriptionFa: string; descriptionEn: string; severity: string; status: string }[];
};

export type StudioPart = {
  id: string;
  moduleCode: string;
  short: string;
  name: string;
  nameFa: string;
  partNumber: string;
  serialNumber: string;
  health: number | null;
  cycles: number | null;
  lifeRemaining: number | null;
  findingFa: string;
  findingEn: string;
};

export function GasStudio({
  modules,
  parts,
  initial,
  initialPart,
  locale,
}: {
  modules: StudioModule[];
  parts: StudioPart[];
  initial: string;
  initialPart?: string;
  locale: Locale;
}) {
  const [isolated, setIsolated] = useState<string[]>(initialPart ? [initialPart] : []);
  const [meshes, setMeshes] = useState<string[]>([]);
  const [linked, setLinked] = useState<{ id: string; station: string }[]>([]);
  const [systems, setSystems] = useState<Record<string, string>>({});
  const onShown = useCallback((rows: { id: string; station: string }[]) => {
    setLinked((prev) => {
      const key = rows.map((row) => `${row.id}:${row.station}`).join("|");
      const prevKey = prev.map((row) => `${row.id}:${row.station}`).join("|");
      return key === prevKey ? prev : rows;
    });
  }, []);
  const [frameKey, setFrameKey] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [multi, setMulti] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [supplied, setSupplied] = useState<"checking" | "ready" | "missing">("checking");
  const [armModel, setArmModel] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setArmModel(true), 700);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!armModel) return;
    let cancel = false;
    fetch("/models/engine_cfm56-7b.glb", { method: "HEAD", redirect: "manual" })
      .then((response) => {
        const type = response.headers.get("content-type") || "";
        const file = response.status === 200 && !type.includes("text/html");
        if (!cancel) setSupplied(file ? "ready" : "missing");
      })
      .catch(() => {
        if (!cancel) setSupplied("missing");
      });
    return () => {
      cancel = true;
    };
  }, [armModel]);
  const focusId = isolated[isolated.length - 1] ?? initial;
  const part = parts.find((item) => item.id === focusId) ?? null;
  const mod = modules.find((item) => item.code === (part?.moduleCode ?? focusId)) ?? modules[0];
  function pick(id: string, shift = false) {
    setMeshes([]);
    setIsolated((current) => {
      if (shift || multi) return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      return [id];
    });
  }
  function onMesh(id: string, shift: boolean, system: string, station: string) {
    setSystems((current) => ({ ...current, [id]: system }));
    setMeshes((current) => {
      if (shift || multi) return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      return [id];
    });
    if (!station) return;
    setIsolated((current) => {
      if (shift || multi) return current.includes(station) ? current.filter((item) => item !== station) : [...current, station];
      return [station];
    });
  }
  return (
    <div className="stack">
      <div className="gas-layout">
        <div className="stage" dir="ltr">
          <Cutaway
            modules={modules}
            stations={parts.map((item) => ({ id: item.id, moduleCode: item.moduleCode, health: item.health, short: item.short }))}
            selected={focusId}
            isolated={isolated}
            onSelect={pick}
            locale={locale}
          />
          <div className="station-picks">
            {parts.map((item) => (
              <button key={item.id} type="button" className={isolated.includes(item.id) ? "on" : ""} data-station={item.id} onClick={(event) => pick(item.id, event.shiftKey)}>
                {item.short}
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="kicker">{part ? part.id : mod.code}</div>
          <h2>{part ? (locale === "fa" ? part.nameFa : part.name) : locale === "fa" ? mod.nameFa : mod.name}</h2>
          <p className="muted">{part ? part.moduleCode : mod.stageNote}</p>
          {part ? (
            <>
              <div className="pair"><span>P/N</span><b className="num">{part.partNumber}</b></div>
              <div className="pair"><span>S/N</span><b className="num">{part.serialNumber}</b></div>
              <div className="pair"><span>{L(locale, "سلامت قطعه", "Part health")}</span><b className="num">{part.health ?? "—"}</b></div>
              <div className="pair"><span>{L(locale, "سیکل", "Cycles")}</span><b className="num">{part.cycles ?? "—"}</b></div>
              <div className="pair"><span>{L(locale, "مانده عمر", "Life remaining")}</span><b className="num">{part.lifeRemaining ?? "—"}</b></div>
              <h3>{L(locale, "یافته", "Finding")}</h3>
              <p>{(locale === "fa" ? part.findingFa : part.findingEn) || L(locale, "یافته بازی برای این قطعه نیست.", "No open finding on this part.")}</p>
            </>
          ) : null}
          <div className="pair">
            <span>{L(locale, "شاخص سلامت", "Health index")}</span>
            <b className="num">{mod.healthIndex == null ? "—" : fmtNum(mod.healthIndex, 0)}</b>
          </div>
          <div className="pair">
            <span>{L(locale, "دلتای راندمان مطالعاتی", "Study efficiency delta")}</span>
            <b className="num">{mod.effDelta == null ? "—" : `${fmtNum(mod.effDelta, 1)}%`}</b>
          </div>
          <div className="pair">
            <span>{L(locale, "دلتای نسبت فشار", "Pressure-ratio delta")}</span>
            <b className="num">{mod.prDelta == null ? "—" : `${fmtNum(mod.prDelta, 1)}%`}</b>
          </div>
          <h3>{L(locale, "شواهد", "Evidence")}</h3>
          <ul>
            {(locale === "fa" ? mod.evidenceFa : mod.evidenceEn).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3>{L(locale, "عیوب مرتبط", "Related defects")}</h3>
          {mod.defects.length === 0 ? (
            <p className="muted">{L(locale, "یافته بازی برای این ماژول نیست.", "No open finding on this module.")}</p>
          ) : (
            mod.defects.map((defect) => (
              <p key={defect.id}>
                <span className="badge watch">{defect.severity}</span> {locale === "fa" ? defect.descriptionFa : defect.descriptionEn}
              </p>
            ))
          )}
          <p className="note">
            {L(
              locale,
              "دلتاها برآورد ساده مسیر گاز از مانده عملکرد هستند، نه خروجی حل‌گر ترمودینامیکی سازنده.",
              "Deltas are a simplified gas-path residual, not an OEM thermodynamic solution.",
            )}
          </p>
        </div>
      </div>
      <div className="stage" dir="ltr">
        <div className="view-toggle">
          <button type="button" className={cutaway ? "btn" : "btn ghost"} data-view="cutaway" onClick={() => setCutaway(true)}>
            {L(locale, "برش", "Cutaway")}
          </button>
          <button type="button" className={cutaway ? "btn ghost" : "btn"} data-view="cowl" onClick={() => setCutaway(false)}>
            {L(locale, "پوسته", "Cowl")}
          </button>
        </div>
        <div className="canvas-box" data-model={armModel && supplied === "ready" ? "loading" : supplied}>
          {armModel && supplied === "ready" ? (
            <SuppliedEngine
              isolated={meshes}
              stations={isolated}
              frameKey={frameKey}
              zoom={zoom}
              onSelect={onMesh}
              onShown={onShown}
              fallback={
                <Engine3D
                  modules={modules}
                  stationHealth={Object.fromEntries(parts.map((item) => [item.id, item.health]))}
                  selected={focusId}
                  isolated={isolated}
                  onSelect={pick}
                  cutaway={cutaway}
                />
              }
            />
          ) : armModel && supplied === "missing" ? (
            <Engine3D
              modules={modules}
              stationHealth={Object.fromEntries(parts.map((item) => [item.id, item.health]))}
              selected={focusId}
              isolated={isolated}
              onSelect={pick}
              cutaway={cutaway}
            />
          ) : (
            <p className="model-wait">{L(locale, "مدل سه‌بعدی بعد از آماده شدن صفحه بارگذاری می‌شود.", "The 3D model loads after the page is ready.")}</p>
          )}
        </div>
        <div className="view-toggle" data-view-controls>
          <button type="button" className="btn" data-zoom="in" onClick={() => setZoom((value) => value + 1)}>
            {L(locale, "بزرگ‌نمایی", "Zoom in")}
          </button>
          <button type="button" className="btn" data-zoom="out" onClick={() => setZoom((value) => value - 1)}>
            {L(locale, "کوچک‌نمایی", "Zoom out")}
          </button>
          <button type="button" className="btn" data-reset-view onClick={() => setFrameKey((value) => value + 1)}>
            {L(locale, "بازنشانی نما", "Reset view")}
          </button>
          <button type="button" className="btn" data-show-all onClick={() => { setIsolated([]); setMeshes([]); setLinked([]); }}>
            {L(locale, "نمایش کل موتور", "Show the whole engine")}
          </button>
          <button type="button" className={multi ? "btn" : "btn ghost"} data-multi={multi ? "on" : "off"} onClick={() => setMulti((value) => !value)}>
            {L(locale, "انتخاب چند قطعه", "Select several parts")}
          </button>
          {linked.length > 0 ? <span className="note">{linked.map((row) => row.station).filter((item, index, list) => list.indexOf(item) === index).join(" · ")}</span> : null}
        </div>
        {linked.length > 0 ? (
          <div className="panel" data-mesh-count={linked.length} data-linked-station={linked.map((row) => row.station).filter((item, index, list) => list.indexOf(item) === index).join(" ")}>
            {linked.map((row) => {
              const system = systems[row.id] || moduleOfStation(row.station);
              const copy = MESH_SYSTEM[system] ?? MESH_SYSTEM.FAN;
              return (
                <p key={row.id} data-mesh={row.id}><b className="num">{row.id}</b> · {row.station} · {system}. {locale === "fa" ? copy.fa : copy.en}</p>
              );
            })}
          </div>
        ) : null}
        <div className="hotspots">
          {modules.map((item) => (
            <button key={item.code} type="button" className={isolated.includes(item.code) || item.code === mod.code ? "on" : ""} onClick={(event) => pick(item.code, event.shiftKey)} data-select={item.code}>
              {item.code}
              <span className="num"> {item.healthIndex ?? "—"}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="note">
        {L(
          locale,
          "برش و مدل یک ایستگاه را با هم نشان می‌دهند. قطعهٔ انتخاب‌شده مات و قاب‌بندی می‌ماند و بقیهٔ موتور کم‌رنگ و شفاف دیده می‌شود. Shift قطعهٔ دیگری را هم مات نگه می‌دارد. بزرگ‌نمایی، بازنشانی نما، و چرخش مدل هنگام انتخاب هم کار می‌کنند. نمایش کل موتور شفافیت را برمی‌گرداند.",
          "The section and the model name the same station. The selected part stays opaque and framed. Every other part stays visible, faint, and transparent. Shift keeps added parts opaque together. Zoom, reset, and orbit stay usable while a part is selected. Show the whole engine restores full opacity.",
        )}
      </p>
    </div>
  );
}
