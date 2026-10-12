"""Local preview of site/ that also answers /<exam-key> the way the Pages Function does (with index.html).

Run: python pipeline/dev.py [port]   (default 8774)
"""
import http.server
import json
import sys
from functools import partial
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].strip("/")
        if path and "/" not in path and "." not in path:
            keys = {e["key"] for e in json.loads((SITE / "data" / "exams.json").read_text(encoding="utf-8"))["exams"]}
            if path in keys:
                self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8774
    http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, directory=str(SITE))).serve_forever()
