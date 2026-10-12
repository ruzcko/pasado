"""Read PRC's yearly "Schedule of Examination" tables into data/prc/<year>.json.

PRC publishes one HTML table per year at https://www.prc.gov.ph/<year>-schedule-examination
(the index is /exam-schedules-menu). Each row has the exam, its dates, testing centers, the
application window, the target results date and links to the exam program and requirements.
Amendments (reschedules, cancellations, extra testing centers) are pasted into the cells as
"Resolution No. ..." text with a link, so we keep those as notices.

The page is hand-edited Word HTML and its layout drifts between years, so the parser is
forgiving but the checks at the end are strict: if a year doesn't look right we stop without
writing anything, and the scheduled job fails loudly instead of publishing bad dates.

Standard library only. Run:  python pipeline/prc.py            (this year and the next)
                             python pipeline/prc.py 2025 2026  (specific years)
                             python pipeline/prc.py --file page.html --year 2026  (offline)
"""
import argparse
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "prc"
URL = "https://www.prc.gov.ph/{year}-schedule-examination"
UA = "pasado.ruzcko.dev schedule reader (+https://pasado.ruzcko.dev; reads the public exam schedule once a day)"

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
          "september", "october", "november", "december"]
NOTICE = re.compile(r"\bReso(?:lution)?\.?\s*(?:No\.?)?\s*\d", re.I)
PHASES = [("revalida", "Revalida"), ("practical", "Practical"), ("written", "Written"),
          ("technical evaluation", "Technical evaluation"), ("oral", "Oral")]


# --- HTML table -> rows of cells -------------------------------------------------

class TableReader(HTMLParser):
    """Collects every <table> as rows of cells; a cell keeps its paragraphs and links."""

    BREAKS = {"p", "br", "div", "li", "tr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.depth = [], 0
        self.row = self.cell = self.link = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "table":
            self.depth += 1
            if self.depth == 1:
                self.tables.append([])
        elif self.depth != 1:
            return
        elif tag == "tr":
            self.row = []
            self.tables[-1].append(self.row)
        elif tag in ("td", "th") and self.row is not None:
            self.cell = {"paras": [""], "links": [], "span": int(a.get("colspan") or 1)}
            self.row.append(self.cell)
        elif self.cell is not None:
            if tag in self.BREAKS:
                self.cell["paras"].append("")
            if tag == "a" and a.get("href"):
                self.link = {"href": a["href"].strip(), "text": ""}
                self.cell["links"].append(self.link)

    def handle_endtag(self, tag):
        if tag == "table":
            self.depth -= 1
        elif self.depth != 1:
            return
        elif tag in ("td", "th"):
            self.cell = None
        elif tag == "a":
            self.link = None
        elif tag == "p" and self.cell is not None:
            self.cell["paras"].append("")

    def handle_data(self, data):
        if self.cell is None:
            return
        self.cell["paras"][-1] += data
        if self.link is not None:
            self.link["text"] += data


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(s or "").replace("\xa0", " ")).strip()


def cell_text(c):
    return clean(" ".join(p for p in c["paras"] if clean(p)))


def absolute(href):
    href = href.strip()
    if href.startswith("//"):
        return "https:" + href
    if href.startswith("/"):
        return "https://www.prc.gov.ph" + href
    if href.startswith("http"):
        return href
    return "https://www.prc.gov.ph/" + href.lstrip("./")


# --- dates ----------------------------------------------------------------------

def month_of(word):
    """'February', 'Feb', 'Feb.', 'Sept' -> 2 / 9; anything else -> None."""
    w = (word or "").lower().rstrip(".")
    if len(w) < 3:
        return None
    for i, m in enumerate(MONTHS):
        if m.startswith(w) or (w.startswith("sept") and i == 8):
            return i + 1
    return None


def parse_dates(text, default_year, default_month=None):
    """'February 04, 05, and 06, 2026' / 'January 22-28, 2026' / 'July 21 to 24, 2026' /
    'Jan 30 - Feb 2, 2026' / '24 & 26' (month from the table's month header) -> sorted ISO days."""
    tokens = re.findall(r"[A-Za-z]+\.?|\d+|-|–", text or "")
    items, pending = [], []  # items: ["d", month, day, year|None] or ["range"]
    month = default_month
    for t in tokens:
        low = t.lower().rstrip(".")
        m = month_of(t) if t[0].isalpha() else None
        if m:
            month = m
        elif t in ("-", "–") or low in ("to", "until", "thru", "through"):
            if items and items[-1][0] == "d":
                items.append(["range"])
        elif t.isdigit():
            n = int(t)
            if n >= 1900:
                for it in pending:
                    it[3] = n
                pending = []
            elif month and 1 <= n <= 31:
                it = ["d", month, n, None]
                items.append(it)
                pending.append(it)
        # other words ("and", "&", weekdays) are separators
    for it in pending:
        it[3] = default_year
    days, prev, ranged = [], None, False
    for it in items:
        if it[0] == "range":
            ranged = True
            continue
        try:
            d = date(it[3], it[1], it[2])
        except ValueError:
            continue
        if ranged and prev and prev < d <= prev + timedelta(days=40):
            x = prev + timedelta(days=1)
            while x <= d:
                days.append(x)
                x += timedelta(days=1)
        else:
            days.append(d)
        prev, ranged = d, False
    return sorted({d.isoformat() for d in days})


def one_date(text, default_year):
    days = parse_dates(text, default_year)
    return days[0] if days else None


# --- names ----------------------------------------------------------------------

def singular(s):
    return " ".join(w[:-1] if w.endswith("s") and len(w) > 3 else w for w in s.split())


def load_catalog():
    cat = json.loads((DATA / "exams.json").read_text(encoding="utf-8"))
    lookup = {}
    for e in cat["exams"]:
        for n in e["names"]:
            lookup[singular(n.lower())] = e["key"]
    return cat, lookup


def identify(raw, lookup):
    """'Dental Hygienists (Written-CBLE)' -> key, phase, variant, cble, rescheduled-marker."""
    low = raw.lower()
    variant = "sple" if "sple" in low else None
    cble = "cble" in low
    phase = next((label for word, label in PHASES if word in low), None)
    resched = "resched" in low
    base = re.sub(r"\([^)]*\)?", " ", raw)  # (CBLE), (SPLE ), (Written-CBLE), (Rescheduled)
    base = re.sub(r"\b(oral examination|technical evaluation)\b", " ", base, flags=re.I)
    base = re.sub(r"\s+[-–]\s+.*$", " ", base)  # "Architects (SPLE) - Singapore"
    base = re.sub(r"[*/]", " ", base)
    base = clean(base).lower()
    base = re.sub(r"\b(cble|sple)\b", " ", base).strip()
    base = re.sub(r"\bengineering\b", "engineers", base).replace("chemistry", "chemists")
    key = lookup.get(singular(base))
    return key, base, phase, variant, cble, resched


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40]


# --- notices --------------------------------------------------------------------

def split_notices(cell):
    """Cell text before the first 'Resolution No.' is content; each resolution after it is a notice."""
    text = cell_text(cell)
    m = NOTICE.search(text)
    if not m:
        return text, []
    content, rest = text[:m.start()].strip(" -–;,"), text[m.start():]
    starts = [x.start() for x in NOTICE.finditer(rest)] + [len(rest)]
    notices = []
    for a, b in zip(starts, starts[1:]):
        t = rest[a:b].strip(" -–;,")
        url = None
        for link in cell["links"]:
            lt = clean(link["text"])
            if lt and NOTICE.search(lt) and t.lower().startswith(lt.lower()[:18]):
                url = absolute(link["href"])
                break
        notices.append({"text": t, **({"url": url} if url else {})})
    return content, notices


# --- one year's table -----------------------------------------------------------

COLS = ["seq", "name", "dates", "days", "centers", "opens", "deadline", "results", "requirements"]


def parse_page(page, year, lookup):
    reader = TableReader()
    reader.feed(page)
    table = max(reader.tables, key=len) if reader.tables else []
    rows, month, problems = [], None, []
    for cells in table:
        texts = [cell_text(c) for c in cells]
        if len(cells) <= 2:  # month header ("JANUARY") or a stray note
            m = texts and texts[0].lower() in MONTHS and month_of(texts[0])
            if m:
                month = m
            continue
        if len(cells) < 7 or texts[1].upper().startswith("NAME OF") or not texts[1]:
            continue
        c = dict(zip(COLS, cells))
        name_text, name_notices = split_notices(c["name"])
        date_text, date_notices = split_notices(c["dates"])
        center_text, center_notices = split_notices(c["centers"])
        notices = name_notices + date_notices + center_notices

        # "(Rescheduled to September 01 and 02, 2026)" / "(Approving One Additional Day to July 21 to 24, 2026)"
        moved = re.search(r"\((?:[^()]*?\b)?(?:rescheduled|moved|approving[^()]*?)\s+to\s+([^()]*)\)?", date_text, re.I)
        orig_days = None
        if moved:
            orig_days = parse_dates(date_text[:moved.start()], year, month)
            days = parse_dates(moved.group(1), year, month)
        else:
            days = parse_dates(date_text, year, month)
        key, base, phase, variant, cble, resched = identify(name_text, lookup)
        program = next((absolute(l["href"]) for l in c["name"]["links"] if not NOTICE.search(clean(l["text"]))), None)
        req = next((absolute(l["href"]) for l in (c["requirements"]["links"] if "requirements" in c else [])), None)
        results_text = cell_text(c["results"]) if "results" in c else ""
        row = {
            "seq": texts[0] or None,
            "name": name_text,
            "key": key or slugify(base),
            "known": bool(key),
            "phase": phase,
            "variant": variant,
            "cble": cble,
            "days": days,
            **({"orig_days": orig_days} if orig_days and orig_days != days else {}),
            "centers": [x for x in (re.sub(r"^(and|&)\s+", "", y.strip(), flags=re.I).strip(" .") for y in re.split(r",|\s+and\s+|\s+&\s+", center_text)) if x],
            "opens": one_date(cell_text(c["opens"]), year) if "opens" in c else None,
            "deadline": one_date(cell_text(c["deadline"]), year) if "deadline" in c else None,
            "results": one_date(results_text, year),
            **({"results_note": results_text} if results_text and not one_date(results_text, year) else {}),
            "notices": notices,
            **({"program": program} if program else {}),
            **({"requirements": req} if req else {}),
            **({"resched_row": True} if resched or any("resched" in n["text"].lower() for n in name_notices) else {}),
        }
        # The application window belongs to the previous year for early exams; a deadline after the exam is a typo.
        for f in ("opens", "deadline"):
            if row[f] and days and row[f] > days[0]:
                row[f] = None
                problems.append(f"{name_text}: {f} after the exam, dropped")
        if not days:
            problems.append(f"no exam date: {name_text!r} / {date_text!r}")
        rows.append(row)
    return rows, problems


def link_reschedules(rows):
    """Mark sittings that a later row cancels or replaces.

    - A row whose own notice cancels it, followed by a same-exam row marked as the reschedule.
    - A separate 'Cancellation of ...' row (no reschedule) cancels a same-exam row on those days.
    """
    def same(a, b):
        return (a["key"], a["variant"], a["phase"]) == (b["key"], b["variant"], b["phase"])

    def cancels(r):
        return any(re.search(r"cancel", n["text"], re.I) for n in r["notices"])

    keep = []
    for i, r in enumerate(rows):
        if r.get("resched_row") is None and not r["seq"] and cancels(r) and not any("resched" in n["text"].lower() for n in r["notices"]):
            hit = [x for x in rows if x is not r and same(x, r) and set(x["days"]) & set(r["days"])]
            if hit:
                for x in hit:
                    x["cancelled"] = True
                    x["notices"] += [n for n in r["notices"] if n not in x["notices"]]
                continue  # the cancellation row itself isn't a sitting
        keep.append(r)
    for i, r in enumerate(keep):
        if not cancels(r) or r.get("cancelled"):
            continue
        # A reschedule for a few centers ("...in Baguio, Rosales and Tuguegarao") isn't a move of the whole exam.
        later = [x for x in keep[i + 1:] if same(x, r) and x.get("resched_row") and x["days"] and r["days"]
                 and x["days"][0] > r["days"][0] and len(x["centers"]) >= 0.6 * len(r["centers"])]
        if later:
            r["cancelled"] = True
            r["moved_to"] = later[0]["days"]
    return keep


def row_id(year, r):
    first = (r.get("orig_days") or r["days"] or ["x"])[0]
    parts = [r["key"], r["variant"] or "", slugify(r["phase"] or ""), first]
    return "-".join(p for p in parts if p)


def check(rows, year, problems):
    """Refuse a parse that doesn't look like a real schedule."""
    numbered = [r for r in rows if r["seq"]]
    errors = []
    if len(numbered) < 30:
        errors.append(f"only {len(numbered)} numbered exams (expected 60+)")
    no_days = [r["name"] for r in rows if not r["days"]]
    if len(no_days) > max(2, len(rows) // 20):
        errors.append(f"{len(no_days)} rows without exam dates: {no_days[:5]}")
    with_deadline = sum(1 for r in numbered if r["deadline"])
    if numbered and with_deadline / len(numbered) < 0.8:
        errors.append(f"only {with_deadline}/{len(numbered)} numbered exams have an application deadline")
    off_year = [r["name"] for r in rows if r["days"] and not r["days"][0].startswith(str(year))]
    if len(off_year) > 3:
        errors.append(f"{len(off_year)} exams dated outside {year}: {off_year[:5]}")
    unknown = sorted({r["name"] for r in rows if not r["known"]})
    if len(unknown) > max(3, len(rows) // 10):
        errors.append(f"{len(unknown)} exam names not in data/exams.json: {unknown[:8]}")
    return errors, unknown


# --- fetch, compare, write ------------------------------------------------------

def fetch(year):
    req = urllib.request.Request(URL.format(year=year), headers={"User-Agent": UA, "Accept": "text/html"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt == 2:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(5 * (attempt + 1))


def build_year(year, page, lookup, now):
    rows, problems = parse_page(page, year, lookup)
    rows = link_reschedules(rows)
    errors, unknown = check(rows, year, problems)
    if errors:
        raise SystemExit(f"{year}: the table doesn't look right, nothing written:\n  - " + "\n  - ".join(errors))
    seen = {}
    for r in rows:
        rid = row_id(year, r)
        n = seen.get(rid, 0)
        seen[rid] = n + 1
        r["id"] = rid if not n else f"{rid}-{n + 1}"
        r.pop("known", None)
        r.pop("resched_row", None)
    path = OUT / f"{year}.json"
    old = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    old_rows = {r["id"]: r for r in (old or {}).get("rows", [])}
    # Remember when a sitting's dates changed, so the page can say "moved".
    for r in rows:
        prev = old_rows.get(r["id"])
        if prev is None:
            r["first_seen"] = now if old else None
        else:
            r["first_seen"] = prev.get("first_seen")
            if prev["days"] != r["days"]:
                r["changed"] = {"at": now, "from": prev["days"]}
            elif prev.get("changed"):
                r["changed"] = prev["changed"]
        if r["first_seen"] is None:
            r.pop("first_seen")
    body = {"year": year, "source": URL.format(year=year), "rows": rows}
    digest = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()[:16]
    if old and old.get("hash") == digest:
        return False, problems, unknown
    body = {"year": year, "source": body["source"], "updated_at": now, "hash": digest,
            "count": len(rows), "unknown_names": unknown, "rows": rows}
    OUT.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    return True, problems, unknown


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("years", nargs="*", type=int)
    ap.add_argument("--file", help="parse a saved page instead of fetching (needs --year)")
    ap.add_argument("--year", type=int)
    args = ap.parse_args()
    _, lookup = load_catalog()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    status_path = DATA / "status.json"
    status = json.loads(status_path.read_text(encoding="utf-8")) if status_path.exists() else {"years": {}}

    if args.file:
        page = Path(args.file).read_text(encoding="utf-8", errors="replace")
        changed, problems, unknown = build_year(args.year, page, lookup, now)
        print(f"{args.year}: {'written' if changed else 'unchanged'}; {len(problems)} notes; unknown names: {unknown}")
        for p in problems:
            print("  note:", p)
        return

    this = datetime.now(timezone(timedelta(hours=8))).year  # Manila
    years = args.years or [this, this + 1] + ([this - 1] if not (OUT / f"{this - 1}.json").exists() else [])
    for y in sorted(years):
        page = fetch(y)
        st = status["years"].setdefault(str(y), {})
        st["checked_at"] = now
        if page is None:
            st["published"] = False
            print(f"{y}: not published yet")
            continue
        changed, problems, unknown = build_year(y, page, lookup, now)
        st["published"] = True
        if changed:
            st["changed_at"] = now
        print(f"{y}: {'CHANGED' if changed else 'unchanged'}" + (f"; unknown names: {unknown}" if unknown else ""))
        for p in problems:
            print("  note:", p)
    status["checked_at"] = now
    status_path.write_text(json.dumps(status, indent=1, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    sys.exit(main())
