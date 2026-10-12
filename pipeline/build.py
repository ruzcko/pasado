"""Build the site's data from data/prc/<year>.json (written by prc.py). No network.

Writes:
  site/data/exams.json      every exam with its upcoming sittings (application window, exam days, results)
  site/cal/<key>.ics        one calendar feed per exam (plus <key>-sple.ics for exams abroad)
  site/sitemap.xml

Next year's sittings are estimated from this year's (same weekday, 52 weeks later) until PRC
publishes the real schedule, and are marked "est". Estimates never go into calendar feeds.
Run: python pipeline/build.py
"""
import hashlib
import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SITE = ROOT / "site"
HOST = "pasado.ruzcko.dev"
MANILA = timezone(timedelta(hours=8))
KEEP_PAST_DAYS = 45  # keep a sitting this long after its last date, so recent results still show


def load(path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def shift(iso, days):
    return (date.fromisoformat(iso) + timedelta(days=days)).isoformat() if iso else None


def tidy_centers(centers):
    seen, out = set(), []
    for c in centers:
        c = re.sub(r"\s+PRC$", "", c).strip()
        k = c.lower()
        if k and k not in seen:
            seen.add(k)
            out.append(c)
    return out


ABROAD = {"hong kong", "singapore", "taiwan", "japan", "qatar", "doha", "dubai", "united arab emirates",
          "middle east", "riyadh", "jeddah", "kuwait", "bahrain", "oman", "saudi arabia"}


def sitting_from(row, year):
    s = {
        "id": row["id"],
        "year": year,
        "days": row["days"],
        "opens": row.get("opens"),
        "deadline": row.get("deadline"),
        "results": row.get("results"),
        "centers": tidy_centers(row.get("centers", [])),
    }
    for k in ("variant", "phase", "orig_days", "moved_to", "results_note", "program", "requirements", "changed"):
        if row.get(k):
            s[k] = row[k]
    if row.get("cble"):
        s["cble"] = True
    if row.get("cancelled"):
        s["cancelled"] = True
    if row.get("notices"):
        s["notices"] = row["notices"]
    if s["centers"] and all(c.lower() in ABROAD for c in s["centers"]):
        s["abroad"] = True
    return s


def estimate(s):
    """Next year's sitting: same weekday 52 weeks on. Rough, so the page shows it as 'around <month>'."""
    e = {
        "id": f"est-{s['id']}",
        "year": s["year"] + 1,
        "est": True,
        "est_from": s["year"],
        "days": [shift(d, 364) for d in s["days"]],
        "opens": shift(s.get("opens"), 364),
        "deadline": shift(s.get("deadline"), 364),
        "results": shift(s.get("results"), 364),
        "centers": s["centers"],
    }
    for k in ("variant", "phase", "cble", "abroad"):
        if s.get(k):
            e[k] = s[k]
    return e


def last_date(s):
    return max(d for d in [*s["days"], s.get("results")] if d)


def build():
    catalog = load(DATA / "exams.json")
    status = load(DATA / "status.json", {"years": {}})
    overrides = load(DATA / "overrides.json", {}).get("sittings", {})
    years = {}
    for p in sorted((DATA / "prc").glob("*.json")):
        snap = load(p)
        years[snap["year"]] = snap
    if not years:
        raise SystemExit("no data/prc/*.json yet: run pipeline/prc.py first")

    today = datetime.now(MANILA).date()
    cutoff = (today - timedelta(days=KEEP_PAST_DAYS)).isoformat()
    exams = {e["key"]: {k: v for k, v in e.items() if k != "names"} | {"sittings": []} for e in catalog["exams"]}
    latest = max(years)

    for year, snap in sorted(years.items()):
        for row in snap["rows"]:
            if not row["days"]:
                continue
            s = sitting_from(row, year)
            s.update(overrides.get(s["id"], {}))
            if row["key"] not in exams:  # a new exam PRC added that the catalog doesn't know yet
                exams[row["key"]] = {"key": row["key"], "name": re.sub(r"\s*\(.*", "", row["name"]).strip(" *"),
                                     "short": [], "category": "other", "sittings": []}
            exams[row["key"]]["sittings"].append(s)

    # Next year's schedule isn't out: estimate it from the latest published year.
    next_year = latest + 1
    published_next = status.get("years", {}).get(str(next_year), {}).get("published")
    if not published_next and next_year <= today.year + 1:
        for ex in exams.values():
            for s in [x for x in ex["sittings"] if x["year"] == latest and not x.get("cancelled")]:
                ex["sittings"].append(estimate(s))

    out = []
    for ex in exams.values():
        ex["sittings"] = sorted((s for s in ex["sittings"] if last_date(s) >= cutoff),
                                key=lambda s: (s["days"][0], s.get("variant") or "", s.get("phase") or ""))
        if ex["sittings"]:
            out.append(ex)
    out.sort(key=lambda e: e["name"])

    checked = status.get("checked_at")
    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "checked_at": checked,
        "years": {str(y): {"source": s["source"], "updated_at": s.get("updated_at")} for y, s in sorted(years.items())},
        "next_year": {"year": next_year, "published": bool(published_next)},
        "categories": catalog["categories"] | {"other": "Other"},
        "exams": out,
    }
    (SITE / "data").mkdir(parents=True, exist_ok=True)
    (SITE / "data" / "exams.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                                              encoding="utf-8", newline="\n")
    write_feeds(out)
    write_sitemap(out)
    stamp_assets()
    n = sum(len(e["sittings"]) for e in out)
    est = sum(1 for e in out for s in e["sittings"] if s.get("est"))
    print(f"{len(out)} exams, {n} sittings ({est} estimated), years {sorted(years)}, next year published: {bool(published_next)}")


# --- calendar feeds -------------------------------------------------------------

def ics_escape(text):
    return (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    if len(line.encode("utf-8")) <= 75:
        return line
    parts, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > (75 if not parts else 74):
            parts.append(cur.decode("utf-8"))
            cur = b""
        cur += b
    parts.append(cur.decode("utf-8"))
    return "\r\n ".join(parts)


def day_event(uid, start, end, summary, desc, stamp, url):
    end_excl = (date.fromisoformat(end) + timedelta(days=1)).strftime("%Y%m%d")
    return ["BEGIN:VEVENT", f"UID:{uid}@{HOST}", f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{start.replace('-', '')}", f"DTEND;VALUE=DATE:{end_excl}",
            f"SUMMARY:{ics_escape(summary)}", f"DESCRIPTION:{ics_escape(desc)}", f"URL:{url}",
            "TRANSP:TRANSPARENT", "END:VEVENT"]


def label(ex, s):
    bits = [ex["name"]]
    if s.get("phase"):
        bits.append(f"({s['phase']})")
    if s.get("variant") == "sple":
        bits.append("SPLE")
    return " ".join(bits) + " board exam"


def feed(ex, sittings, name, stamp):
    url = f"https://{HOST}/{ex['key']}"
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ruzcko//pasado//EN", "CALSCALE:GREGORIAN",
             "METHOD:PUBLISH", f"X-WR-CALNAME:{ics_escape(name)}", "X-WR-TIMEZONE:Asia/Manila",
             "X-PUBLISHED-TTL:PT12H", "REFRESH-INTERVAL;VALUE=DURATION:PT12H"]
    note = "\n\nFrom PRC's published schedule. Always confirm on prc.gov.ph."
    for s in sittings:
        if s.get("est") or s.get("cancelled"):
            continue
        what = label(ex, s)
        where = ", ".join(s["centers"])
        if s.get("opens"):
            lines += day_event(f"{s['id']}-opens", s["opens"], s["opens"], f"Applications open · {what}",
                               f"Applications for the {what} open (LERIS, online.prc.gov.ph).{note}", stamp, url)
        if s.get("deadline"):
            lines += day_event(f"{s['id']}-deadline", s["deadline"], s["deadline"], f"Last day to apply · {what}",
                               f"Deadline to file applications for the {what}.{note}", stamp, url)
        lines += day_event(f"{s['id']}-exam", s["days"][0], s["days"][-1], f"{what}",
                           f"Exam days: {', '.join(s['days'])}.\nTesting centers: {where}.{note}", stamp, url)
        if s.get("results"):
            lines += day_event(f"{s['id']}-results", s["results"], s["results"], f"Results (target) · {what}",
                               f"PRC's target date to release results.{note}", stamp, url)
    lines.append("END:VCALENDAR")
    return "\r\n".join(fold(x) for x in lines) + "\r\n"


def write_feeds(exams):
    cal = SITE / "cal"
    cal.mkdir(parents=True, exist_ok=True)
    for old in cal.glob("*.ics"):
        old.unlink()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for ex in exams:
        local = [s for s in ex["sittings"] if s.get("variant") != "sple"]
        abroad = [s for s in ex["sittings"] if s.get("variant") == "sple"]
        if local:
            (cal / f"{ex['key']}.ics").write_text(feed(ex, local, f"{ex['name']} board exam", stamp), encoding="utf-8", newline="")
        if abroad:
            (cal / f"{ex['key']}-sple.ics").write_text(feed(ex, abroad, f"{ex['name']} board exam (SPLE, abroad)", stamp),
                                                       encoding="utf-8", newline="")


def write_sitemap(exams):
    urls = [f"https://{HOST}/"] + [f"https://{HOST}/{e['key']}" for e in exams]
    body = "\n".join(f"  <url><loc>{u}</loc></url>" for u in urls)
    (SITE / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n',
        encoding="utf-8", newline="\n")


def stamp_assets():
    """Version asset URLs by content hash: the ruzcko.dev zone tells browsers to cache them for 4 hours.

    Only on Cloudflare Pages builds (CF_PAGES=1), so local checkouts stay clean.
    """
    if os.environ.get("CF_PAGES") != "1":
        return
    index = SITE / "index.html"
    page = index.read_text(encoding="utf-8")
    for name in ("app.js", "share.js", "style.css"):
        digest = hashlib.sha256((SITE / name).read_bytes()).hexdigest()[:10]
        page = re.sub(rf'"/?{re.escape(name)}(\?v=[0-9a-f]+)?"', f'"/{name}?v={digest}"', page)
    index.write_text(page, encoding="utf-8")
    print("stamped asset versions")


if __name__ == "__main__":
    build()
