#!/usr/bin/env python3
"""
extract_uploads.py — pull ONLY the media library (uploads/**) out of the .wpress archive
straight into public/uploads/, preserving the YYYY/MM structure so the /uploads/... paths in
the generated MDX resolve. Skips the DB, plugins and themes (no 6 GB temp extract needed).

Windows-safe: output paths are made absolute and given the Windows extended-length prefix to
bypass the 260-char MAX_PATH limit (some WordPress media filenames are very long). Re-runnable:
files already fully extracted are skipped, so a crashed run resumes instantly.

Usage (from thebusinesstrades-nextjs/):
    python scripts/extract_uploads.py                 # extract the whole media library
    python scripts/extract_uploads.py --limit 30      # quick validation sample
    python scripts/extract_uploads.py --archive <path> --dest <path>
"""
from __future__ import annotations
import argparse, os, sys
from pathlib import Path

HEADER = 4377
CHUNK = 8 * 1024 * 1024


def _field(h, a, b):
    return h[a:b].split(b"\x00", 1)[0].decode("utf-8", "replace").strip()


def long_path(p) -> str:
    """Return an absolute path safe for the Windows 260-char MAX_PATH limit.
    On Windows, prepend the extended-length prefix (and the UNC variant for network shares);
    on other OSes, return the plain absolute path."""
    ap = os.path.abspath(str(p))
    if os.name == "nt":
        ap = ap.replace("/", "\\")
        if not ap.startswith("\\\\?\\"):
            if ap.startswith("\\\\"):  # UNC network path -> extended UNC form
                ap = "\\\\?\\UNC\\" + ap.lstrip("\\")
            else:
                ap = "\\\\?\\" + ap
    return ap


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive", default="../legacy-wp-data/archive/idealonlinebusiness.wpress")
    ap.add_argument("--dest", default="public/uploads")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    arc, dest = Path(a.archive), Path(a.dest)
    if not arc.is_file():
        sys.exit(f"archive not found: {arc}")
    os.makedirs(long_path(dest), exist_ok=True)

    extracted = resumed = skipped = errors = 0
    with open(long_path(arc), "rb") as f:
        while True:
            h = f.read(HEADER)
            if len(h) < HEADER or h == b"\x00" * HEADER:
                break
            name = _field(h, 0, 255)
            try:
                size = int(_field(h, 255, 269) or "0")
            except ValueError:
                break
            prefix = _field(h, 281, 4377)
            path = f"{prefix}/{name}" if prefix not in ("", ".") else name

            if not path.startswith("uploads/"):
                f.seek(size, 1); skipped += 1; continue

            rel = path[len("uploads/"):]
            out = dest / rel
            outw = long_path(out)

            # resume: a previously completed file is skipped (compare byte size)
            if os.path.exists(outw) and os.path.getsize(outw) == size:
                f.seek(size, 1); resumed += 1; continue

            remaining = size
            try:
                os.makedirs(long_path(out.parent), exist_ok=True)
                with open(outw, "wb") as w:
                    while remaining > 0:
                        buf = f.read(min(CHUNK, remaining))
                        if not buf:
                            break
                        w.write(buf); remaining -= len(buf)
                extracted += 1
            except OSError as e:
                # never let one bad file abort the 32k-image run; realign the stream
                print(f"  ! skipped (write error): {rel[:80]} -> {e}", file=sys.stderr)
                errors += 1
                if remaining > 0:
                    f.seek(remaining, 1)

            if extracted and extracted % 500 == 0:
                print(f"  ...{extracted} extracted ({resumed} already present)")
            if a.limit and extracted >= a.limit:
                print(f"limit {a.limit} reached (validation sample)")
                break

    print(f"Done. extracted={extracted}  already-present={resumed}  "
          f"non-upload-skipped={skipped}  write-errors={errors}  ->  {dest}/")


if __name__ == "__main__":
    main()
