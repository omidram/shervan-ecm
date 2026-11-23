export function healthColor(index: number | null | undefined) {
  if (index == null || Number.isNaN(index)) return "#6d7f90";
  if (index >= 85) return "#2ea872";
  if (index >= 70) return "#d39a32";
  return "#d85a4c";
}

export function healthTone(index: number | null | undefined) {
  if (index == null) return "muted";
  if (index >= 85) return "good";
  if (index >= 70) return "watch";
  return "bad";
}

export function metalTint(index: number | null | undefined, amount = 0.46) {
  const tint = healthColor(index);
  const base = [186, 198, 208];
  const n = Number.parseInt(tint.slice(1), 16);
  const src = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mix = src.map((channel, i) => Math.round(base[i] * (1 - amount) + channel * amount));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}
