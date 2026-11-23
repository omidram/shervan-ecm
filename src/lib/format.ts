export function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export function fmtNum(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInt(value: number | null | undefined) {
  return fmtNum(value, 0);
}

export function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

export function parseDay(input: string | undefined | null, fallback = new Date()) {
  if (!input) return fallback;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return fallback;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

export function endOfDay(input: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return new Date();
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59));
}
