import { CONDITION_INFO, departmentById, type Condition } from "@droba/shared";

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-US");

export const compact = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n));

export function distance(m: number | null | undefined) {
  if (m == null) return null;
  if (m < 1000) return `${Math.max(100, Math.round(m / 100) * 100)} m away`;
  return `${m < 10_000 ? (m / 1000).toFixed(1).replace(/\.0$/, "") : Math.round(m / 1000)} km away`;
}

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "D";

export const firstName = (name = "") => name.trim().split(/\s+/)[0] ?? "";

export const conditionLabel = (c: Condition) => CONDITION_INFO[c].label;

/** "With box" / "Tags on" / "Papers complete" depending on the department */
export function extraLabel(department: string) {
  const map: Record<string, string> = { fashion: "Tags on", furniture: "Assembly guide", vehicles: "Papers complete", "books-hobbies": "Original packaging" };
  return map[department] ?? "With box";
}

export const departmentLabel = (id: string) => departmentById(id)?.label ?? id;

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
