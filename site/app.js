"use strict";

const STORE = "pasado:v1";
const HOST = "pasado.ruzcko.dev";
const TZ = "Asia/Manila";
const DAY = 86400000;
const POPULAR = ["nurses", "teachers", "cpa", "bar", "cse", "civil-engineers", "criminologists", "medical-technologists", "psychometricians", "electrical-engineers"];
const FOCUS = {
  exam: { label: "Exam", long: "Exam day", unit: "to the exam" },
  deadline: { label: "Apply by", long: "Last day to apply", unit: "to apply" },
  results: { label: "Results", long: "Results (target)", unit: "to results" },
};
const $ = (id) => document.getElementById(id);

const state = {
  q: "",
  focus: "exam",
  cat: null,
  mine: false,
  sple: false,
  starred: new Set(),
  open: new Set(),
  theme: "auto",
  shared: null, // Set of exam keys from a shared ?my= link
  spot: null, // exam opened from a shared /<key> link: the hero shows it
  heroKey: null, // which of my exams the hero counts down to
  picking: false, // the hero is showing the exam picker
  replacing: null, // "Change exam": the exam the next pick replaces
};
let DATA = null;
let EXAMS = new Map();

// ---- persistence (per-viewer convenience only) ----
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "{}");
    if (FOCUS[s.focus]) state.focus = s.focus;
    if (Array.isArray(s.starred)) state.starred = new Set(s.starred);
    if (typeof s.cat === "string") state.cat = s.cat;
    state.mine = !!s.mine;
    state.sple = !!s.sple;
    if (typeof s.heroKey === "string") state.heroKey = s.heroKey;
    if (["light", "dark"].includes(s.theme)) state.theme = s.theme;
  } catch (_) { /* storage unavailable */ }
}
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ focus: state.focus, starred: [...state.starred], cat: state.cat, mine: state.mine, sple: state.sple, theme: state.theme, heroKey: state.heroKey }));
  } catch (_) { /* storage unavailable */ }
}

// ---- dates (all Philippine time) ----
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const at = (iso, end = false) => Date.parse(`${iso}T${end ? "23:59:59" : "00:00:00"}+08:00`);
const noon = (iso) => new Date(`${iso}T12:00:00+08:00`);
const F = (opts) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts });
const fDay = F({ month: "short", day: "numeric", year: "numeric" });
const fDayShort = F({ month: "short", day: "numeric" });
const fWeekday = F({ weekday: "short" });
const fWeekDay = F({ weekday: "short", month: "short", day: "numeric" });
const fMonth = F({ month: "long", year: "numeric" });
const fMonthShort = F({ month: "short", year: "numeric" });
const todayIso = () => F({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).reduce((o, p) => ({ ...o, [p.type]: p.value }), {});
function today() { const p = todayIso(); return `${p.year}-${p.month}-${p.day}`; }
const dayDiff = (iso) => Math.round((noon(iso) - noon(today())) / DAY);
const sameYear = (iso) => iso.slice(0, 4) === today().slice(0, 4);

// "Aug 29–30, 2026", "Jan 20 & 22, 2026", "Jan 30 – Feb 2, 2026"
function fmtDays(days, { year = true } = {}) {
  if (!days || !days.length) return "";
  const first = days[0], last = days[days.length - 1];
  const contiguous = days.every((d, i) => !i || dayDiff(d) - dayDiff(days[i - 1]) === 1);
  const fmt = year ? fDay : fDayShort;
  if (days.length === 1) return fmt.format(noon(first));
  if (contiguous) return fmt.formatRange(noon(first), noon(last));
  const month = (d) => d.slice(0, 7);
  if (days.every((d) => month(d) === month(first))) {
    const nums = days.map((d) => String(Number(d.slice(8))));
    const list = nums.length === 2 ? nums.join(" & ") : nums.slice(0, -1).join(", ") + " & " + nums[nums.length - 1];
    return `${fMonthShort.format(noon(first)).split(" ")[0]} ${list}${year ? ", " + first.slice(0, 4) : ""}`;
  }
  return days.map((d) => fDayShort.format(noon(d))).join(", ") + (year ? ", " + last.slice(0, 4) : "");
}
// "Sat–Sun" for a short run of consecutive days; nothing for long or broken runs (practical exams over a week).
function weekdays(days) {
  if (days.length === 1) return fWeekday.format(noon(days[0]));
  const contiguous = days.every((d, i) => !i || dayDiff(d) - dayDiff(days[i - 1]) === 1);
  return contiguous && days.length <= 3 ? `${fWeekday.format(noon(days[0]))}–${fWeekday.format(noon(days[days.length - 1]))}` : "";
}
const withWeekdays = (days, opts) => [weekdays(days), fmtDays(days, opts)].filter(Boolean).join(", ");
function fmtOne(iso, est) {
  if (est) return "around " + fMonth.format(noon(iso));
  return (sameYear(iso) ? fWeekDay : fDay).format(noon(iso));
}
function relDays(iso, end = false) {
  const n = dayDiff(iso);
  if (n === 0) return end ? "today is the last day" : "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return n < 60 ? `in ${n} days` : `in ${Math.round(n / 30.44)} months`;
  return -n < 60 ? `${-n} days ago` : "done";
}

// ---- model ----
function milestones(s) {
  const out = [];
  if (s.opens) out.push({ k: "opens", label: "Applications open", day: s.opens, t: at(s.opens) });
  if (s.deadline) out.push({ k: "deadline", label: "Last day to apply", day: s.deadline, t: at(s.deadline, true) });
  out.push({ k: "exam", label: s.days.length > 1 ? "Exam days" : "Exam day", day: s.days[0], days: s.days, t: at(s.days[0]), tEnd: at(s.days[s.days.length - 1], true) });
  if (s.results) out.push({ k: "results", label: "Results (target)", day: s.results, t: at(s.results) });
  return out;
}
function target(s, focus) {
  if (focus === "exam") return { t: at(s.days[0]), end: at(s.days[s.days.length - 1], true), day: s.days[0] };
  const day = s[focus];
  return day ? { t: at(day, focus === "deadline"), end: at(day, focus === "deadline"), day } : null;
}
// The sitting a row is about: the soonest one still ahead for this focus (announced dates before estimates).
function pick(ex, focus = state.focus, now = Date.now()) {
  let real = null, est = null;
  for (const s of ex.sittings) {
    if (s.cancelled || (s.variant === "sple") !== spleMode(ex)) continue;
    const tg = target(s, focus);
    if (!tg || tg.end <= now) continue;
    const it = { ex, s, ...tg, ongoing: focus === "exam" && tg.t <= now };
    if (s.est) { if (!est || it.t < est.t) est = it; }
    else if (!real || it.t < real.t) real = it;
  }
  return real || est;
}
// SPLE sittings (abroad) replace the local ones only when that filter is on.
const spleMode = (ex) => state.sple && ex.sittings.some((s) => s.variant === "sple");
function matches(ex) {
  if (state.shared) return state.shared.has(ex.key) && matchesQuery(ex);
  if (state.mine && !state.starred.has(ex.key)) return false;
  if (state.cat && ex.category !== state.cat) return false;
  if (state.sple && !ex.sittings.some((s) => s.variant === "sple")) return false;
  return matchesQuery(ex);
}
function matchesQuery(ex) {
  if (!state.q) return true;
  const hay = [ex.name, ex.key, ...(ex.short || []), ...(ex.aliases || []), agencyOf(ex).name || "", ex.title || "", DATA.categories[ex.category] || "", ex.note || ""].join(" ").toLowerCase();
  return state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w) || hay.includes(w.replace(/ing$/, "")));
}
function rowsFor(filter = matches) {
  const now = Date.now();
  const rows = [];
  let none = 0;
  for (const ex of DATA.exams) {
    if (!filter(ex)) continue;
    const p = pick(ex, state.focus, now);
    if (p) rows.push(p); else none++;
  }
  rows.sort((a, b) => a.t - b.t || a.ex.name.localeCompare(b.ex.name));
  return { rows, none };
}
const code = (ex) => (ex.short && ex.short[0]) || "";
const isPrc = (ex) => (ex.agency || "prc") === "prc";
const agencyOf = (ex) => (DATA.agencies || {})[ex.agency || "prc"] || {};
const examLabel = (ex) => ex.label || `${ex.name} board exam`;

// ---- countdown text ----
function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
}
// The row box: whole calendar days, Philippine time.
function cdBox(p) {
  if (p.ongoing) return ["Now", ""];
  const n = dayDiff(p.day);
  if (p.s.est) return n >= 60 ? [`~${Math.round(n / 30.44)}`, "months"] : [`~${Math.max(1, Math.round(n / 7))}`, "weeks"];
  if (n <= 0) return ["Today", state.focus === "deadline" ? "last day" : ""];
  return [String(n), n === 1 ? "day" : "days"];
}
function urgency(p) {
  if (p.s.est || p.ongoing) return "";
  const n = dayDiff(p.day);
  return n <= 7 ? "u-hot" : n <= 30 ? "u-warm" : "";
}

// ---- rendering: toolbar ----
function renderToolbar() {
  for (const b of $("focus").querySelectorAll("[data-focus]")) b.setAttribute("aria-checked", b.dataset.focus === state.focus);
  const counts = {};
  for (const ex of DATA.exams) counts[ex.category] = (counts[ex.category] || 0) + 1;
  const n = state.starred.size;
  const cats = Object.entries(DATA.categories).filter(([k]) => counts[k]);
  $("chips").innerHTML =
    `<button class="chip mine" type="button" data-chip="mine" aria-pressed="${state.mine}">${ICON.starFilled}My exams${n ? ` <span class="n">${n}</span>` : ""}</button>` +
    `<button class="chip" type="button" data-chip="all" aria-pressed="${!state.cat && !state.mine}">All <span class="n">${DATA.exams.length}</span></button>` +
    cats.map(([k, name]) => `<button class="chip" type="button" data-chip="cat" data-cat="${k}" aria-pressed="${state.cat === k}">${esc(name)} <span class="n">${counts[k]}</span></button>`).join("") +
    `<button class="chip sep" type="button" data-chip="sple" aria-pressed="${state.sple}" title="Special Professional Licensure Exams held abroad">Abroad (SPLE)</button>`;
}

const THEME_ICON = { auto: ICON.sunMoon, light: ICON.sun, dark: ICON.moon };
function applyTheme() {
  if (state.theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.theme;
  const b = $("themeBtn");
  b.innerHTML = THEME_ICON[state.theme];
  b.setAttribute("aria-label", `Theme: ${state.theme}. Click to change.`);
  b.title = `Theme: ${state.theme}`;
}

// ---- rendering: hero ----
function heroPick() {
  if (state.picking) return null;
  let keys = state.spot ? [state.spot] : state.shared ? [...state.shared] : [...state.starred];
  if (!state.spot && !state.shared && state.starred.has(state.heroKey)) keys = [state.heroKey];
  if (!keys.length) return null;
  const rows = keys.map((k) => EXAMS.get(k)).filter(Boolean).map((ex) => pick(ex)).filter(Boolean).sort((a, b) => (a.s.est - b.s.est) || a.t - b.t);
  return rows[0] || null;
}

function stepsHtml(s, focus, now = Date.now()) {
  return milestones(s).map((m) => {
    const done = (m.tEnd || m.t) <= now;
    const isTarget = m.k === focus;
    const hot = m.k === "deadline" && !done && !s.est && dayDiff(m.day) <= 14;
    const v = m.k === "exam" ? (s.est ? "~" + fMonthShort.format(noon(m.day)) : fmtDays(m.days, { year: false })) : s.est ? "~" + fMonthShort.format(noon(m.day)) : fDayShort.format(noon(m.day));
    const r = s.est ? "estimated" : done ? (m.k === "results" ? "released?" : "done") : relDays(m.day, m.k === "deadline");
    return `<li class="${done ? "done" : ""}${isTarget ? " is-target" : ""}${hot ? " hot" : ""}" style="--c:var(--m-${m.k})"><span class="k"><i></i>${esc(m.k === "deadline" ? "Apply by" : m.k === "opens" ? "Opens" : m.k === "exam" ? "Exam" : "Results")}</span><span class="v">${esc(v)}</span><span class="r">${esc(r)}</span></li>`;
  }).join("");
}

function renderHero() {
  const hero = $("hero");
  const p = heroPick();
  if (!p) return renderPicker(hero);
  const { ex, s } = p;
  const now = Date.now();
  const mine = state.starred.has(ex.key);
  hero.className = "hero" + (s.est ? " est" : "");
  hero.dataset.at = p.ongoing ? "" : String(p.t);
  const pr = parts(p.t - now);
  const unit = (n, k, l) => `<div class="unit"><span class="n" data-k="${k}">${String(n).padStart(2, "0")}</span><span class="l" data-l="${k}">${l}</span></div>`;
  const eyebrow = state.spot && !mine ? "Shared countdown" : state.shared ? "Shared list" : "Your exam";
  const focusLabel = { exam: s.days.length > 1 ? "Exam days" : "Exam day", deadline: "Last day to apply", results: "Results (target)" }[state.focus];
  const whenText = state.focus === "exam" ? (s.est ? "around " + fMonth.format(noon(s.days[0])) : withWeekdays(s.days)) : fmtOne(p.day, s.est);
  const clock = p.ongoing
    ? `<div class="clock"><div class="unit" style="max-width:none"><span class="n word">Now</span><span class="l">Galingan mo!</span></div></div>`
    : s.est
      ? `<div class="clock">${unit(Math.round(dayDiff(p.day) / 30.44), "mo", "months (est.)")}</div>`
      : `<div class="clock" role="timer" aria-label="Time left">${unit(pr.d, "d", pr.d === 1 ? "day" : "days")}${unit(pr.h, "h", "hours")}${unit(pr.m, "m", "min")}${unit(pr.s, "s", "sec")}</div>`;
  const variant = [s.phase, s.variant === "sple" ? "SPLE abroad" : "", s.cble ? "computer-based" : ""].filter(Boolean).join(" · ");
  hero.innerHTML = `
    ${switcher(ex.key)}
    <div class="eyebrow">${mine ? `<span class="star-mark">${ICON.starFilled}</span>` : ""}<span>${esc(eyebrow)} · ${esc(focusLabel)}</span></div>
    <h1><button type="button" data-open="${esc(ex.key)}">${esc(ex.name)}</button></h1>
    <p class="sub">${esc([ex.label || (code(ex) && code(ex) + " board exam"), isPrc(ex) ? "" : agencyOf(ex).name, variant].filter(Boolean).join(" · ") || "Board exam")}${s.est ? ` · <span class="badge est">Estimated</span>` : ""}</p>
    ${clock}
    <p class="when">${esc(whenText)}<small>${s.est ? `Projected from ${s.est_from}. PRC hasn't published ${s.year} dates yet.` : "Philippine time"}</small></p>
    <ul class="steps">${stepsHtml(s, state.focus, now)}</ul>
    <div class="hero-actions">
      ${mine ? "" : `<button class="pill" type="button" data-pick="${esc(ex.key)}">${ICON.star}Make this my exam</button>`}
      <button class="pill" type="button" data-sharecard="${esc(ex.key)}">${SHARE_ICON} Share countdown</button>
      ${s.est ? "" : calMenu(ex, s, "pill")}
      ${mine && !state.spot ? `<button class="pill" type="button" data-change="${esc(ex.key)}">Change exam</button><button class="pill ghost" type="button" data-remove="${esc(ex.key)}">Remove</button>` : ""}
      ${state.spot ? `<button class="pill" type="button" data-unspot>${state.starred.size ? "Back to my exams" : "Pick my own exam"}</button>` : ""}
    </div>`;
}

// With more than one exam picked, tabs at the top of the hero switch between them.
function switcher(current) {
  if (state.spot || state.shared || state.starred.size < 2) return "";
  const mine = [...state.starred].map((k) => EXAMS.get(k)).filter(Boolean);
  return `<div class="switcher" role="tablist" aria-label="My exams">${mine.map((ex) => `<button type="button" role="tab" data-hero="${esc(ex.key)}" aria-selected="${ex.key === current}">${esc(code(ex) || ex.name)}</button>`).join("")}<button type="button" data-change aria-label="Add another exam">+</button></div>`;
}

// No exam picked yet (or changing it): ask which one, with the common ones one tap away.
function renderPicker(hero) {
  hero.className = "hero picker";
  delete hero.dataset.at;
  const next = rowsFor((ex) => true).rows.find((r) => !r.s.est && !r.ongoing && dayDiff(r.day) > 0);
  const picks = POPULAR.map((k) => EXAMS.get(k)).filter(Boolean);
  hero.innerHTML = `
    <div class="eyebrow"><span>PRC boards, the Bar &amp; the CSE · ${esc(String(new Date().getFullYear()))}–${esc(String(new Date().getFullYear() + 1))}</span></div>
    <h1>${state.replacing ? `Change from ${esc(EXAMS.get(state.replacing)?.name || "")} to…` : state.picking ? "Add another exam" : "Which exam are you taking?"}</h1>
    <p class="sub">${state.picking ? `Tap one below, or find yours in the list and tap its <span class="i-inline">${ICON.star}</span>.` : "Pick yours for a countdown to the exam, the last day to apply and results day. Or find it in the list below."}</p>
    <div class="hero-actions picks">${picks.map((ex) => `<button class="pill${state.starred.has(ex.key) ? " on" : ""}" type="button" data-pick="${esc(ex.key)}">${esc(code(ex) ? `${ex.name.replace("Certified Public Accountants", "CPA").replace("Professional Teachers", "Teachers")} · ${code(ex)}` : ex.name)}</button>`).join("")}
      <button class="pill ghost" type="button" data-findexam>Other exam…</button>${state.picking ? `<button class="pill ghost" type="button" data-cancelpick>Cancel</button>` : ""}</div>
    ${next ? `<p class="when"><small>Next up: <b>${esc(next.ex.name)}</b>, ${esc(FOCUS[state.focus].long.toLowerCase())} ${esc(relDays(next.day, state.focus === "deadline"))} (${esc(fmtOne(next.day))})</small></p>` : ""}`;
}

// ---- rendering: list ----
function rowHtml(p) {
  const { ex, s } = p;
  const [big, small] = cdBox(p);
  const open = state.open.has(ex.key);
  const starred = state.starred.has(ex.key);
  const badges = [
    s.est ? `<span class="badge est">Estimated</span>` : "",
    s.variant === "sple" ? `<span class="badge sple">SPLE</span>` : "",
    s.orig_days ? `<span class="badge moved">Moved</span>` : "",
    (s.notices || []).length && !s.orig_days ? `<span class="badge notice">PRC notice</span>` : "",
  ].join("");
  const whenText = state.focus === "exam" ? (s.est ? "around " + fMonth.format(noon(s.days[0])) : withWeekdays(s.days, { year: !sameYear(s.days[0]) })) : fmtOne(p.day, s.est);
  const tags = [];
  if (state.focus !== "deadline" && !s.est && (s.deadline || s.opens)) {
    const n = s.deadline ? dayDiff(s.deadline) : -1;
    if (s.opens && dayDiff(s.opens) > 0) tags.push(`<span class="tag opens">Applications open ${esc(fDayShort.format(noon(s.opens)))}</span>`);
    else if (!s.deadline) tags.push(`<span class="tag apply">Applications open · until slots fill</span>`);
    else if (n >= 0) tags.push(`<span class="tag apply">Apply by ${esc(fDayShort.format(noon(s.deadline)))} · ${n === 0 ? "today" : n === 1 ? "1 day left" : `${n} days left`}</span>`);
  }
  if (state.focus !== "exam" && !s.est) tags.push(`<span class="tag">Exam ${esc(fmtDays(s.days, { year: false }))}</span>`);
  if (state.focus === "exam" && s.results && !s.est) tags.push(`<span class="tag">Results ~${esc(fDayShort.format(noon(s.results)))}</span>`);
  if (s.phase) tags.push(`<span class="tag">${esc(s.phase)}</span>`);
  const focusName = { exam: s.days.length > 1 ? "Exam days" : "Exam day", deadline: "Apply by", results: "Results" }[state.focus];
  return `<li class="row ${s.est ? "is-est" : urgency(p)}${p.ongoing ? " is-now" : ""}${open ? " open" : ""}" id="${esc(ex.key)}" data-key="${esc(ex.key)}">
    <div class="row-main" role="button" tabindex="0" aria-expanded="${open}">
      <div class="cd" data-day="${esc(p.day)}"><span class="big${/^[~\d]/.test(big) ? "" : " word"}">${esc(big)}</span><span class="small">${esc(small)}</span></div>
      <div class="info">
        <div class="t"><span class="name">${esc(ex.name)}</span>${code(ex) ? `<span class="code">${esc(code(ex))}</span>` : ""}${badges}</div>
        <div class="what" style="--c:var(--m-${state.focus})"><span class="sw"></span><b>${esc(focusName)}</b> · ${esc(whenText)}</div>
        ${tags.length ? `<div class="meta">${tags.join("")}</div>` : ""}
      </div>
      <div class="row-acts">
        <button class="star" type="button" data-star="${esc(ex.key)}" aria-pressed="${starred}" aria-label="${starred ? "Remove" : "Add"} ${esc(ex.name)} ${starred ? "from" : "to"} my exams">${starred ? ICON.starFilled : ICON.star}</button>
        <button class="share-btn" type="button" data-sharecard="${esc(ex.key)}" aria-label="Share a countdown card for ${esc(ex.name)}" title="Share countdown">${SHARE_ICON}</button>
      </div>
    </div>
    ${open ? details(p) : `<div class="details"></div>`}
  </li>`;
}

function details(p) {
  const { ex, s } = p;
  const now = Date.now();
  const tl = milestones(s).map((m) => {
    const done = (m.tEnd || m.t) <= now;
    const when = m.k === "exam" ? (s.est ? "around " + fMonth.format(noon(m.day)) : withWeekdays(m.days)) : fmtOne(m.day, s.est);
    const left = s.est ? "est." : done ? "done" : relDays(m.day, m.k === "deadline");
    return `<li class="${done ? "past" : ""}${m.k === state.focus ? " is-target" : ""}" style="--c:var(--m-${m.k})"><i></i><span><b>${esc(m.label)}</b><span class="d">${esc(when)}</span></span><span class="left">${esc(left)}</span></li>`;
  }).join("");
  const moved = s.orig_days ? `<p class="cancel-note">Moved from ${esc(fmtDays(s.orig_days))}.</p>` : "";
  const info = s.deadline_note ? `<p class="info-note">${esc(s.deadline_note)}</p>` : "";
  const est = s.est ? `<p class="est-note">PRC hasn't published the ${s.year} schedule yet. These dates are projected from ${s.est_from} (same weekday, a year later), so plan with them but don't book anything yet.</p>` : "";
  const notices = (s.notices || []).length ? `<div class="block"><h3>PRC notices</h3><ul class="notices">${s.notices.map((n) => `<li>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.text)}</a>` : esc(n.text)}</li>`).join("")}</ul></div>` : "";
  const centers = s.centers.length ? `<div class="block"><h3>Testing centers${s.est ? ` (${s.est_from})` : ""}</h3><p>${esc(s.centers.join(", "))}</p></div>` : "";
  const others = ex.sittings.filter((x) => x !== s && !x.cancelled && at(x.days[x.days.length - 1], true) > now);
  const otherList = others.length ? `<div class="block"><h3>Other sittings</h3><ul class="others">${others.slice(0, 8).map((x) => `<li>${esc(x.est ? "~" + fMonth.format(noon(x.days[0])) : fmtDays(x.days))}${x.phase ? ` · ${esc(x.phase)}` : ""}${x.variant === "sple" ? ` · SPLE (${esc(x.centers.join(", "))})` : ""}${x.est ? ` <span class="badge est">Estimated</span>` : ""}</li>`).join("")}${others.length > 8 ? `<li class="muted">+${others.length - 8} more</li>` : ""}</ul></div>` : "";
  const year = DATA.years[String(s.year)];
  const links = [
    isPrc(ex) && !s.est && s.deadline && dayDiff(s.deadline) >= 0 ? `<a class="ql primary" href="https://online.prc.gov.ph/" target="_blank" rel="noopener">Apply on LERIS ↗</a>` : "",
    ...(s.links || []).map((l) => `<a class="ql" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`),
    s.source ? `<a class="ql" href="${esc(s.source.url)}" target="_blank" rel="noopener">${esc(s.source.label)} ↗</a>` : "",
    s.program ? `<a class="ql" href="${esc(s.program)}" target="_blank" rel="noopener">Exam program ↗</a>` : "",
    s.requirements ? `<a class="ql" href="${esc(s.requirements)}" target="_blank" rel="noopener">Requirements ↗</a>` : "",
    s.source ? "" : year ? `<a class="ql" href="${esc(year.source)}" target="_blank" rel="noopener">PRC ${s.year} schedule ↗</a>` : `<a class="ql" href="https://www.prc.gov.ph/exam-schedules-menu" target="_blank" rel="noopener">PRC schedules ↗</a>`,
    s.est ? "" : calMenu(ex, s, "ql"),
    `<button class="ql" type="button" data-copylink="${esc(ex.key)}">Copy link</button>`,
  ].join("");
  return `<div class="details">${est}${moved}${info}<ul class="timeline">${tl}</ul>${notices}${centers}${otherList}<div class="links">${links}</div></div>`;
}

function calMenu(ex, s, cls) {
  const file = `${ex.key}${s.variant === "sple" ? "-sple" : ""}.ics`;
  const host = location.host || HOST;
  const https = `${location.protocol}//${host}/cal/${file}`;
  const webcal = `webcal://${host}/cal/${file}`;
  return `<details class="cal-menu"><summary class="${cls}">${ICON.calendar}Add to calendar</summary>
    <div class="menu">
      <a href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener">Google Calendar</a>
      <a href="${esc(webcal)}">Apple Calendar</a>
      <a href="https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent(examLabel(ex))}" target="_blank" rel="noopener">Outlook</a>
      <a href="${esc(https)}" download>Download .ics</a>
      <a href="#" data-copy="${esc(https)}">Copy feed link</a>
    </div></details>`;
}

// An open calendar menu stays inside the screen: shift it left when it would run past the right edge.
document.addEventListener("toggle", (ev) => {
  const d = ev.target;
  if (!(d instanceof HTMLDetailsElement) || !d.classList.contains("cal-menu") || !d.open) return;
  const menu = d.querySelector(".menu");
  menu.style.left = "";
  const r = menu.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  if (r.right > vw - 8) menu.style.left = `${Math.round(Math.max(8, vw - 8 - r.width) - d.getBoundingClientRect().left)}px`;
}, true);

function renderList() {
  const { rows, none } = rowsFor();
  const list = $("list");
  if (!rows.length) {
    const emptyMine = state.mine && !state.starred.size;
    list.innerHTML = `<div class="empty-state">${emptyMine
      ? `<h3>No exams picked yet</h3><p>Tap <span class="i-inline">${ICON.star}</span> on an exam to keep it here. Your list stays on this device.</p><button class="btn" type="button" data-chip="all">Show all exams</button>`
      : `<h3>Nothing matches</h3><p>No upcoming ${esc(FOCUS[state.focus].long.toLowerCase())} for these filters${none ? ` (${none} exam${none === 1 ? " has" : "s have"} nothing ahead)` : ""}.</p><button class="btn" type="button" data-chip="all">Show all exams</button>`}</div>`;
    return;
  }
  const groups = new Map();
  for (const r of rows) {
    const k = r.ongoing ? "now" : r.day.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  list.innerHTML = [...groups].map(([k, rs]) => `
    <section class="month">
      <h2>${k === "now" ? "Happening now" : esc(fMonth.format(noon(k + "-15")))}${rs.every((r) => r.s.est) ? " · estimated" : ""}</h2><span class="n">${rs.length}</span>
    </section>
    <ol class="rows">${rs.map(rowHtml).join("")}</ol>`).join("") +
    (none ? `<p class="empty-state" style="padding:16px 0">${none} more exam${none === 1 ? " has" : "s have"} no upcoming ${esc(FOCUS[state.focus].long.toLowerCase())} listed.</p>` : "");
}

function renderListbar() {
  const bar = $("listbar");
  if (state.shared) {
    const names = [...state.shared].map((k) => EXAMS.get(k)?.name).filter(Boolean);
    const allSaved = [...state.shared].every((k) => state.starred.has(k));
    bar.hidden = false;
    bar.innerHTML = `<span><b>Shared list</b> · ${esc(names.join(", "))}</span>
      <span class="lb-actions">${allSaved ? `<span class="muted">All in your exams</span>` : `<button class="pill" type="button" data-shared="save">${ICON.starFilled}Add all to my exams</button>`}
      <button class="pill" type="button" data-sharecard="list">Share card</button>
      <button class="pill" type="button" data-shared="exit">Show everything</button></span>`;
    return;
  }
  if (state.mine && state.starred.size) {
    bar.hidden = false;
    bar.innerHTML = `<span>${ICON.starFilled}<b>My exams</b> · ${state.starred.size} picked, kept on this device</span>
      <span class="lb-actions"><button class="pill" type="button" data-copymine>Copy link to my list</button><button class="pill" type="button" data-sharecard="list">Share card</button></span>`;
    return;
  }
  bar.hidden = true;
}

function renderBanner() {
  const b = $("estBanner");
  const ny = DATA.next_year;
  if (ny.published) { b.hidden = true; return; }
  b.hidden = false;
  b.innerHTML = `<b>${ny.year} dates are estimates.</b> PRC usually publishes next year's schedule between late October and December. Until then, ${ny.year} sittings here are projected from ${ny.year - 1}, and we check PRC's site every day for the real one.`;
}

function renderFoot() {
  const ago = (iso) => {
    if (!iso) return "";
    const h = (Date.now() - Date.parse(iso)) / 3600000;
    return h < 1 ? "less than an hour ago" : h < 48 ? `${Math.round(h)} hours ago` : `${Math.round(h / 24)} days ago`;
  };
  const years = Object.entries(DATA.years).filter(([y]) => Number(y) >= new Date().getFullYear()).map(([y, v]) => `<a href="${esc(v.source)}" target="_blank" rel="noopener">${y}</a>`);
  $("footSrc").innerHTML = `Dates from PRC's ${years.join(" and ")} Schedule of Examinations (checked ${esc(ago(DATA.checked_at))}), the Supreme Court's Bar Bulletins and the CSC's exam announcements.`;
}

function render() {
  renderToolbar();
  renderListbar();
  renderHero();
  renderBanner();
  renderList();
}

// ---- live ticking ----
function tick() {
  const hero = $("hero");
  if (hero.dataset.at) {
    const ms = Number(hero.dataset.at) - Date.now();
    if (ms <= 0) return render();
    const p = parts(ms);
    for (const k of ["d", "h", "m", "s"]) {
      const el = hero.querySelector(`[data-k="${k}"]`);
      if (el) el.textContent = String(p[k]).padStart(2, "0");
    }
    const l = hero.querySelector('[data-l="d"]');
    if (l) l.textContent = p.d === 1 ? "day" : "days";
  }
}
let lastDay = null;
function minute() {
  const d = today();
  if (d !== lastDay) { lastDay = d; render(); }
}

// ---- actions ----
async function copyText(text, el, done = "Copied") {
  const label = el.textContent;
  try {
    await navigator.clipboard.writeText(text);
    el.textContent = done;
    setTimeout(() => { el.textContent = label; }, 1500);
  } catch (_) { window.prompt("Copy this link", text); }
}
const examUrl = (key) => `${location.origin}/${encodeURIComponent(key)}`;
const listUrl = (keys) => `${location.origin}/?my=${[...keys].map(encodeURIComponent).join(",")}`;

function toggleStar(k) {
  if (state.starred.has(k)) { state.starred.delete(k); if (state.heroKey === k) state.heroKey = null; }
  else { state.starred.add(k); state.heroKey = k; state.picking = false; }
  if (state.spot === k && state.starred.has(k)) state.spot = null;
  save();
  render();
}

function openExam(k, { scroll = true } = {}) {
  const ex = EXAMS.get(k);
  if (!ex) return;
  state.open.add(k);
  if (!matches(ex) || !pick(ex)) {
    if (state.shared && !state.shared.has(k)) state.shared = null;
    state.q = ""; $("q").value = "";
    state.mine = false; state.cat = null;
    if (!pick(ex)) state.focus = "exam";
  }
  render();
  const el = document.getElementById(k);
  if (el && scroll) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setUrl(path) {
  try { history.replaceState(null, "", path); } catch (_) { /* file:// */ }
}

function bind() {
  $("q").addEventListener("input", (ev) => {
    state.q = ev.target.value.trim();
    renderList();
  });
  $("focus").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-focus]");
    if (!b) return;
    state.focus = b.dataset.focus;
    save(); render();
  });
  $("themeBtn").addEventListener("click", () => {
    state.theme = { auto: "light", light: "dark", dark: "auto" }[state.theme];
    applyTheme(); save();
  });
  $("aboutBtn").addEventListener("click", () => $("aboutdlg").showModal());
  $("aboutdlg").addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]") || ev.target === $("aboutdlg")) $("aboutdlg").close();
  });

  document.addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-chip]");
    if (chip) {
      const c = chip.dataset.chip;
      if (c === "mine") { state.mine = !state.mine || chip.closest(".hero") != null; state.cat = null; state.shared = null; }
      else if (c === "all") { state.mine = false; state.cat = null; state.shared = null; state.sple = false; state.q = ""; $("q").value = ""; }
      else if (c === "cat") { state.cat = state.cat === chip.dataset.cat ? null : chip.dataset.cat; state.mine = false; }
      else if (c === "sple") state.sple = !state.sple;
      if (state.spot) { state.spot = null; setUrl("/"); }
      save(); render();
      if (chip.closest(".hero, .empty-state")) $("toolbar").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const star = ev.target.closest("[data-star]");
    if (star) { toggleStar(star.dataset.star); return; }
    const pk = ev.target.closest("[data-pick]");
    if (pk) {
      const k = pk.dataset.pick;
      if (state.replacing && state.replacing !== k) state.starred.delete(state.replacing);
      state.starred.add(k);
      state.heroKey = k;
      state.picking = false;
      state.replacing = null;
      if (state.spot) { state.spot = null; setUrl("/"); }
      save(); render();
      return;
    }
    const hk = ev.target.closest("[data-hero]");
    if (hk) { state.heroKey = hk.dataset.hero; save(); renderHero(); return; }
    const ch = ev.target.closest("[data-change]");
    if (ch) { state.picking = true; state.replacing = ch.dataset.change || null; renderHero(); return; }
    if (ev.target.closest("[data-cancelpick]")) { state.picking = false; state.replacing = null; renderHero(); return; }
    const rm = ev.target.closest("[data-remove]");
    if (rm) { toggleStar(rm.dataset.remove); return; }
    if (ev.target.closest("[data-findexam]")) {
      state.picking = false;
      renderHero();
      $("toolbar").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("q").focus({ preventScroll: true }), 400);
      return;
    }
    const open = ev.target.closest("[data-open]");
    if (open) { openExam(open.dataset.open); return; }
    if (ev.target.closest("[data-unspot]")) { state.spot = null; setUrl("/"); render(); return; }
    const cl = ev.target.closest("[data-copylink]");
    if (cl) { copyText(examUrl(cl.dataset.copylink), cl, "Link copied"); return; }
    const cm = ev.target.closest("[data-copymine]");
    if (cm) { copyText(listUrl(state.starred), cm, "Link copied"); return; }
    const cp = ev.target.closest("[data-copy]");
    if (cp) { ev.preventDefault(); copyText(cp.dataset.copy, cp, "Copied"); return; }
    const sh = ev.target.closest("[data-shared]");
    if (sh) {
      if (sh.dataset.shared === "save") { for (const k of state.shared) state.starred.add(k); save(); }
      else { state.shared = null; setUrl("/"); }
      render();
      return;
    }
    // Close any open calendar menu when clicking elsewhere.
    for (const d of document.querySelectorAll(".cal-menu[open]")) if (!d.contains(ev.target)) d.open = false;
  });
  $("list").addEventListener("click", (ev) => {
    if (ev.target.closest("a, button, .details, summary")) return;
    const row = ev.target.closest(".row");
    if (!row) return;
    const k = row.dataset.key;
    if (state.open.has(k)) state.open.delete(k); else state.open.add(k);
    const p = pick(EXAMS.get(k));
    if (state.open.has(k) && p) row.querySelector(".details").outerHTML = details(p);
    row.classList.toggle("open", state.open.has(k));
    row.querySelector(".row-main").setAttribute("aria-expanded", state.open.has(k));
  });
  $("list").addEventListener("keydown", (ev) => {
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList.contains("row-main")) {
      ev.preventDefault();
      ev.target.click();
    }
  });
  document.addEventListener("keydown", (ev) => {
    const typing = ev.target.closest("input, textarea, [contenteditable]");
    if (ev.key === "/" && !typing) { ev.preventDefault(); $("q").focus(); }
    else if (ev.key === "Escape" && ev.target === $("q")) $("q").blur();
  });
  const tb = $("toolbar");
  new IntersectionObserver(([e]) => tb.classList.toggle("stuck", e.intersectionRatio < 1), { threshold: [1], rootMargin: "-1px 0px 0px 0px" }).observe(tb);
}

// Shared links: /nurses (or ?e=nurses) for one exam, ?my=nurses,cpa for a list.
function readUrl() {
  const params = new URLSearchParams(location.search);
  const my = params.get("my");
  if (my) {
    const keys = my.split(",").map((k) => k.trim().toLowerCase()).filter((k) => EXAMS.has(k));
    if (keys.length) state.shared = new Set(keys);
  }
  const fromPath = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, "")).toLowerCase();
  const key = params.get("e") || (EXAMS.has(fromPath) ? fromPath : null);
  if (key && EXAMS.has(key)) {
    state.spot = key;
    state.open.add(key);
  }
}

async function main() {
  load();
  applyTheme();
  try {
    const res = await fetch("/data/exams.json", { cache: "no-cache" });
    DATA = await res.json();
    EXAMS = new Map(DATA.exams.map((e) => [e.key, e]));
  } catch (_) {
    $("hero").innerHTML = `<p class="empty">Couldn't load the schedule. Try reloading.</p>`;
    return;
  }
  if (state.cat && !DATA.categories[state.cat]) state.cat = null;
  readUrl();
  bind();
  bindShare();
  renderFoot();
  lastDay = today();
  render();
  if (state.spot && !location.hash) {
    // The hero already shows the shared exam; its row is open further down.
  } else if (location.hash) openExam(decodeURIComponent(location.hash.slice(1)));
  setInterval(tick, 1000);
  setInterval(minute, 30000);
}

main();
