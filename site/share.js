"use strict";
// Share cards: a PNG drawn on a canvas, for one exam's countdown or for a list of exams.
// Story (9:16) keeps everything between 14% and 80% of the height and 8% in from the sides,
// out of the bands Instagram/Facebook Stories cover. The background still runs edge to edge.

// The share glyph people know from their own device: box-and-arrow on Apple, three dots elsewhere.
const IS_APPLE = /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent);
const SHARE_ICON = IS_APPLE
  ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 12.5V3M6.5 6.5 10 3l3.5 3.5M5 10.5v5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.4 8.8 5.2-2.6M7.4 11.2l5.2 2.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="5.2" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14.8" cy="5.2" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14.8" cy="14.8" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

const CARD_FORMATS = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
  wide: { w: 1200, h: 630 },
};
// Every color is a 6-digit hex (dots append alpha), except `line`.
const CARD_THEMES = {
  papel: { name: "Papel", bg1: "#fbf7ee", bg2: "#efe6d3", text: "#141c33", muted: "#5c6377", faint: "#9a9483", line: "#ddd3bf", num: "#c8302e", bubble: "#c8302e",
    opens: "#7b8297", deadline: "#c8302e", exam: "#2152c4", results: "#1b844b" },
  gabi: { name: "Gabi", bg1: "#1b2850", bg2: "#0b1022", text: "#f7f1e3", muted: "#b4bcd2", faint: "#6f7896", line: "#2c3966", num: "#ffc53d", bubble: "#ff6b5e",
    opens: "#a3abc2", deadline: "#ff6b5e", exam: "#85a9ff", results: "#4cd18a" },
  araw: { name: "Araw", bg1: "#ffd34d", bg2: "#f6a91c", text: "#1a1405", muted: "#5a4310", faint: "#8a6a1e", line: "#00000022", num: "#1b2a52", bubble: "#c8302e",
    opens: "#6b5a2c", deadline: "#b3261e", exam: "#1b2a52", results: "#0f6b3a" },
  dagat: { name: "Dagat", bg1: "#0f5c6e", bg2: "#06253a", text: "#effbff", muted: "#a9d3dc", faint: "#5f95a3", line: "#ffffff26", num: "#7ff0d4", bubble: "#ffd34d",
    opens: "#a9d3dc", deadline: "#ff9a8a", exam: "#ffffff", results: "#7ff0d4" },
};
const C = { ...CARD_THEMES.papel };
const FONT = '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
// Numbers and dates use the mono face, as on the site; words like "Today" stay in the sans.
const MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
const faceFor = (t) => (/^[~\d]/.test(t) ? MONO : FONT);
const CARD_STORE = "pasado:card";
const shareState = { kind: null, payload: null, format: "story", theme: "gabi", blob: null, url: null, text: "" };
try {
  const saved = JSON.parse(localStorage.getItem(CARD_STORE) || "{}");
  if (CARD_THEMES[saved.theme]) shareState.theme = saved.theme;
  if (CARD_FORMATS[saved.format]) shareState.format = saved.format;
} catch (_) { /* storage unavailable */ }
function saveCardPrefs() {
  try { localStorage.setItem(CARD_STORE, JSON.stringify({ theme: shareState.theme, format: shareState.format })); } catch (_) { /* fine */ }
}

// ---- text helpers ----
function font(g, size, weight = 600, face = FONT) { g.font = `${weight} ${Math.round(size)}px ${face}`; }
function fit(g, text, maxW, size, weight, min = 0.4, face = FONT) {
  let s = size;
  font(g, s, weight, face);
  while (g.measureText(text).width > maxW && s > size * min) { s *= 0.94; font(g, s, weight, face); }
  return s;
}
function fitLine(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length && g.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
function wrap(g, text, maxW, maxLines) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (g.measureText(next).width <= maxW || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…"; }
  return lines;
}

// ---- what a card says ----
const UNIT = { exam: "to the exam", deadline: "left to apply", results: "to results day" };
function cardCount(p, focus) {
  if (p.ongoing) return ["Today", "exam ongoing · galingan!"];
  const n = dayDiff(p.day);
  if (p.s.est) return n >= 60 ? [`~${Math.round(n / 30.44)}`, `months ${UNIT[focus]} (est.)`] : [`~${Math.max(1, Math.round(n / 7))}`, `weeks ${UNIT[focus]} (est.)`];
  if (n <= 0) return ["Today", focus === "deadline" ? "is the last day to apply" : focus === "results" ? "results are due" : "is exam day"];
  return [String(n), `${n === 1 ? "day" : "days"} ${UNIT[focus]}`];
}
function cardEyebrow(ex, s, focus) {
  const what = { exam: ex.label || "Board exam", deadline: "Last day to apply", results: "Results day (target)" }[focus];
  return [code(ex), s.phase, s.variant === "sple" ? "SPLE" : "", what].filter(Boolean).join(" · ");
}
function cardWhen(p, focus) {
  const s = p.s;
  if (focus === "exam") return s.est ? "around " + fMonth.format(noon(s.days[0])) : withWeekdays(s.days);
  return fmtOne(p.day, s.est) + (s.est ? "" : focus === "results" ? " (target)" : "");
}
const cheer = (ex) => (ex.title ? `Laban, future ${ex.title}!` : "Laban, kaya mo 'yan!");
const asOf = () => "as of " + fDay.format(new Date());
const siteHost = () => (/localhost|127\.0\.0\.1/.test(location.host) || !location.host ? HOST : location.host);

// ---- drawing ----
function background(g, W, H) {
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, C.bg1);
  bg.addColorStop(1, C.bg2);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
}
function safeBox(fmt, W, H) {
  if (fmt === "story") return { x: W * 0.08, y: H * 0.14, w: W * 0.84, h: H * 0.66 };
  if (fmt === "wide") return { x: W * 0.06, y: H * 0.1, w: W * 0.88, h: H * 0.8 };
  return { x: W * 0.08, y: H * 0.08, w: W * 0.84, h: H * 0.84 };
}
// The logo: an answer-sheet bubble, shaded.
function brand(g, x, y, size) {
  g.strokeStyle = C.text; g.lineWidth = size * 0.09;
  g.beginPath(); g.arc(x + size * 0.45, y + size * 0.5, size * 0.4, 0, Math.PI * 2); g.stroke();
  g.fillStyle = C.bubble;
  g.beginPath(); g.arc(x + size * 0.45, y + size * 0.5, size * 0.25, 0, Math.PI * 2); g.fill();
  font(g, size * 0.78, 700);
  g.fillStyle = C.text;
  g.textBaseline = "middle";
  g.fillText("pasado", x + size * 1.05, y + size * 0.53);
  g.textBaseline = "alphabetic";
}
// Opens → apply by → exam → results, with today's position.
function drawSteps(g, s, focus, x, y, w, size, labels = true) {
  const ms = milestones(s);
  if (ms.length < 2) return;
  const now = Date.now();
  const step = w / (ms.length - 1);
  g.strokeStyle = C.line; g.lineWidth = size * 0.14; g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
  ms.forEach((m, i) => {
    const cx = x + i * step, c = C[m.k];
    const done = (m.tEnd || m.t) <= now, isT = m.k === focus;
    const r = isT ? size * 0.5 : size * 0.34;
    if (isT) { g.fillStyle = c + "33"; g.beginPath(); g.arc(cx, y, r * 1.8, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(cx, y, r, 0, Math.PI * 2);
    if (done) { g.fillStyle = c; g.fill(); }
    else { g.fillStyle = C.bg2; g.fill(); g.strokeStyle = c; g.lineWidth = size * 0.14; g.stroke(); }
    if (!labels) return;
    const lab = { opens: "Opens", deadline: "Apply by", exam: "Exam", results: "Results" }[m.k];
    const val = s.est ? "~" + fMonthShort.format(noon(m.day)).split(" ")[0] : fDayShort.format(noon(m.day));
    g.textAlign = i === 0 ? "left" : i === ms.length - 1 ? "right" : "center";
    const tx = i === 0 ? cx - r : i === ms.length - 1 ? cx + r : cx;
    font(g, size * 0.72, 700); g.fillStyle = isT ? c : C.muted;
    g.fillText(lab.toUpperCase(), tx, y + size * 1.7);
    font(g, size * 0.85, 500, MONO); g.fillStyle = C.text;
    g.fillText(val, tx, y + size * 2.75);
    g.textAlign = "left";
  });
}

function drawExam(g, W, H, fmt, { p, focus }) {
  const { ex, s } = p;
  background(g, W, H);
  const b = safeBox(fmt, W, H);
  const [num, unit] = cardCount(p, focus);
  const url = `${siteHost()}/${ex.key}`;
  const eyebrow = cardEyebrow(ex, s, focus).toUpperCase();
  const accent = C[focus];

  if (fmt === "wide") {
    brand(g, b.x, b.y, 40);
    const colW = b.w * 0.56;
    font(g, 22, 700); g.fillStyle = accent;
    g.fillText(fitLine(g, eyebrow, colW), b.x, b.y + 104);
    const ts = fit(g, ex.name, colW, 76, 700);
    g.fillStyle = C.text; g.fillText(ex.name, b.x, b.y + 110 + ts);
    font(g, 28, 600); g.fillStyle = C.text;
    g.fillText(fitLine(g, cardWhen(p, focus), colW), b.x, b.y + 110 + ts + 52);
    font(g, 26, 600); g.fillStyle = C.muted;
    g.fillText(fitLine(g, cheer(ex), colW), b.x, b.y + 110 + ts + 94);
    const rx = b.x + b.w * 0.62, rw = b.w * 0.38;
    const ns = fit(g, num, rw, 210, 700, 0.4, faceFor(num));
    g.fillStyle = s.est ? C.muted : C.num; g.fillText(num, rx, b.y + 70 + ns * 0.9);
    font(g, 27, 600); g.fillStyle = C.text;
    wrap(g, unit, rw, 2).forEach((line, i) => g.fillText(line, rx, b.y + 70 + ns * 0.9 + 46 + i * 34));
    drawSteps(g, s, focus, b.x + 14, b.y + b.h - 110, b.w - 28, 22, false);
    font(g, 22, 600); g.fillStyle = C.faint;
    g.fillText(`${url}  ·  ${asOf()}`, b.x, b.y + b.h - 8);
    return;
  }

  const blocks = [];
  const add = (h, draw) => blocks.push({ h, draw });
  add(56, (y, k) => brand(g, b.x, y, 56 * k));
  add(fmt === "story" ? 120 : 60, () => {});
  add(44, (y, k) => { font(g, 32 * k, 700); g.fillStyle = accent; g.fillText(fitLine(g, eyebrow, b.w), b.x, y + 32 * k); });
  add(14, () => {});
  add(130, (y, k) => { const ts = fit(g, ex.name, b.w, 124 * k, 700); g.fillStyle = C.text; g.fillText(ex.name, b.x, y + ts * 0.9); });
  add(fmt === "story" ? 80 : 30, () => {});
  add(fmt === "story" ? 330 : 250, (y, k, hh) => { const ns = fit(g, num, b.w, hh * 1.04, 700, 0.4, faceFor(num)); g.fillStyle = s.est ? C.muted : C.num; g.fillText(num, b.x - ns * 0.02, y + hh * 0.86); });
  add(64, (y, k) => { font(g, 48 * k, 700); g.fillStyle = C.text; g.fillText(fitLine(g, unit, b.w), b.x, y + 48 * k); });
  add(fmt === "story" ? 60 : 30, () => {});
  add(52, (y, k) => { font(g, 40 * k, 600); g.fillStyle = C.text; g.fillText(fitLine(g, cardWhen(p, focus), b.w), b.x, y + 40 * k); });
  add(56, (y, k) => { font(g, 40 * k, 600); g.fillStyle = C.muted; g.fillText(fitLine(g, cheer(ex), b.w), b.x, y + 42 * k); });
  add(fmt === "story" ? 100 : 50, () => {});
  // Stories cover the lower right, so the steps stop short there.
  add(150, (y, k) => drawSteps(g, s, focus, b.x + 22 * k, y + 22 * k, (fmt === "story" ? b.w * 0.8 : b.w) - 44 * k, 40 * k));
  add(fmt === "story" ? 60 : 30, () => {});
  add(40, (y, k) => { font(g, 30 * k, 600); g.fillStyle = C.muted; g.fillText(fitLine(g, url, b.w * 0.72), b.x, y + 30 * k); });
  add(36, (y, k) => { font(g, 26 * k, 500); g.fillStyle = C.faint; g.fillText(asOf(), b.x, y + 28 * k); });
  layout(blocks, b);
}

function drawList(g, W, H, fmt, { rows, title, focus }) {
  background(g, W, H);
  const b = safeBox(fmt, W, H);
  const max = fmt === "story" ? 6 : fmt === "square" ? 5 : 4;
  const shown = rows.slice(0, max);
  const rowW = fmt === "story" ? b.w * 0.86 : b.w;
  const blocks = [];
  const add = (h, draw) => blocks.push({ h, draw });
  add(56, (y, k) => brand(g, b.x, y, 56 * k));
  add(fmt === "story" ? 90 : 40, () => {});
  add(120, (y, k) => { const ts = fit(g, title, b.w, 100 * k, 700); g.fillStyle = C.text; g.fillText(title, b.x, y + ts * 0.9); });
  add(fmt === "wide" ? 10 : 30, () => {});
  for (const p of shown) {
    add(fmt === "wide" ? 86 : 136, (y, k, hh) => {
      g.strokeStyle = C.line; g.lineWidth = 2 * k;
      g.beginPath(); g.moveTo(b.x, y + 2); g.lineTo(b.x + rowW, y + 2); g.stroke();
      const [num, unit] = cardCount(p, focus);
      const right = /^\d+$/.test(num) ? `${num} ${unit.split(" ")[0]}` : num.startsWith("~") ? `${num} ${unit.startsWith("month") ? "mo" : "wk"}` : num;
      // "3 days": the number in mono, the word in sans, as on the site.
      const [, n = "", word = right] = right.match(/^([~\d]+)(.*)$/) || [];
      font(g, 48 * k, 700, MONO); const nw = g.measureText(n).width;
      font(g, 48 * k, 700); const ww = g.measureText(word).width;
      const rw = nw + ww;
      g.fillStyle = p.s.est ? C.muted : C.num;
      g.fillText(word, b.x + rowW - ww, y + hh * 0.55);
      font(g, 48 * k, 700, MONO); g.fillText(n, b.x + rowW - rw, y + hh * 0.55);
      const leftW = rowW - rw - 40 * k;
      const ts = fit(g, p.ex.name, leftW, 46 * k, 700);
      g.fillStyle = C.text; g.fillText(p.ex.name, b.x, y + hh * 0.42 + ts * 0.3);
      font(g, 30 * k, 500); g.fillStyle = C.muted;
      g.fillText(fitLine(g, `${{ exam: "Exam", deadline: "Apply by", results: "Results" }[focus]} · ${cardWhen(p, focus)}`, leftW), b.x, y + hh * 0.42 + ts * 0.3 + 42 * k);
    });
  }
  if (rows.length > shown.length) add(50, (y, k) => { font(g, 30 * k, 600); g.fillStyle = C.faint; g.fillText(`+${rows.length - shown.length} more`, b.x, y + 36 * k); });
  add(fmt === "story" ? 70 : 30, () => {});
  add(40, (y, k) => { font(g, 30 * k, 600); g.fillStyle = C.muted; g.fillText(siteHost(), b.x, y + 30 * k); });
  add(36, (y, k) => { font(g, 26 * k, 500); g.fillStyle = C.faint; g.fillText(asOf(), b.x, y + 28 * k); });
  layout(blocks, b);
}

// Stack blocks from the top of the safe box; shrink everything evenly if they don't fit.
function layout(blocks, b) {
  const total = blocks.reduce((a, x) => a + x.h, 0);
  const k = Math.min(1, b.h / total) * Math.min(1, b.w / 864);
  let y = b.y;
  for (const blk of blocks) {
    blk.draw(y, k, blk.h * k);
    y += blk.h * k;
  }
}

function renderCard(kind, payload, fmt, theme = shareState.theme) {
  Object.keys(C).forEach((k) => delete C[k]);
  Object.assign(C, CARD_THEMES[theme] || CARD_THEMES.gabi);
  const { w, h } = CARD_FORMATS[fmt];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.textBaseline = "alphabetic";
  if (kind === "exam") drawExam(g, w, h, fmt, payload);
  else drawList(g, w, h, fmt, payload);
  return new Promise((res) => c.toBlob(res, "image/png"));
}

// ---- dialog ----
async function refreshCard() {
  const img = $("sdImg");
  img.removeAttribute("src");
  try { await Promise.all(["700 40px", "600 40px", "500 40px"].map((f) => document.fonts.load(`${f} "IBM Plex Sans"`)).concat(["700 40px", "500 40px"].map((f) => document.fonts.load(`${f} "IBM Plex Mono"`)))); } catch (_) { /* system font */ }
  shareState.blob = await renderCard(shareState.kind, shareState.payload, shareState.format);
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  img.dataset.url = URL.createObjectURL(shareState.blob);
  img.src = img.dataset.url;
  for (const b of document.querySelectorAll("[data-format]")) b.setAttribute("aria-checked", b.dataset.format === shareState.format);
  for (const b of document.querySelectorAll("[data-card-theme]")) b.setAttribute("aria-checked", b.dataset.cardTheme === shareState.theme);
}

function openShareCard(kind, payload, url, text, title) {
  Object.assign(shareState, { kind, payload, url, text });
  $("sdTitle").textContent = title;
  const dlg = $("sharedlg");
  if (!dlg.open) dlg.showModal();
  refreshCard();
}

function shareExam(key) {
  const ex = EXAMS.get(key);
  if (!ex) return;
  let focus = state.focus;
  let p = pick(ex, focus);
  if (!p) { focus = "exam"; p = pick(ex, focus); }
  if (!p) return;
  const [num, unit] = cardCount(p, focus);
  openShareCard("exam", { p, focus }, examUrl(key), `${examLabel(ex)}: ${num} ${unit}. ${cheer(ex)}`, `${ex.name} countdown`);
}

function shareListCard() {
  const keys = state.shared || state.starred;
  const rows = [...keys].map((k) => EXAMS.get(k)).filter(Boolean).map((ex) => pick(ex)).filter(Boolean).sort((a, b) => a.t - b.t);
  if (!rows.length) return;
  const title = state.shared ? "Exams to watch" : "My exams";
  openShareCard("list", { rows, title, focus: state.focus }, listUrl(keys), `${title}: ${rows.slice(0, 4).map((r) => r.ex.name).join(", ")}`, title);
}

async function shareCardNow() {
  const blob = shareState.blob;
  if (!blob) return;
  const name = `pasado-${shareState.kind === "exam" ? shareState.payload.p.ex.key : "list"}-${shareState.format}.png`;
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Pasado", text: `${shareState.text} ${shareState.url}` });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  downloadCard(file);
}

function downloadCard(file) {
  const f = file || new File([shareState.blob], "pasado-card.png", { type: "image/png" });
  const url = URL.createObjectURL(f);
  Object.assign(document.createElement("a"), { href: url, download: f.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function bindShare() {
  const dlg = $("sharedlg");
  $("sdClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  $("sdFormats").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-format]");
    if (!b) return;
    shareState.format = b.dataset.format;
    saveCardPrefs();
    refreshCard();
  });
  $("sdThemes").innerHTML = Object.entries(CARD_THEMES).map(([k, t]) => `<button type="button" role="radio" data-card-theme="${k}" aria-checked="${k === shareState.theme}">
      <span class="swatch" style="background:linear-gradient(135deg, ${t.bg1}, ${t.bg2})"><i style="background:${t.num}"></i></span>${esc(t.name)}</button>`).join("");
  $("sdThemes").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-card-theme]");
    if (!b) return;
    shareState.theme = b.dataset.cardTheme;
    saveCardPrefs();
    refreshCard();
  });
  $("sdShare").addEventListener("click", shareCardNow);
  $("sdSave").addEventListener("click", () => downloadCard());
  $("sdCopy").addEventListener("click", () => copyText(shareState.url, $("sdCopy"), "Link copied"));
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-sharecard]");
    if (!b) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (b.dataset.sharecard === "list") shareListCard(); else shareExam(b.dataset.sharecard);
  }, true);
}
