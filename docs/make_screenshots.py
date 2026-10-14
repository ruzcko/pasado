"""Render the README screenshots: docs/screenshot-light.png and docs/screenshot-dark.png.

Each image is the desktop home page next to one exam's countdown at phone width,
on a transparent background so it sits well on GitHub's light and dark themes.
Needs Google Chrome and Pillow. Serves site/ itself, so stop nothing and run:

    python docs/make_screenshots.py
"""

import subprocess
import sys
import tempfile
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from dev import SITE, Handler  # noqa: E402

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 8775
EXAM = "physical-therapists"  # an exam with confirmed dates, so the countdown ticks
SCALE = 2
LINE = {"light": "#e1d8c6", "dark": "#252e47"}  # --line in each theme

# Loads the site in a fixed-size frame with the theme preset, because headless
# Chrome won't make a window narrower than ~500 px and ignores colour-scheme flags.
SHOT = """<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>
const p = new URLSearchParams(location.search);
localStorage.setItem("pasado:v1", JSON.stringify({ theme: p.get("t") }));
const f = document.createElement("iframe");
f.src = p.get("u"); f.style.cssText = `width:${p.get("w")}px;height:${p.get("h")}px;border:0;display:block`;
document.body.append(f);
</script>"""


def capture(out, theme, url, w, h):
    q = f"t={theme}&u={url}&w={w}&h={h}"
    subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--force-device-scale-factor={SCALE}",
                    f"--window-size={max(w, 500)},{h}", "--virtual-time-budget=8000", f"--screenshot={out}",
                    f"http://127.0.0.1:{PORT}/_shot.html?{q}"], check=True, capture_output=True)
    return Image.open(out).convert("RGBA").crop((0, 0, w * SCALE, h * SCALE))


def rounded(img, radius, line):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, mask=mask)
    ImageDraw.Draw(out).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius, outline=line, width=SCALE)
    return out


def main():
    shot = SITE / "_shot.html"
    shot.write_text(SHOT, encoding="utf-8")
    Handler.log_message = lambda *a: None
    server = ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=str(SITE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with tempfile.TemporaryDirectory() as tmp:
            for theme in ("light", "dark"):
                desk = capture(f"{tmp}/d.png", theme, "/", 1280, 860)
                desk = desk.crop((172 * SCALE, 0, 1108 * SCALE, desk.height))  # the 888 px column, plus margin
                phone = capture(f"{tmp}/p.png", theme, f"/{EXAM}", 375, 812)
                desk, phone = rounded(desk, 14 * SCALE, LINE[theme]), rounded(phone, 28 * SCALE, LINE[theme])
                gap = 32 * SCALE
                canvas = Image.new("RGBA", (desk.width + gap + phone.width, desk.height), (0, 0, 0, 0))
                canvas.alpha_composite(desk, (0, 0))
                canvas.alpha_composite(phone, (desk.width + gap, (desk.height - phone.height) // 2))
                canvas.save(ROOT / "docs" / f"screenshot-{theme}.png", optimize=True)
                print(f"docs/screenshot-{theme}.png", canvas.size)
    finally:
        server.shutdown()
        shot.unlink()


if __name__ == "__main__":
    main()
