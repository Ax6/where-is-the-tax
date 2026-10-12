#!/usr/bin/env python3
"""Download every raw source listed in research/sources.json and write research/raw/MANIFEST.json.

Run with:  .venv/bin/python -I scripts/research/fetch.py [--only SOURCE_ID ...] [--verify]

Rules (see research/README.md):
- Each source has its own directory: research/raw/<source_id>/ (committed) or
  research/cache/<source_id>/ (git-ignored) depending on the licence decision.
- Downloaded bytes are never executed or imported. They are data.
- The manifest records URL, retrieval timestamp, byte size, SHA-256, licence and the
  redistribution decision for every file, so anyone can re-fetch and compare checksums.
- --verify re-downloads nothing; it only recomputes checksums of files on disk against the manifest.
"""
from __future__ import annotations

import argparse
import functools
print = functools.partial(print, flush=True)
import hashlib
import json
import os
import sys
import time
import ssl
import urllib.request

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # pragma: no cover
    SSL_CONTEXT = ssl.create_default_context()
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "research" / "sources.json"
RAW = ROOT / "research" / "raw"
CACHE = ROOT / "research" / "cache"
MANIFEST = RAW / "MANIFEST.json"
USER_AGENT = "where-is-the-tax research fetcher (https://github.com/; contact via repo issues)"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path, retries: int = 2) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=60, context=SSL_CONTEXT) as resp, dest.open("wb") as out:
                total = 0
                while True:
                    chunk = resp.read(1 << 20)
                    if not chunk:
                        break
                    out.write(chunk)
                    total += len(chunk)
            return total
        except Exception as err:  # noqa: BLE001 - we want to retry on anything transient
            last_err = err
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"download failed for {url}: {last_err}")


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"schema_version": 2, "generated": None, "files": []}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", default=None, help="source ids to fetch")
    parser.add_argument("--verify", action="store_true", help="only verify checksums of files on disk")
    parser.add_argument("--force", action="store_true", help="re-download even if the file exists")
    args = parser.parse_args()

    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    # Topic-specific registries (research/sources.d/*.json) are merged in; same schema, key "sources".
    for extra in sorted((ROOT / "research" / "sources.d").glob("*.json")):
        sources["sources"].extend(json.loads(extra.read_text(encoding="utf-8"))["sources"])
    manifest = load_manifest()
    by_key = {(f["source_id"], f["file"]): f for f in manifest["files"]}

    problems = 0
    for src in sources["sources"]:
        sid = src["id"]
        if args.only and sid not in args.only:
            continue
        committed = src["redistribution"] == "allowed" and src.get("store", "raw") == "raw"
        base = (RAW if committed else CACHE) / sid
        for item in src["files"]:
            fname = item["file"]
            dest = base / fname
            key = (sid, fname)
            if args.verify:
                entry = by_key.get(key)
                if not dest.exists():
                    print(f"MISSING  {sid}/{fname}")
                    problems += 1
                elif entry is None:
                    print(f"UNLISTED {sid}/{fname}")
                    problems += 1
                elif sha256_of(dest) != entry["sha256"]:
                    print(f"CHANGED  {sid}/{fname}")
                    problems += 1
                else:
                    print(f"ok       {sid}/{fname}")
                continue

            if dest.exists() and not args.force:
                size = dest.stat().st_size
                print(f"have     {sid}/{fname} ({size} B)")
            else:
                try:
                    size = download(item["url"], dest)
                except RuntimeError as err:
                    print(f"FAILED   {sid}/{fname}: {err}", file=sys.stderr)
                    problems += 1
                    continue
                print(f"fetched  {sid}/{fname} ({size} B)")
            digest = sha256_of(dest)
            prev = by_key.get(key)
            if prev and prev["sha256"] != digest and not args.force:
                print(f"  note: checksum differs from manifest (source changed upstream?) {sid}/{fname}")
            by_key[key] = {
                "source_id": sid,
                "file": fname,
                "url": item["url"],
                "path": str(dest.relative_to(ROOT)),
                "retrieved": (prev or {}).get("retrieved") if dest.exists() and prev and prev["sha256"] == digest and not args.force else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "bytes": size,
                "sha256": digest,
                "licence": src["licence"],
                "redistribution": src["redistribution"],
                "committed": committed,
                "description": item.get("description", ""),
            }

    if not args.verify:
        manifest["generated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        manifest["files"] = sorted(by_key.values(), key=lambda f: (f["source_id"], f["file"]))
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {MANIFEST.relative_to(ROOT)} with {len(manifest['files'])} files")
    return 1 if problems else 0


if __name__ == "__main__":
    os.chdir(ROOT)
    raise SystemExit(main())
