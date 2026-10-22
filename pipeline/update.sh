#!/bin/sh
# Read PRC's schedule and publish it if anything changed; the push makes Cloudflare Pages rebuild.
# PRC refuses connections from cloud servers (GitHub Actions included), so run this on a schedule
# from an ordinary home or office connection, in a clone that stays on `main`.
set -e
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"

[ "$(git branch --show-current)" = main ] || { echo "Not on main; skipping."; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "Uncommitted changes; skipping."; exit 1; }
git pull -q --ff-only origin main

"$PY" pipeline/prc.py  # exits with an error (and writes nothing) if a page no longer looks like a schedule

if ! git diff --quiet -- data/prc; then
  git add data/prc data/status.json
  git commit -q -m "PRC schedule changed $(date -u +%Y-%m-%d)"
elif ! git diff --quiet -- data/status.json && [ "$(git log -1 --format=%cs -- data/status.json)" != "$(date +%Y-%m-%d)" ]; then
  # Nothing new from PRC: record the check once a day, so the site can say when it last looked.
  git add data/status.json
  git commit -q -m "Checked PRC schedule $(date -u +%Y-%m-%d): no changes"
else
  git checkout -q -- data/status.json
  echo "No changes."
  exit 0
fi
git push -q origin main
echo "Pushed."
