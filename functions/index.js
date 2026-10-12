// GET / and /?my=nurses,cpa (a shared list) and /?e=nurses (old-style exam link).
import { cleanKey } from "../lib/exam.js";
import { withMeta } from "../lib/meta.js";

export function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const my = (url.searchParams.get("my") || "").split(",").map(cleanKey).filter(Boolean).slice(0, 30);
  return withMeta(ctx, { key: cleanKey(url.searchParams.get("e")) || null, my });
}
