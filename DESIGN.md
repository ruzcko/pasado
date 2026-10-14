# Pasado design system

The rules for how Pasado looks and sounds. Read this before you change `site/style.css`, `site/share.js` (share cards) or `functions/og.js` (link previews), and update it when a rule changes.

The values below come from `site/style.css` as of 2026-10-14. Rows marked **Proposed** are not in the code yet.

**Contrast rule:** text needs at least **4.5:1** against its background (3:1 for text 24 px and up, or 19 px bold and up). Icons need **3:1**. Check both themes.

## 1. The idea

**A Filipino exam answer sheet.** Cream paper, navy ink, and one shaded red bubble. The page should feel like the moment before an exam: calm, official and a little exciting. It should not feel like a startup dashboard.

- The red shaded bubble is the brand mark: the logo, the hero corner, and the share cards.
- The flag colours (blue, gold, red) are **accents**. Use one at a time, never all three in one place.
- Colour always means something (see milestone colours). Don't add colour for decoration.

## 2. Colour

Design tokens are the CSS variables in `:root`. Always use a token, never a raw hex, so dark mode keeps working.

### Base

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--bg` | `#f5f0e6` | `#0c1120` | Page background (the paper) |
| `--surface` | `#fffcf6` | `#131a2d` | Cards, rows, inputs, dialogs |
| `--surface-2` | `#eee7d8` | `#1b2339` | Wells inside a surface: countdown box, segmented control, tags |
| `--ink` | `#141c33` | `#f2ede2` | Main text; primary buttons |
| `--muted` | `#5c6377` | `#a3aabb` | Secondary text, labels |
| `--faint` | `#8b909c` | `#6e758a` | Icons and decoration only. **Never for text** (2.8:1 on paper) |
| `--line` | `#e1d8c6` | `#252e47` | Borders and dividers |
| `--focus` | `#2152c4` | `#85a9ff` | Keyboard focus ring |
| `--red` | `#b82a28` | `#ff6b5e` | Deadlines, urgency, the bubble. (Was `#c8302e`, which failed on tinted tags.) |
| `--gold` | `#c98a00` | `#ffc53d` | Gold **backgrounds** and tints only: "My exams" chip, Estimated badge |
| `--gold-ink` | `#ad7600` | `#ffc53d` | Gold as an **icon or text** colour: the pressed star, the "your exam" star |
| `--warm` | `#8f5600` | `#ffb547` | Amber text: Estimated notes, "soon" counts. (Was `#b36b00`, 3.7:1.) |

### Hero

The hero is the one dark object on a light page. In dark mode it flips to a sheet of paper. Each version swaps in the milestone colours that work on its background:

- **Light mode (navy hero):** the bright accents from the dark palette (`#ff6b5e`, `#85a9ff`, `#4cd18a`, `#8d94a8`).
- **Dark mode (paper hero):** the deep accents from the light palette.

The shaded bubble in the hero corner is always `#b82a28`.

| Token | Light | Dark |
|---|---|---|
| `--hero-bg` | `#16213e` | `#f2ead8` |
| `--hero-fg` | `#f7f1e3` | `#141c33` |
| `--hero-muted` | `#b4bcd2` | `#525a6d` |
| `--tile` / `--tile-line` | `#22305a` / `#33427a` | `#e6dcc5` / `#d4c8ad` |

### Meaning colours

Each milestone has one colour everywhere: hero steps, row swatches, timeline dots and share cards.

| Milestone | Token | Colour |
|---|---|---|
| Applications open | `--m-opens` | grey `#7b8297` |
| Apply by (deadline) | `--m-deadline` | red `--red` |
| Exam | `--m-exam` | blue `--blue` |
| Results | `--m-results` | green `--green` |

Urgency: `--hot` (red) for a deadline 14 days away or less, `--warm` (amber) for soon. "Estimated" dates use gold (`--gold` background, `--warm` text).

Share cards (`CARD_THEMES` in `site/share.js`) and link previews (`COLORS` in `lib/exam.js`) keep their own palettes, which still use the older red `#c8302e`. They're images, so the difference doesn't affect readability.

## 3. Type

**Fonts (chosen 2026-10-14):** **IBM Plex Sans** for words and **IBM Plex Mono** for numbers, dates and exam codes. The mono face makes them look typed onto an official form, which carries the answer-sheet idea. Both are OFL and self-hosted in `site/fonts/`. `design/type-specimen.html` shows the options we compared (Inter, Archivo, Plex, Cabinet Grotesk + Switzer).

| Token | Use for |
|---|---|
| `--sans` | Everything by default |
| `--mono` | Countdown numbers (`.unit .n`, `.cd .big`), milestone dates (`.steps .v`), exam codes (`.info .code`, switcher tabs) |

**Mixed values:** in "3 days", only the number is mono; the word stays sans. Words in a number slot ("Today", "Exam ongoing") stay sans too: add the `word` class (`.unit .n.word`, `.cd .big.word`).

The fonts are set in three places. Change all three together, or the share cards and link previews won't match the site:
1. `site/style.css`: the `@font-face` rules and `--sans` / `--mono`, plus the `<link rel="preload">` lines in `site/index.html`.
2. `site/share.js`: `FONT` and `MONO` (share cards are drawn on a canvas, which only uses fonts that are already loaded, so `refreshCard()` loads every weight first).
3. `functions/og.js`: the TTF files it loads (resvg can't read woff2), and the width estimates. There is no text measuring there; estimates measured on exam names are Plex Sans ~0.55 em per character at most (bold) and ~0.5 em (medium), and Plex Mono exactly 0.6 em.

### Sizes

A **type scale** is a short, fixed list of sizes. Today the CSS uses 13 sizes, some only half a pixel apart (13 and 13.5). Readers can't see half-pixel differences, but they do make the page feel slightly unplanned.

| Role | Today | Proposed |
|---|---|---|
| Hero exam name | `clamp(30px, 6.4vw, 46px)`, 700 | same |
| Countdown numbers | `clamp(30px, 8vw, 50px)`, mono 700 | same |
| Row countdown | 26 / 22 (mobile), mono 700 | same |
| Wordmark | 22, 700 | same |
| Dialog title | 17 | 17 |
| Exam name in a row | 16, 700 | same |
| Body | 15 | 15 |
| Small body | 13.5, 14 | 14 |
| Labels, tags, notes | 12, 13 | 13 |
| Eyebrows, ALL-CAPS labels | 11, 12 | 12, `letter-spacing: .08em` |

**Weights:** 400 body, 500 small dates and secondary text, 600 emphasis, 700 names, headlines, buttons and numbers. Plex Sans stops at 700, so never ask for 800 or more. Plex Mono is loaded at 500 and 700 only.

Numbers that count down always use `font-variant-numeric: tabular-nums`, so the digits don't jump as they change.

## 4. Shape and space

| | Today | Proposed |
|---|---|---|
| Corner radius | 6, 8, 9, 10, 12, 14, 16, 18, 22, pill | **6** tags and code chips · **10** small controls · **14** tiles and inputs · **20** cards, hero and dialogs · **pill** for chips and pill buttons |
| Spacing | 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 22 | Steps of 4: **4, 8, 12, 16, 24, 32** |
| Page width | 920 px max, 16 px side gutter | same |
| Shadow | one soft shadow, `--shadow` | same; cards get border + shadow, never a heavy drop shadow |

## 5. Components

- **Hero:** the selected exam, its countdown tiles, 4 milestone steps and actions. The picker shows when no exam is picked.
- **Countdown tile (`.unit`):** number on top, ALL-CAPS label under it.
- **Row (`.row`):** countdown box on the left, name + code chip + "what's next" in the middle, star and share on the right. Tap to open the timeline.
- **Pill (`.pill`, `.ql`):** secondary actions. `.ql.primary` / `.btn.primary` (ink fill) for one main action at a time.
- **Chip (`.chip`):** filters. Pressed = ink fill; "My exams" pressed = gold.
- **Segmented control (`.seg`):** Exam day / Apply by / Results.
- **Tag and badge:** tag = a fact ("Exam 30 Nov"); badge = a status ("Estimated", "Moved").
- **Sheet (`dialog.sheet`):** a bottom sheet on phones, a centred dialog on desktop.
- **Icons:** hand-drawn inline SVG, 1.8–2 px strokes, round caps, `currentColor`. If you add more icons, take them from one pack (for example Tabler on Iconify) in the same stroke style. Don't mix styles.

## 6. Share cards and link previews

- Card themes in `site/share.js` (`CARD_THEMES`): **Papel** (paper), **Gabi** (night, default), **Araw** (sun), **Dagat** (sea). Each theme has its own colour for each milestone.
- Story cards (1080 × 1920) keep text out of the top 14% and bottom 20%, and away from the lower-right corner, because Instagram and Facebook Stories put their buttons there.
- The link preview image (`/og`, 1200 × 630) uses the same paper and ink.

## 7. Voice

- **Plain English, with Filipino at the emotional moments.** "Laban, future RN!" on a share card. "Galingan mo!" during the exam. Don't use Filipino in labels, buttons or instructions.
- **Specific, not hype.** "Apply by 24 Oct · 10 days left", not "Don't miss out!" Name the agency and the resolution when you cite a date.
- **Honest about what we don't know.** Estimated dates always say "estimated" or "~", and say what they are based on.
- **Short buttons that say what happens:** "Share countdown", "Add to calendar", "Make this my exam".
- **No ads, no dark patterns.** Say it plainly once ("No ads.") and don't repeat it.
- **Avoid:** "seamless", "unlock", "journey", "elevate", "game-changer", "Get started", exclamation marks outside the encouragement lines, and emoji in the interface (★ ☆ are symbols, not emoji).

## 8. Accessibility

Most visitors are on phones. These rules came from an audit on 2026-10-14, which also fixed every problem it found.

### Tap targets

- Every button or link you tap must have a hit area of at least **44 × 44 px** (Apple's guideline).
- A button can *look* smaller. The `::after` rule under "tap targets" in `style.css` gives the listed controls an invisible 44 px area centred on them. Add new small controls to that list.
- Keep at least 44 px between the centres of neighbouring buttons, so their hit areas don't overlap. That's why icon buttons have 8 px gaps and the stacked star and share buttons on phones have 8 px between them.
- The chip row scrolls, which clips anything outside it, so it has 6 px of padding above and below to fit the hit areas.

### Contrast fixes made on 2026-10-14

| Problem | Fix |
|---|---|
| Month counts, closed "Apply by" tags and the search placeholder used `--faint` (2.8:1) | Use `--muted` (5.3:1) |
| Chip counts ("All 63") were faded with `opacity: .7` (3.1:1) | No opacity |
| "Estimated" text in `--warm` `#b36b00` (3.7:1) | `#8f5600` (5.3:1 on paper, 4.6:1 on the gold badge) |
| Red tags and badges at 4.2–4.4:1 | `--red` `#c8302e` became `#b82a28` (5.0:1 on the tag tint) |
| Pressed star in `--gold` (2.9:1) | `--gold-ink` `#ad7600` (3.8:1) |
| Light mode: blue exam date on the navy hero (2.3:1) | The light hero uses the bright accents (6.9:1) |
| Dark mode: tile labels on the paper hero (4.4:1) | `--hero-muted` `#525a6d` (5.1:1) |
| Light mode: the hero's "Add to calendar" menu had cream text on a cream menu | `.hero .cal-menu .menu` uses the hero's own colours |

### How to check

The 2026-10-14 audit ran a script in the browser on every visible piece of text, in both themes, with the calendar menus and one row's details open: 631 elements, 0 failures. It also measured every button's hit area at 375 px and 1100 px wide, with the share dialog open: 0 under 44 px, 0 overlaps. Re-run checks like these after you add a new colour or component.
