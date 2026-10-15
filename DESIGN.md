# Pasado design system

The rules for how Pasado looks and sounds. Read this before you change `site/style.css`, `site/share.js` (share cards) or `functions/og.js` (link previews), and update it when a rule changes.

**Contrast rule:** text needs at least **4.5:1** against its background (3:1 for text 24 px and up, or 19 px bold and up). Icons need **3:1**. Check both themes.

## 1. The idea (chosen 2026-10-15)

**The credential you earn when you pass.** Every exam on Pasado ends with an official card: the PRC professional ID, the IBP card lawyers carry after the Bar, the CSC eligibility card. Pasado looks like that card: deep civic blue, seal gold, fine security-print lines, and your exam's name set like a name printed on an ID. The page should feel aspirational and trustworthy. Parents and review centres should take it seriously, and reviewees should picture holding the card.

It was picked from five directions (`design/directions.html`): answer sheet, jeepney signboard, **professional ID**, review notebook and oath-taking.

- **Generic on purpose.** No seals, crests or flags, and no copy of any agency's real card layout. Pasado isn't PRC, the Supreme Court or the CSC, and must never look like it speaks for them. The "not affiliated" line stays in the footer and the About sheet.
- **The red shaded bubble stays as the logo,** from the exam answer sheet: the one thing everyone shades on exam day.
- **Gold means "earned"**: the countdown numbers, the pressed "My exams" chip, picked stars. Don't use gold for decoration.
- Colour always means something (see milestone colours). Blue is the brand; red, blue, green and grey mark the four milestones.

## 2. Colour

Design tokens are the CSS variables in `:root`. Always use a token, never a raw hex, so dark mode keeps working.

### Base

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--bg` | `#eef2f8` | `#08111f` | Page: pale blue-grey, like ID card stock |
| `--surface` | `#ffffff` | `#0f1b30` | Cards, rows, inputs, dialogs |
| `--surface-2` | `#e2e9f4` | `#16243e` | Wells inside a surface: countdown box in a row, segmented control, tags |
| `--ink` | `#0d1b33` | `#e9eef7` | Main text |
| `--muted` | `#46556f` | `#9fb0cc` | Secondary text, labels (6.7:1 / 8.6:1 on the page) |
| `--faint` | `#7a879c` | `#6b7d9c` | Icons only, never text (3.6:1 / 4.1:1 on a surface) |
| `--line` | `#ccd6e6` | `#23324d` | Borders and dividers |
| `--civic` | `#0b3a7a` | `#f2c94c` | The main action: primary buttons and pressed filter chips. Civic blue in light, gold in dark |
| `--on-civic` | `#ffffff` | `#08111f` | Text on `--civic` (11:1 / 12:1) |
| `--red` | `#b82a28` | `#ff7b6b` | Deadlines, urgency |
| `--blue` | `#2459c2` | `#8fb4ff` | Exam milestone, info notes |
| `--green` | `#1a7f48` | `#4cd18a` | Results milestone |
| `--gold` | `#b88a12` | `#f2c94c` | Gold **fills**: pressed "My exams" chip, Estimated badge tint |
| `--gold-ink` | `#8a6508` | `#f2c94c` | Gold as an **icon or text** colour: the picked star |
| `--warm` | `#8a5a00` | `#ffb547` | Amber text: Estimated notes |
| `--bubble` | `#b82a28` | same | The logo's shaded bubble |
| `--on-gold` | `#1a1405` | same | Text on a gold fill |
| `--scrim` | `rgba(8, 17, 31, .55)` | same | The dimmed layer behind an open dialog |

### The ID card (the countdown box)

The countdown box is the ID card: civic blue in both themes (a little lighter in dark mode, so it still reads as a card on the dark page). Fine concentric lines in one corner (`--guilloche`) stand in for security printing. On the blue, the milestone colours switch to the bright versions so they stay readable.

| Token | Light | Dark |
|---|---|---|
| `--hero-bg` | `#0b3a7a` | `#0f2b57` |
| `--hero-fg` | `#ffffff` | same |
| `--hero-muted` | `#c3d3ee` | same (7.3:1 / 9.2:1) |
| `--hero-num` | `#f2c94c` | same: gold countdown numbers (6.1:1 on a tile) |
| `--tile` | `#0e4386` | `#13386e` |
| `--tile-line` | `#c9a54a` | same: the thin gold frame around each number |
| `--hero-line` | `rgba(255, 255, 255, .28)` | same: button borders and dividers on the card |
| `--guilloche` | `rgba(255, 255, 255, .07)` | same |
| Milestones on the card | red `#ff9a8c`, exam `#a9c8ff`, results `#7fe3a8`, opens `#c3cde0` | same |

### Meaning colours

Each milestone has one colour everywhere: card steps, row swatches, timeline dots and share cards.

| Milestone | Token | Colour |
|---|---|---|
| Applications open | `--m-opens` | grey |
| Apply by (deadline) | `--m-deadline` | `--red` |
| Exam | `--m-exam` | `--blue` |
| Results | `--m-results` | `--green` |

Urgency: `--hot` (red) for a deadline 14 days away or less, `--warm` (amber) for soon. "Estimated" dates use gold (`--gold` tint, `--warm` text).

## 3. Type (chosen 2026-10-15)

| Token | Font | Use for |
|---|---|---|
| `--display` | **Libre Caslon Text** Bold | Exam names: on the ID card, in rows, on share cards. The "pasado" wordmark. Set like a name printed on an official card. |
| `--sans` | **Public Sans** (variable, 400–700) | Everything else. It was made for US government websites (USWDS), so it reads plain and official. |
| `--mono` | **Red Hat Mono** (variable, 500–700) | Countdown numbers, milestone dates, exam codes. Its digits are all the same width, so the countdown doesn't wobble. |

All three are SIL Open Font License, self-hosted in `site/fonts/` (Latin woff2 for the page, TTF for link previews), licences in `site/licenses/`. The answer-sheet version used IBM Plex Sans and Mono until 2026-10-15.

**Mixed values:** in "3 days", only the number is mono. Words in a number slot ("Today", "Exam ongoing") stay sans (the `word` class).

The fonts are set in three places. Change all three together:
1. `site/style.css`: `@font-face` rules and the `--display` / `--sans` / `--mono` tokens, plus the `<link rel="preload">` lines in `site/index.html`.
2. `site/share.js`: `DISPLAY`, `FONT` and `MONO` (the canvas only draws fonts that are already loaded, so `refreshCard()` loads them first).
3. `functions/og.js`: the TTF files it loads and the width estimates (resvg can't measure text). Measured on all exam names: Libre Caslon Bold ~0.55 em per character on average (0.68 in capitals), Public Sans ~0.50 (Medium) / 0.51 (Bold), Red Hat Mono exactly 0.6.

**Sizes:** exam name on the card `clamp(28px, 6vw, 42px)`; countdown numbers `clamp(30px, 8vw, 48px)`; exam name in a row 17 px; body 15 px; small 13–14 px; labels and ALL-CAPS eyebrows 11–12 px with `letter-spacing: .08em`.

**Weights:** 400 body, 500 secondary, 600 emphasis and buttons, 700 names and numbers. Libre Caslon is loaded at 700 only.

## 4. Shape and space

| | Value |
|---|---|
| Corner radius | **6** tags and code chips · **8** buttons and tabs (`--radius-box`) · **12** inputs and number tiles · **16** cards and dialogs · **18** the ID card (like a card's rounded corners) · **pill** for filter chips only |
| Spacing | Steps of 4: 4, 8, 12, 16, 24, 32 |
| Page width | 920 px max, 16 px side gutter |
| Shadow | one soft shadow, `--shadow`; the ID card gets a slightly deeper one so it sits on the page like a card |

**Buttons are form boxes, not pills (2026-10-14).** Pill-shaped buttons (capsule ends) are a look AI tools default to. Buttons, exam tabs and the card-theme picker use 8 px corners. **Filter chips stay pills** on purpose: filters are where round chips are expected, and the shape keeps "filter" visibly different from "action".

## 5. Components

- **ID card (`.hero`):** the selected exam: eyebrow, exam name (`--display`), code line, four gold number tiles in thin gold frames, the date, 4 milestone steps and actions. The picker ("Which exam are you taking?") uses the same card.
- **Row (`.row`):** countdown box on the left, exam name (`--display`) + code chip + "what's next" in the middle, star and share on the right. Tap to open the timeline.
- **Button (`.pill`, `.ql`):** secondary actions, 8 px corners. `.ql.primary` / `.btn.primary` (`--civic` fill) for one main action at a time.
- **Chip (`.chip`):** filters, round ends. Pressed = `--civic` fill; "My exams" pressed = gold with `--on-gold` text.
- **Segmented control (`.seg`):** Exam day / Apply by / Results.
- **Tag and badge:** tag = a fact ("Exam 30 Nov"); badge = a status ("Estimated", "Moved").
- **Sheet (`dialog.sheet`):** a bottom sheet on phones, a centred dialog on desktop.
- **Calendar menu (`.cal-menu`):** opens under its button, above everything (`z-index: 10`, over the sticky toolbar). `app.js` shifts it left when it would run off the screen.
- **Icons:** **Tabler Icons** (MIT) from Iconify, unchanged: 24 px grid, 2 px round strokes, `currentColor`, all in `site/icons.js`. Add new icons from Tabler only. Stars are icons (outline = not picked, `--faint`; filled = picked, `--gold-ink`). The logo bubble is the brand mark, not an icon.

## 6. Share cards and link previews

Card themes (`CARD_THEMES` in `site/share.js`):
- **Lisensya** (default): the ID card. Civic blue, gold number, guilloche lines in the corner.
- **Puti**: the same card printed light. White, civic-blue name, red number.
- **Araw** (sun) and **Dagat** (sea): brighter options, kept from before.

The link preview image (`/og`, 1200 × 630) uses the Lisensya colours (`COLORS` in `lib/exam.js`).

- Every colour drawn as **text** on a card (the eyebrow, the highlighted step's label, "as of", the URL) needs 4.5:1 against **both** ends of the card's background gradient. The big number, the bubble and the step dots need 3:1.
- Story cards (1080 × 1920) keep text out of the top 14% and bottom 20%, and away from the lower-right corner, because Instagram and Facebook Stories put their buttons there.

Checked 2026-10-15 (lowest ratio against the two gradient ends; text needs 4.5, number, bubble and dots 3):

| Theme | text | muted | number | bubble | deadline | exam | results | opens (dot) |
|---|---|---|---|---|---|---|---|---|
| Lisensya (and link previews) | 9.2 | 6.1 | 5.8 | 3.7 | 4.8 `#ffa395` | 5.5 | 5.9 | 5.8 |
| Puti | 14.5 | 6.3 | 5.2 | 5.2 | 5.2 | 5.4 | 5.2 `#15703f` | 3.8 |
| Araw | 9.3 | 4.7 | 7.1 | 3.1 | 4.6 | 7.1 | 4.6 | 3.4 |
| Dagat | 7.2 | 4.7 | 5.5 | 5.3 | 4.6 | 7.6 | 5.5 | 4.7 |

Puti's exam name is civic blue `#0b3a7a` (9.3:1). Two colours were adjusted during the check: Puti's results green (`#1a7f48` was 4.2:1) and Lisensya's deadline pink (`#ff9a8c` was exactly 4.5, now has room).

## 7. Voice

- **Plain English, with Filipino at the emotional moments.** "Laban, future RN!" on a share card. "Galingan mo!" during the exam. Don't use Filipino in labels, buttons or instructions.
- **Specific, not hype.** "Apply by 24 Oct · 10 days left", not "Don't miss out!" Name the agency and the resolution when you cite a date.
- **Honest about what we don't know.** Estimated dates always say "estimated" or "~", and say what they are based on.
- **Short buttons that say what happens:** "Share countdown", "Add to calendar", "Make this my exam".
- **No ads, no dark patterns.** Say it plainly once ("No ads.") and don't repeat it.
- **Never sound official.** Pasado reports what the agencies publish; it doesn't speak for them.
- **Avoid:** "seamless", "unlock", "journey", "elevate", "game-changer", "Get started", exclamation marks outside the encouragement lines, and emoji in the interface.

## 8. Accessibility

Most visitors are on phones, often outdoors.

### Tap targets

- Every button or link you tap must have a hit area of at least **44 × 44 px** (Apple's guideline).
- A button can *look* smaller. The `::after` rule under "tap targets" in `style.css` gives the listed controls an invisible 44 px area centred on them. Add new small controls to that list.
- Keep at least 44 px between the centres of neighbouring buttons, so their hit areas don't overlap.
- The chip row scrolls, which clips anything outside it, so it has 6 px of padding above and below to fit the hit areas.
- The home link (logo + "pasado") is a 44 px tall row.
- Don't put `overflow: hidden` on a box that holds a menu: it cut the ID card's "Add to calendar" menu off in 2026-10-14 (taps landed on the chips underneath). The guilloche lines are clipped by their own layer instead.

### Lessons from the 2026-10-14 audits (answer-sheet design)

- Never use `--faint` for text; it's for icons.
- Don't fade text with `opacity`; pick a token that passes.
- Coloured text on a tint of the same colour (red on a red tag) needs checking on the tint, not on white.
- Stars and other symbols are icons (3:1), not text characters.
- A box that changes colour between themes (like the ID card) needs its own milestone colours.

### How to check

**2026-10-15 (ID-card redesign):** `design_lint.py site`: 0 errors, 0 warnings. The contrast and tap-target checks ran at **375 px and 1100 px**, in **light and dark**, in 5 states each (exam picked, row open with its calendar menu, the card's calendar menu open, share dialog open, exam picker): 20 runs of **650–703 text elements and icons** each, **0 contrast failures**. One item is listed "check by eye" in light mode: the exam date on the card sits over the faint security-print lines, which the checker can't measure; it is 6.5:1 on the plain blue and the lines are 7% white. Every run measured **90–100 controls** (11 in the share dialog): **0 under 44 px, 0 overlaps**, and nothing covered except controls under an open menu or dialog. Share-card and link-preview palettes: 5 checked, 0 failures after two fixes (section 6). The link-preview SVG was rendered in the browser with the real fonts: no text past the 72 px margins, including "Speech-Language Pathologists".

**To re-check:** run `python ~/.claude/skills/design-brief/scripts/design_lint.py site`, then the skill's `contrast-check.js` and `tap-target-check.js` in the browser at **375 px and ~1100 px**, in **light and dark**, with: an exam picked (card with tabs), one row open with its calendar menu, the card's calendar menu open, the share dialog open, and the exam picker. Read the "covered" list as well as the failures. Check the share-card and link-preview palettes separately (they're in JS).
