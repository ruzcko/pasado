// Rewrites the page's title, description and preview image for shared links. Link previews (Messenger,
// Viber, X, Slack) can't run the page's script, so the server has to say what the link is about.
import { cheer, code, esc, humanCount, loadData, nextOverall, pick, whenText } from "./exam.js";

class SetContent {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute("content", this.value); }
}

// key: one exam (/nurses). my: a shared list (?my=nurses,cpa). Neither: the home page.
export async function withMeta({ request, env }, { key = null, my = [] } = {}) {
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/", url.origin));
  try {
    const data = await loadData(env, url.origin);
    const now = Date.now();
    const day = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
    let title = null, desc = null, query = "", path = "/";
    const ex = key && data.exams.find((x) => x.key === key);
    if (ex) {
      const p = pick(ex, now);
      path = `/${ex.key}`;
      query = `e=${ex.key}`;
      const name = `${ex.name}${code(ex) ? ` (${code(ex)})` : ""} board exam`;
      title = p ? `${name}: ${p.ongoing ? "happening now" : `${humanCount(p, now)} to go`} · Pasado` : `${name} · Pasado`;
      desc = p ? `${p.s.est ? "Estimated" : "Exam"}: ${whenText(p.s)}.${p.s.deadline && !p.s.est ? ` Last day to apply: ${new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(new Date(p.s.deadline + "T12:00:00+08:00"))}.` : ""} ${cheer(ex)} Live countdown, application deadline and results date.`
        : `Dates for the ${name}, from PRC's schedule.`;
    } else if (my.length) {
      const rows = data.exams.filter((x) => my.includes(x.key)).map((x) => pick(x, now)).filter(Boolean).sort((a, b) => a.t - b.t);
      if (rows.length) {
        query = `my=${rows.map((r) => r.ex.key).join(",")}`;
        path = `/?${query}`;
        title = `Board exams to watch: ${rows.slice(0, 3).map((r) => r.ex.name).join(", ")}${rows.length > 3 ? "…" : ""}`;
        desc = rows.slice(0, 3).map((r) => `${r.ex.name} in ${humanCount(r, now)}`).join(" · ") + ".";
      }
    } else {
      const n = nextOverall(data, now);
      if (n) desc = `Countdowns to every PRC board exam: application deadlines, exam days and results. Next up: ${n.ex.name}, ${whenText(n.s)}. No ads.`;
    }
    const image = `${url.origin}/og?${query ? query + "&" : ""}d=${day}`;
    const rw = new HTMLRewriter()
      .on('meta[property="og:image"]', new SetContent(image))
      .on('meta[name="twitter:image"]', new SetContent(image))
      .on('meta[property="og:url"]', new SetContent(`${url.origin}${path}`))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", `https://pasado.ruzcko.dev${ex ? path : "/"}`); } });
    if (title) {
      rw.on("title", { element(el) { el.setInnerContent(esc(title), { html: true }); } })
        .on('meta[property="og:title"]', new SetContent(title))
        .on('meta[name="twitter:title"]', new SetContent(title));
    }
    if (desc) {
      rw.on('meta[name="description"]', new SetContent(desc))
        .on('meta[property="og:description"]', new SetContent(desc))
        .on('meta[name="twitter:description"]', new SetContent(desc));
    }
    return rw.transform(new Response(page.body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
    }));
  } catch (_) {
    return page;
  }
}
