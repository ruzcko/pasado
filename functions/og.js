// GET /og              → preview image for the home page
// GET /og?e=nurses     → one exam's countdown
// GET /og?my=nurses,cpa → a shared list
// A 1200 x 630 PNG drawn as SVG and rendered with resvg (lib/og, MPL-2.0) in IBM Plex Sans and Plex Mono (OFL).
// The countdown changes daily, so pages link to it with &d=<date> and the edge caches each day's image.
import { initWasm, Resvg } from "../lib/og/resvg.mjs";
import wasm from "../lib/og/resvg.wasm";
import { COLORS as C, SITE, cheer, cleanKey, code, countdown, esc, loadData, nextOverall, pick, whenText } from "../lib/exam.js";

const W = 1200, H = 630, X = 72;
let ready = null, fonts = null;

async function setup(env, origin) {
  ready ??= initWasm(wasm);
  fonts ??= Promise.all(["IBMPlexSans-Medium.ttf", "IBMPlexSans-Bold.ttf", "IBMPlexMono-Bold.ttf"].map((f) =>
    env.ASSETS.fetch(new URL(`/fonts/${f}`, origin)).then((r) => r.arrayBuffer()).then((b) => new Uint8Array(b))));
  await ready;
  return fonts;
}

// No text measuring in SVG land, so estimate (measured on exam names, with headroom):
// Plex Sans is ~0.55 em per character at most at 700 and ~0.5 at 500; Plex Mono is exactly 0.6.
const width = (text, size, bold, mono) => String(text).length * size * (mono ? 0.6 : bold ? 0.56 : 0.5);
// Numbers and dates are set in the mono face, as on the site.
const isNum = (t) => /^[~\d]/.test(String(t));
const MONO = 'font-family="IBM Plex Mono"';
const fit = (text, maxW, size, bold, min = 26, mono = false) => {
  let s = size;
  while (s > min && width(text, s, bold, mono) > maxW) s -= 2;
  return s;
};
const txt = (x, y, size, weight, fill, s, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(s)}</text>`;

function frame(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg2}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${[0, 1, 2, 3].map((i) => i === 2 ? `<circle cx="${X + 9 + i * 24}" cy="80" r="10.5" fill="${C.bubble}"/>`
    : `<circle cx="${X + 9 + i * 24}" cy="80" r="9" fill="none" stroke="${C.text}" stroke-width="3"/>`).join("")}
  ${txt(X + 110, 91, 32, 700, C.text, "Pasado", 'letter-spacing="-1"')}
  ${body}
</svg>`;
}

function steps(s, now, y) {
  const ms = [["opens", s.opens], ["deadline", s.deadline], ["exam", s.days[0]], ["results", s.results]].filter(([, d]) => d);
  if (ms.length < 2) return "";
  const x0 = X + 10, x1 = W - X - 10, step = (x1 - x0) / (ms.length - 1);
  const label = { opens: "OPENS", deadline: "APPLY BY", exam: "EXAM", results: "RESULTS" };
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
  const fm = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short" });
  let out = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.line}" stroke-width="5" stroke-linecap="round"/>`;
  ms.forEach(([k, d], i) => {
    const cx = (x0 + i * step).toFixed(1), c = C[k];
    const done = Date.parse(`${d}T23:59:59+08:00`) <= now;
    out += done ? `<circle cx="${cx}" cy="${y}" r="9" fill="${c}"/>` : `<circle cx="${cx}" cy="${y}" r="${k === "exam" ? 12 : 9}" fill="${C.bg2}" stroke="${c}" stroke-width="4"/>`;
    const anchor = i === 0 ? "start" : i === ms.length - 1 ? "end" : "middle";
    const tx = i === 0 ? x0 - 9 : i === ms.length - 1 ? x1 + 9 : cx;
    out += txt(tx, y + 38, 17, 700, k === "exam" ? c : C.muted, label[k], `text-anchor="${anchor}" letter-spacing="1"`);
    const date = new Date(`${d}T12:00:00+08:00`);
    out += txt(tx, y + 64, 22, 700, C.text, s.est ? "~" + fm.format(date) : f.format(date), `text-anchor="${anchor}" ${MONO}`);
  });
  return out;
}

function examSvg(p, now) {
  const { ex, s } = p;
  const [num, unit] = countdown(p, now);
  const leftW = 620;
  const eyebrow = [code(ex), s.phase, ex.label || "Board exam"].filter(Boolean).join(" · ").toUpperCase();
  const ts = fit(ex.name, leftW, 76, true, 40);
  const ns = fit(num, 420, 230, true, 110, isNum(num));
  let body = txt(X, 176, 22, 700, C.exam, eyebrow, 'letter-spacing="2"');
  body += txt(X, 186 + ts, ts, 700, C.text, ex.name, 'letter-spacing="-2"');
  const when = whenText(s);
  body += txt(X, 186 + ts + 58, fit(when, leftW, 32, true, 22), 700, C.text, when);
  body += txt(X, 186 + ts + 102, 28, 500, C.muted, cheer(ex));
  body += txt(W - X, 330, ns, 700, s.est ? C.muted : C.num, num, `text-anchor="end" letter-spacing="-6"${isNum(num) ? " " + MONO : ""}`);
  body += txt(W - X, 380, 28, 700, C.text, unit, 'text-anchor="end"');
  body += steps(s, now, 476);
  body += txt(X, 600, 21, 500, C.muted, `${SITE}/${ex.key}  ·  as of ${new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(new Date(now))}`);
  return frame(body);
}

function listSvg(rows, now) {
  const shown = rows.slice(0, 4);
  let body = txt(X, 168, 56, 700, C.text, "Exams to watch", 'letter-spacing="-2"');
  shown.forEach((r, i) => {
    const y = 200 + i * 86;
    const [num, unit] = countdown(r, now);
    const right = /^\d+$/.test(num) ? `${num} ${unit.split(" ")[0]}` : num.startsWith("~") ? `${num} ${unit.startsWith("month") ? "mo" : "wk"}` : num;
    body += `<line x1="${X}" y1="${y}" x2="${W - X}" y2="${y}" stroke="${C.line}" stroke-width="2"/>`;
    body += txt(X, y + 46, 34, 700, C.text, r.ex.name.length > 34 ? r.ex.name.slice(0, 33) + "…" : r.ex.name);
    body += txt(X, y + 76, 21, 500, C.muted, `Exam · ${whenText(r.s)}`);
    // "3 days": the number in mono, the word in sans, as on the site.
    const [, n = "", word = right] = right.match(/^([~\d]+)(.*)$/) || [];
    body += `<text x="${W - X}" y="${y + 56}" font-size="42" font-weight="700" fill="${r.s.est ? C.muted : C.num}" text-anchor="end"><tspan ${MONO}>${esc(n)}</tspan>${esc(word)}</text>`;
  });
  body += txt(X, 600, 21, 500, C.muted, SITE);
  if (rows.length > shown.length) body += txt(W - X, 600, 21, 700, C.muted, `+${rows.length - shown.length} more`, 'text-anchor="end"');
  return frame(body);
}

function homeSvg(next, now) {
  let body = txt(X, 260, 84, 700, C.text, "Your exam,", 'letter-spacing="-3"') +
    txt(X, 356, 84, 700, C.num, "counting down.", 'letter-spacing="-3"') +
    txt(X, 426, 30, 500, C.muted, "PRC boards, the Bar and the Civil Service Exam. No ads.");
  if (next) {
    const [num, unit] = countdown(next, now);
    body += txt(X, 520, 26, 700, C.text, `Next up: ${next.ex.name} · ${num} ${unit.replace(" to the exam", "")}`);
  }
  body += txt(X, 600, 21, 500, C.muted, SITE);
  return frame(body);
}

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const url = new URL(request.url);
  const [[medium, bold, mono], data] = await Promise.all([setup(env, url.origin), loadData(env, url.origin)]);
  const now = Date.now();
  const e = cleanKey(url.searchParams.get("e"));
  const my = (url.searchParams.get("my") || "").split(",").map(cleanKey).filter(Boolean).slice(0, 30);
  let svg;
  const ex = e && data.exams.find((x) => x.key === e);
  const p = ex && pick(ex, now);
  if (p) svg = examSvg(p, now);
  else if (my.length) {
    const rows = data.exams.filter((x) => my.includes(x.key)).map((x) => pick(x, now)).filter(Boolean).sort((a, b) => a.t - b.t);
    svg = rows.length ? listSvg(rows, now) : homeSvg(nextOverall(data, now), now);
  } else svg = homeSvg(nextOverall(data, now), now);
  const png = new Resvg(svg, {
    font: { fontBuffers: [medium, bold, mono], defaultFontFamily: "IBM Plex Sans", loadSystemFonts: false },
    fitTo: { mode: "width", value: W },
  }).render().asPng();
  const res = new Response(png, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
  waitUntil(cache.put(request, res.clone()));
  return res;
}
