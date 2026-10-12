// GET /nurses, /cpa, /teachers …: the page, opened on that exam, with a link preview to match.
// Anything that isn't an exam key falls through to the static files (and their 404 page).
import { cleanKey, loadData } from "../lib/exam.js";
import { withMeta } from "../lib/meta.js";

export async function onRequestGet(ctx) {
  const key = cleanKey(ctx.params.key);
  const url = new URL(ctx.request.url);
  try {
    const data = await loadData(ctx.env, url.origin);
    if (key && key === ctx.params.key && data.exams.some((x) => x.key === key)) return withMeta(ctx, { key });
  } catch (_) { /* fall through */ }
  return ctx.env.ASSETS.fetch(ctx.request);
}
