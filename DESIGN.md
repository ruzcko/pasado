# Pasado design system

The rules for how Pasado looks and sounds. Read this before you change `site/style.css`, `site/share.js` (share cards) or `functions/og.js` (link previews), and update it when a rule changes.

The values below come from `site/style.css` as of 2026-10-15 (the Pencil palette: graphite instead of navy). Rows marked **Proposed** are not in the code yet.

**Contrast rule:** text needs at least **4.5:1** against its background (3:1 for text 24 px and up, or 19 px bold and up). Icons need **3:1**. Check both themes.

## 1. The idea

**A Filipino exam answer sheet.** White paper, pencil graphite, and one shaded red bubble. The page should feel like the moment before an exam: calm, official and a little exciting. It should not feel like a startup dashboard.

- **The logo (2026-10-15): five answer bubbles, A to E, like the real sheet, with C shaded red and E dashed, then "Pasado" with a capital P.** It's two board-exam truths: *kapag hindi sigurado, C* (when you're not sure, choose C), and the E column every sheet prints but nobody ever shades. The About sheet says so in one line. The same row is on the share cards and link previews, and the bubble column in the countdown card's corner matches it. The C bubble in the header uses `--red`, so it brightens in dark mode (6.7:1; `--bubble` would be 2.7:1). App icons and the favicon keep a single shaded bubble, since five bubbles don't read at icon size.
- **Pencil, not navy (2026-10-15).** Everything you write on an answer sheet is No. 2 pencil, so the ink, the countdown card and the exam milestone are graphite greys with no blue in them. The old navy, slate and bright blue sat too close to the stock palettes AI-built sites use (Tailwind's slate and blue). Option 2, a printed sheet with pale-red drop-out lines, was the runner-up (`design/palette-2026-10-15/`, not committed).
- Red, gold and green are **accents**: red for deadlines and the shaded bubble, gold for Estimated, green for results. Use one at a time.
- Colour always means something (see milestone colours). Don't add colour for decoration.
- **White paper, not cream (2026-10-15).** Real answer sheets are bright white, and cream is one of the backgrounds AI tools fall back on, so the page, cards and share cards use white, with a neutral grey (`--surface-2`) for wells. Off-whites are neutral too (`#f5f5f6`, `#f1f1f3`), never warm.
- Pasado tried two other looks on 2026-10-15 (an ID card in civic blue and gold, then an exam-morning sky; see `design/directions.html`, `design/sky.html`, `design/simple.html`) and came back to the answer sheet.

## 2. Colour

Design tokens are the CSS variables in `:root`. Always use a token, never a raw hex, so dark mode keeps working.

### Base

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0e0e10` | Page background (the paper) |
| `--surface` | `#ffffff` | `#17171a` | Cards, rows, inputs, dialogs (rows stand out by their border and shadow) |
| `--surface-2` | `#f1f1f3` | `#1f1f23` | Wells inside a surface: countdown box, segmented control, tags |
| `--ink` | `#1c1c1e` | `#f1f1f3` | Main text; primary buttons (pencil graphite) |
| `--muted` | `#5d5d63` | `#a5a5ab` | Secondary text, labels |
| `--faint` | `#8b8b91` | `#75757b` | Icons and decoration only. **Never for text** (3.4:1 on paper) |
| `--line` | `#e3e3e6` | `#2a2a2f` | Borders and dividers |
| `--focus` | `#1c1c1e` | `#c9c9ce` | Keyboard focus ring (the hero sets its own: `#f5f5f6` on graphite, `#1c1c1e` on paper) |
| `--red` | `#b82a28` | `#ff6b5e` | Deadlines, urgency, the bubble. (Was `#c8302e`, which failed on tinted tags.) |
| `--gold` | `#c98a00` | `#ffc53d` | Gold **backgrounds** and tints only: "My exams" chip, Estimated badge |
| `--gold-ink` | `#ad7600` | `#ffc53d` | Gold as an **icon or text** colour: the pressed star, the "your exam" star |
| `--graphite` | `#3b3b40` | `#c9c9ce` | The exam milestone, the "Now" countdown, Opens tags, SPLE badges, info notes. It replaced `--blue` (`#2152c4` / `#85a9ff`) |
| `--warm` | `#8f5600` | `#ffb547` | Amber text: Estimated notes, "soon" counts. (Was `#b36b00`, 3.7:1.) |
| `--bubble` | `#b82a28` | same | The shaded answer bubble in the hero corner. Same red in both themes, and the hero's own colour swaps don't touch it. |
| `--on-gold` | `#1a1405` | same | Text on a gold fill: the pressed "My exams" chip (6.2:1 on `#c98a00`, 11.6:1 on `#ffc53d`) |
| `--scrim` | `rgba(14, 14, 16, .5)` | same | The dimmed layer behind an open dialog |

### Hero

The hero is the one dark object on a light page. In dark mode it flips to a sheet of paper. Each version swaps in the milestone colours that work on its background:

- **Light mode (graphite hero):** the bright accents from the dark palette (`#ff6b5e`, `#4cd18a`), a light graphite for the exam (`#dcdce0`) and `#9a9aa0` for Opens.
- **Dark mode (paper hero):** the deep accents from the light palette, with results green one shade darker (`#187543`, 4.6:1 on the tiles).

The shaded bubble in the hero corner is always `--bubble` (`#b82a28`).

| Token | Light | Dark |
|---|---|---|
| `--hero-bg` | `#1f1f22` | `#f1f1f3` |
| `--hero-fg` | `#f5f5f6` | `#1c1c1e` |
| `--hero-muted` | `#b9b9be` | `#55555b` |
| `--tile` / `--tile-line` | `#2b2b2f` / `#3c3c41` | `#e6e6e9` / `#d2d2d7` |

### Meaning colours

Each milestone has one colour everywhere: hero steps, row swatches, timeline dots and share cards.

| Milestone | Token | Colour |
|---|---|---|
| Applications open | `--m-opens` | light grey `#67676d` (dark `#8f8f95`) |
| Apply by (deadline) | `--m-deadline` | red `--red` |
| Exam | `--m-exam` | graphite `--graphite` |
| Results | `--m-results` | green `--green` |

Urgency: `--hot` (red) for a deadline 14 days away or less, `--warm` (amber) for soon. "Estimated" dates use gold (`--gold` background, `--warm` text).

Share cards (`CARD_THEMES` in `site/share.js`) and link previews (`COLORS` in `lib/exam.js`) are drawn as images, so they can't use the CSS tokens. Their colours are listed with contrast ratios in section 6.

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
| Corner radius | 6, 8, 9, 10, 12, 14, 16, 18, 22, pill | **6** tags and code chips · **8** buttons and tabs (`--radius-box`) · **14** tiles and inputs · **20** cards, hero and dialogs · **pill** for filter chips only |
| Spacing | 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 22 | Steps of 4: **4, 8, 12, 16, 24, 32** |
| Page width | 920 px max, 16 px side gutter | same |
| Shadow | one soft shadow, `--shadow` | same; cards get border + shadow, never a heavy drop shadow |

**Buttons are form boxes, not pills (chosen 2026-10-14).** Pill-shaped buttons (fully rounded ends, like a capsule) are another look AI tools default to. Pasado's buttons, the exam tabs in the hero and the card-theme picker use small 8 px corners (`--radius-box`), like the boxes on a printed exam form. **Filter chips stay pills** on purpose: filters are the one place round chips are expected, and the shape keeps "filter" visibly different from "action".

## 5. Components

- **Hero:** the selected exam, its countdown tiles, 4 milestone steps and actions. The picker shows when no exam is picked.
- **Countdown tile (`.unit`):** number on top, ALL-CAPS label under it.
- **Row (`.row`):** countdown box on the left, name + code chip + "what's next" in the middle, star and share on the right. Tap to open the timeline.
- **Button (`.pill`, `.ql`):** secondary actions, 8 px corners (the class names are older than the shape). `.ql.primary` / `.btn.primary` (ink fill) for one main action at a time.
- **Chip (`.chip`):** filters, round ends. Pressed = ink fill; "My exams" pressed = gold with `--on-gold` text.
- **Calendar menu (`.cal-menu`):** opens under its button, above everything else (`z-index: 10`, over the sticky toolbar). A small script in `app.js` shifts it left when it would run past the right edge of the screen.
- **Segmented control (`.seg`):** Exam day / Apply by / Results.
- **Tag and badge:** tag = a fact ("Exam 30 Nov"); badge = a status ("Estimated", "Moved").
- **Sheet (`dialog.sheet`):** a bottom sheet on phones, a centred dialog on desktop.
- **Icons (changed 2026-10-14):** **Tabler Icons** (MIT) from Iconify, unchanged: 24 px grid, 2 px round strokes, `currentColor`. They all live in `site/icons.js` (`ICON.search`, `ICON.star`, `ICON.starFilled`, `ICON.calendar`, `ICON.shareApple` / `ICON.shareDots`, `ICON.sun` / `moon` / `sunMoon`, `ICON.info`). Static slots in the HTML are `<span data-icon="…">`. Add new icons from Tabler only, and don't draw your own. The star is an icon, not the ☆ / ★ characters: outline = not picked (`--faint`), filled = picked (`--gold-ink`). The logo bubble is the brand mark, not an icon.

## 6. Share cards and link previews

- Card themes in `site/share.js` (`CARD_THEMES`): **Papel** (paper), **Gabi** (night, default; graphite since 2026-10-15), **Araw** (sun), **Dagat** (sea). Each theme has its own colour for each milestone.
- Story cards (1080 × 1920) keep text out of the top 14% and bottom 20%, and away from the lower-right corner, because Instagram and Facebook Stories put their buttons there.
- The link preview image (`/og`, 1200 × 630) uses the Gabi colours (`COLORS` in `lib/exam.js`).
- Every colour drawn as **text** on a card (the eyebrow line, the highlighted step's label, "as of" and the URL) needs 4.5:1 against **both** ends of the card's background gradient. The big number, the bubble and the step dots need 3:1. There is no `faint` on cards any more: it was only used for text and failed, so those lines use `muted`.

Checked 2026-10-15, after the Pencil palette (lowest ratio of the two gradient ends):

| Theme | text | muted | number | bubble | deadline | exam | results | opens (dot only) |
|---|---|---|---|---|---|---|---|---|
| Papel (white `#ffffff` → `#f1f1f3`, graphite text `#1c1c1e`, exam `#3b3b40`) | 15.1 | 5.8 | 5.5 | 5.5 | 5.5 | 9.9 | 5.1 | 5.0 |
| Gabi (and link previews; graphite `#2a2a2e` → `#141416`, exam `#dcdce0`) | 13.1 | 7.3 | 9.1 | 5.1 | 5.1 | 10.5 | 7.3 | 5.8 |
| Araw (number and exam `#1c1c1e`, was navy) | 9.3 | 4.7 | 8.6 | 3.1 `#b82a28` | 4.6 `#8d1e18` | 8.6 | 4.6 `#0c532d` | 3.4 |
| Dagat | 7.2 | 4.7 | 5.5 | 5.3 | 4.6 `#ffb8ad` | 7.6 | 5.5 | 4.7 |

Colours with a hex code in the Araw and Dagat rows changed in the 2026-10-14 audit. Before: Papel used the old red `#c8302e` (4.3:1) and green `#1b844b` (3.8:1); Araw's red `#b3261e` (3.3:1), green `#0f6b3a` (3.3:1) and bubble `#c8302e` (2.7:1); Dagat's pink `#ff9a8a` (3.7:1); and every theme's `faint` text (2.3–3.3:1).

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
- The home link (logo + "pasado") is a 44 px tall row (`.brand { min-height: 44px }`). It was 34 px.
- Don't put `overflow: hidden` on a box that holds a menu. The hero had it, which cut the "Add to calendar" menu off at the hero's edge: only 14 px of it showed, and a tap on "Download .ics" landed on a filter chip underneath.

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

### Fixes from the second audit (2026-10-14)

| Problem | Fix |
|---|---|
| Raw colours outside the tokens: the bubble `#b82a28`, the text on the gold chip `#1a1405`, the dialog backdrop | New tokens `--bubble`, `--on-gold`, `--scrim` |
| The ☆ / ★ stars were text characters, so they had to pass the text rule (4.5:1) and didn't (3.1–3.8:1) | They're Tabler icons now, measured as icons (3:1): outline 3.1:1 light / 3.8:1 dark, filled 3.8:1 |
| Home link was 34 px tall | 44 px |
| On phones, a row's "Add to calendar" menu ran 40 px past the right edge, so the whole page scrolled sideways | `app.js` shifts an open menu left to keep it on screen |
| The hero's calendar menu was cut off by `overflow: hidden` on the hero (taps went to the chips underneath) | Removed `overflow: hidden`; menus sit above the sticky toolbar |
| Share cards and link previews: 9 text colours under 4.5:1 | See the table in section 6 |

### How to check

**2026-10-15 (Pencil palette):** `design_lint.py site`: 0 errors, 0 warnings. Contrast and tap-target checks at 375 px and 1100 px, light and dark, in the same 5 states (the hero's calendar menu now checked on the Bar exam, since an estimated date has no calendar menu): 20 runs of 648–692 text elements and icons, **0 contrast failures**, nothing to check by eye; 89–98 controls per run (11 in the share dialog), **0 under 44 px, 0 overlaps**. The first run caught one short control: the exam name in the countdown card is a button, and a one-line name like "Nurses" made it 39 px tall at 375 px. It now has an invisible 44 px hit area. Card palettes: 5 checked, 0 failures (section 6).

**2026-10-15 (white paper instead of cream):** `design_lint.py site`: 0 errors, 0 warnings (the cream warning is gone). Contrast and tap-target checks at 375 px and 1100 px, light and dark, in the same 5 states: 20 runs of 649–702 text elements and icons, **0 contrast failures**, nothing to check by eye; 90–99 controls per run (11 in the share dialog), **0 under 44 px, 0 overlaps**. Card palettes: 5 checked, 0 failures (section 6).

**2026-10-14 (second audit):** `design_lint.py site`: 0 errors, 0 warnings. The design-brief contrast and tap-target checks ran in the browser at **375 px and 1100 px**, in **light and dark**, in 5 states each: an exam picked (hero with tabs), one row open with its calendar menu, the hero's calendar menu open, the share dialog open, and the exam picker. That's 20 runs of **650–703 text elements and icons** each: **0 contrast failures**. Every run measured **90–99 controls** (11 in the share dialog): **0 under 44 px, 0 overlaps**, and every control was tappable except ones under an open menu or dialog. The share-card and link-preview palettes were checked separately: 5 palettes, 0 failures (table in section 6).

**To re-check:** run `python ~/.claude/skills/design-brief/scripts/design_lint.py site`, then run the skill's `contrast-check.js` and `tap-target-check.js` in the browser in the same states. Read the "covered" list as well as the failures: that's how the clipped hero menu showed up. Run them again after any new colour, component, menu or dialog.

(These results replace the first audit's earlier the same day: 631 elements, 0 failures, 0 small controls.)
