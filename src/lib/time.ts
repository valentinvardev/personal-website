import type { Lang } from "./content";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

/** "hace 3 días" / "3 days ago" — para el feed de escritos. */
export function timeAgo(date: Date, lang: Lang): string {
  const diff = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(lang === "en" ? "en" : "es", { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return lang === "en" ? "just now" : "recién";
}

/** "5 jul 2026" / "Jul 5, 2026" — para metadatos y titles. */
export function shortDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(lang === "en" ? "en-US" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "2,4 MB" — tamaño de adjuntos. */
export function formatBytes(bytes: number | null | undefined, lang: Lang): string {
  if (bytes == null || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(lang === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 1 })} ${units[i]}`;
}
