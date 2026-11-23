export type LifeEvent = {
  eventAt: Date;
  kind: string;
  flightHours: number;
  flightCycles: number;
};

export type ShopMark = {
  type: string;
  releasedAt: Date | null;
  performedAt: Date;
};

export type LifeTotals = {
  tsn: number;
  csn: number;
  tso: number;
  cso: number;
  tslsv: number;
  cslsv: number;
  flightHours: number;
  flightCycles: number;
  lastShop: Date | null;
};

const SHOP = new Set(["shop_visit", "overhaul"]);

export function reconstruct(events: LifeEvent[], shops: ShopMark[], asOf: Date): LifeTotals {
  const until = events.filter((e) => e.eventAt <= asOf);
  const flight = until.filter((e) => e.kind === "flight");
  const withTime = until.filter((e) => e.kind === "flight" || e.kind === "ground_run");
  const tsn = withTime.reduce((s, e) => s + e.flightHours, 0);
  const csn = flight.reduce((s, e) => s + e.flightCycles, 0);
  const flightHours = flight.reduce((s, e) => s + e.flightHours, 0);
  const releases = shops
    .filter((r) => SHOP.has(r.type) && r.releasedAt && r.releasedAt <= asOf)
    .map((r) => r.releasedAt as Date)
    .sort((a, b) => b.getTime() - a.getTime());
  const lastShop = releases[0] ?? null;
  const since = lastShop?.getTime() ?? 0;
  const after = until.filter((e) => e.eventAt.getTime() > since);
  const tso = after
    .filter((e) => e.kind === "flight" || e.kind === "ground_run")
    .reduce((s, e) => s + e.flightHours, 0);
  const cso = after.filter((e) => e.kind === "flight").reduce((s, e) => s + e.flightCycles, 0);
  return {
    tsn,
    csn,
    tso,
    cso,
    tslsv: tso,
    cslsv: cso,
    flightHours,
    flightCycles: csn,
    lastShop,
  };
}

export function latestByVersion<T extends { versionGroupId: string; version: number }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const prev = map.get(row.versionGroupId);
    if (!prev || row.version > prev.version) map.set(row.versionGroupId, row);
  }
  return [...map.values()];
}

export type InstallWindow = {
  engineId: string;
  installedAt: Date;
  removedAt: Date | null;
};

export function cyclesInWindow(events: LifeEvent[], start: Date, end: Date) {
  let cycles = 0;
  let hours = 0;
  for (const event of events) {
    if (event.eventAt <= start || event.eventAt > end) continue;
    if (event.kind === "flight") {
      cycles += event.flightCycles;
      hours += event.flightHours;
    } else if (event.kind === "ground_run") {
      hours += event.flightHours;
    }
  }
  return { cycles, hours };
}
