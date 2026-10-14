// Shared by the Pages Functions (link previews). Mirrors the bits of site/app.js that pick an exam's next
// sitting and say how far away it is, so a preview says the same thing the page does.

export const SITE = "pasado.ruzcko.dev";
export const COLORS = {
  bg1: "#1b2850", bg2: "#0b1022", text: "#f7f1e3", muted: "#b4bcd2", line: "#2c3966",
  num: "#ffc53d", bubble: "#ff6b5e", exam: "#85a9ff", deadline: "#ff6b5e", results: "#4cd18a", opens: "#a3abc2",
};
const DAY = 86400000;

let cached = null, cachedAt = 0;
export async function loadData(env, origin) {
  if (cached && Date.now() - cachedAt < 10 * 60 * 1000) return cached;
  const res = await env.ASSETS.fetch(new URL("/data/exams.json", origin));
  cached = await res.json();
  cachedAt = Date.now();
  return cached;
}

export const cleanKey = (k) => (k || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48);
const at = (iso, end = false) => Date.parse(`${iso}T${end ? "23:59:59" : "00:00:00"}+08:00`);
const noon = (iso) => new Date(`${iso}T12:00:00+08:00`);
const manilaToday = (now) => new Date(now + 8 * 3600000).toISOString().slice(0, 10);
export const dayDiff = (iso, now) => Math.round((noon(iso) - noon(manilaToday(now))) / DAY);

// The next local (not SPLE) sitting whose exam hasn't ended: announced dates first, then estimates.
export function pick(ex, now) {
  let real = null, est = null;
  for (const s of ex.sittings) {
    if (s.cancelled || s.variant === "sple") continue;
    const t = at(s.days[0]), end = at(s.days[s.days.length - 1], true);
    if (end <= now) continue;
    const it = { ex, s, t, day: s.days[0], ongoing: t <= now };
    if (s.est) { if (!est || t < est.t) est = it; } else if (!real || t < real.t) real = it;
  }
  return real || est;
}

export function nextOverall(data, now) {
  let best = null;
  for (const ex of data.exams) {
    const p = pick(ex, now);
    if (p && !p.s.est && !p.ongoing && (!best || p.t < best.t)) best = p;
  }
  return best;
}

export function countdown(p, now) {
  if (p.ongoing) return ["Today", "exam ongoing"];
  const n = dayDiff(p.day, now);
  if (p.s.est) return n >= 60 ? [`~${Math.round(n / 30.44)}`, "months to the exam (est.)"] : [`~${Math.max(1, Math.round(n / 7))}`, "weeks to the exam (est.)"];
  if (n <= 0) return ["Today", "is exam day"];
  return [String(n), `${n === 1 ? "day" : "days"} to the exam`];
}
export function humanCount(p, now) {
  const [n, unit] = countdown(p, now);
  return /^[~\d]/.test(n) ? `${n} ${unit.split(" ")[0]}` : n.toLowerCase();
}

const F = (o) => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", ...o });
export function whenText(s) {
  if (s.est) return "around " + F({ month: "long", year: "numeric" }).format(noon(s.days[0]));
  const days = s.days;
  const f = F({ month: "short", day: "numeric", year: "numeric" });
  if (days.length === 1) return f.format(noon(days[0]));
  const contiguous = days.every((d, i) => !i || (noon(d) - noon(days[i - 1])) / DAY === 1);
  if (contiguous) return f.formatRange(noon(days[0]), noon(days[days.length - 1]));
  return days.map((d) => F({ month: "short", day: "numeric" }).format(noon(d))).join(", ") + ", " + days[days.length - 1].slice(0, 4);
}
export const code = (ex) => (ex.short && ex.short[0]) || "";
export const examTitle = (ex) => ex.label || `${ex.name}${code(ex) ? ` (${code(ex)})` : ""} board exam`;
export const cheer = (ex) => (ex.title ? `Laban, future ${ex.title}!` : "Laban, kaya mo 'yan!");
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
