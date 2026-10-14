"use strict";
// Every icon on the site, from one pack: Tabler Icons (MIT, tabler.io/icons) via Iconify, 24 px grid,
// 2 px round strokes, drawn in currentColor. Add new icons from the same pack, unchanged.
// The logo (the shaded bubble) is the brand mark, not an icon, so it lives in the HTML.
const iconSvg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
const iconLine = (d) => iconSvg(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/>`);
const ICON = {
  search: iconLine("M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6"),
  info: iconSvg('<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9-3h.01"/><path d="M11 12h1v4h1"/></g>'),
  sun: iconLine("M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0m-5 0h1m8-9v1m8 8h1m-9 8v1M5.6 5.6l.7.7m12.1-.7l-.7.7m0 11.4l.7.7m-12.1-.7l-.7.7"),
  moon: iconLine("M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z"),
  sunMoon: iconSvg('<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9.173 14.83a4 4 0 1 1 5.657-5.657"/><path d="m11.294 12.707l.174.247a7.5 7.5 0 0 0 8.845 2.492A9 9 0 0 1 5.642 18.36M3 12h1m8-9v1M5.6 5.6l.7.7M3 21L21 3"/></g>'),
  calendar: iconLine("M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm12-4v4M8 3v4m-4 4h16m-9 4h1m0 0v3"),
  // Share: box-and-arrow on Apple devices, three dots elsewhere, the glyph people know from their own phone.
  shareApple: iconLine("M8 9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1m-4 5V3M9 6l3-3l3 3"),
  shareDots: iconLine("M3 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0m12-6a3 3 0 1 0 6 0a3 3 0 1 0-6 0m0 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0m-6.3-7.3l6.6-3.4m-6.6 6l6.6 3.4"),
  star: iconLine("m12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"),
  starFilled: iconSvg('<path fill="currentColor" d="m8.243 7.34l-6.38.925l-.113.023a1 1 0 0 0-.44 1.684l4.622 4.499l-1.09 6.355l-.013.11a1 1 0 0 0 1.464.944l5.706-3l5.693 3l.1.046a1 1 0 0 0 1.352-1.1l-1.091-6.355l4.624-4.5l.078-.085a1 1 0 0 0-.633-1.62l-6.38-.926l-2.852-5.78a1 1 0 0 0-1.794 0z"/>'),
};
// Fill the static icon slots in the HTML (<span data-icon="search"></span>).
for (const el of document.querySelectorAll("[data-icon]")) el.outerHTML = ICON[el.dataset.icon] || "";
