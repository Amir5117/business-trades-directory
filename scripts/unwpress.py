#!/usr/bin/env python3
"""
unwpress.py — stream-extract an All-in-One WP Migration ".wpress" archive.
(UPDATED to bypass Windows MAX_PATH limits by skipping useless plugins)
"""
from __future__ import annotations
import sys
from pathlib import Path

HEADER_SIZE = 4377
OFF = {"name": (0, 255), "size": (255, 269), "mtime": (269, 281), "prefix": (281, 4377)}
CHUNK = 8 * 1024 * 1024  # 8 MB

def _field(header: bytes, key: str) -> str:
    a, b = OFF[key]
    return header[a:b].split(b"\x00", 1)[0].decode("utf-8", "replace").strip()

def extract(archive: Path, out_dir: Path) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    with archive.open("rb") as fh:
        while True:
            header = fh.read(HEADER_SIZE)
            if len(header) < HEADER_SIZE or header == b"\x00" * HEADER_SIZE:
                break  # clean EOF
            name = _field(header, "name")
            prefix = _field(header, "prefix")
            try:
                size = int(_field(header, "size") or "0")
            except ValueError:
                print(f"  ! bad size header near file {name!r}; aborting", file=sys.stderr)
                break

            rel = Path(prefix) / name if prefix not in ("", ".") else Path(name)
            rel_str = str(rel).replace("\\", "/")
            
            # --- WINDOWS PATH FIX: ONLY EXTRACT WHAT WE ACTUALLY NEED ---
            # Skip everything except the SQL database and the uploads directory
            if not (rel_str.endswith(".sql") or "wp-content/uploads/" in rel_str):
                # Fast-forward the stream payload to skip this useless file
                remaining = size
                while remaining > 0:
                    buf = fh.read(min(CHUNK, remaining))
                    if not buf: break
                    remaining -= len(buf)
                continue
            # ------------------------------------------------------------

            dest = out_dir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)

            remaining = size
            with dest.open("wb") as out:
                while remaining > 0:
                    buf = fh.read(min(CHUNK, remaining))
                    if not buf:
                        print(f"  ! truncated archive while reading {rel}", file=sys.stderr)
                        return count
                    out.write(buf)
                    remaining -= len(buf)
            count += 1
            if count % 500 == 0:
                print(f"  …{count} essential files extracted")
    return count

def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: python scripts/unwpress.py <archive.wpress> <output_dir>")
    archive, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    if not archive.is_file():
        sys.exit(f"archive not found: {archive}")
    print(f"Extracting {archive.name} -> {out_dir}")
    print("Filtering archive: Only extracting database.sql and wp-content/uploads/...")
    n = extract(archive, out_dir)
    print(f"Done. {n} essential files extracted.")
    db = out_dir / "database.sql"
    print("database.sql present ✔" if db.exists() else "WARNING: database.sql not found in archive root")

if __name__ == "__main__":
    main()