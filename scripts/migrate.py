#!/usr/bin/env python3
"""
migrate.py — WordPress(ACF) -> MDX transformer for TheBusinessTrades.

READS strictly from ../legacy-wp-data (read-only) and WRITES strictly into this
Next.js project's content/, public/uploads/ and redirects/ folders. It never boots
WordPress and never mutates the source.

Pipeline per post:
    relational rows ──▶ reconstruct ACF (repeaters/groups) ──▶ harvest affiliate URLs
        ──▶ rebrand-in-transit (affiliate URLs masked) ──▶ HTML→MDX body
        ──▶ YAML frontmatter ──▶ write .mdx  ──▶ append to URL parity map

Run:
    python scripts/migrate.py --source mysql        # Option A (recommended)
    python scripts/migrate.py --source sqldump      # parse database.sql directly
    python scripts/migrate.py --source mysql --copy-media --types businesstool,page
"""
from __future__ import annotations
import argparse, csv, json, re, sys, shutil
from pathlib import Path

import yaml
import phpserialize
from slugify import slugify
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from urllib.parse import urlparse

import config as C

try:
    import ftfy
except ImportError:  # installed via requirements.txt; degrade gracefully if absent
    ftfy = None

# ======================================================================================
# small helpers
# ======================================================================================
def log(msg: str) -> None:
    print(msg, flush=True)

_SER_RE = re.compile(r'^(a:\d+:\{|O:\d+:|s:\d+:|b:[01];|i:-?\d+;|d:)')

def maybe_unserialize(val):
    """Decode PHP-serialized ACF values (link arrays, repeater blobs) into Python."""
    if val is None:
        return None
    if isinstance(val, (bytes, bytearray)):
        val = val.decode("utf-8", "replace")
    if isinstance(val, str) and _SER_RE.match(val.strip()):
        try:
            return phpserialize.loads(val.encode("utf-8"), decode_strings=True)
        except Exception:
            return val
    return val

def is_external(url) -> bool:
    if not isinstance(url, str):
        return False
    u = url.strip()
    if u.startswith("//"):
        u = "https:" + u
    if not u.lower().startswith(("http://", "https://")):
        return False
    host = urlparse(u).netloc.lower().split(":")[0]
    return host and not any(host == h or host.endswith("." + h) for h in C.INTERNAL_HOSTS)

# ---- rebrand-in-transit ---------------------------------------------------------------
def _case_preserve(match: re.Match) -> str:
    """idealonlinebusiness -> thebusinesstrades, IdealOnlineBusiness -> TheBusinessTrades."""
    s = match.group(0)
    if s.isupper():
        return C.NEW_BRAND_DISPLAY.upper()
    if s.islower():
        return C.NEW_BRAND_SLUG
    return C.NEW_BRAND_DISPLAY

def _fix_text(s):
    """Repair WordPress double-encoding mojibake.
    ftfy fixes the cp1252 family; the OEM cp850/cp437 family it misses (UTF-8 smart
    punctuation rendered as 3 garbled chars, e.g. the apostrophe) is repaired with a
    guarded code-page round-trip that no-ops on clean/ASCII/accented text."""
    if not isinstance(s, str) or not s:
        return s
    if ftfy is not None:
        try:
            s = ftfy.fix_text(s, uncurl_quotes=False)  # keep typographic ' " quotes
        except Exception:
            pass
    def _oem(m):
        for cp in ("cp850", "cp437"):
            try:
                return m.group(0).encode(cp).decode("utf-8")
            except Exception:
                continue
        return m.group(0)
    # Fix each mojibake run ("\xd4\xc7" + 1 char = one UTF-8 'E2 80 xx' glyph) in place, so
    # legitimate em dashes / accents elsewhere stay intact even within the same string.
    return re.sub("(?:\xd4\xc7.)+", _oem, s)


def apply_rebrand(text, protected: list[str] | None = None):
    """Swap all legacy brand tokens -> TheBusinessTrades, but NEVER inside protected
    strings (affiliate URLs, upload paths). Non-str values pass through untouched."""
    if not isinstance(text, str) or not text:
        return text
    text = _fix_text(text)
    masks: dict[str, str] = {}
    if protected:
        for i, p in enumerate(sorted(set(protected), key=len, reverse=True)):
            if p and p in text:
                token = f"\x00P{i}\x00"
                masks[token] = p
                text = text.replace(p, token)
    for pattern, repl, flags, case_preserve in C.REBRAND_RULES:
        text = re.sub(pattern, (_case_preserve if case_preserve else repl), text, flags=flags)
    for token, original in masks.items():
        text = text.replace(token, original)
    return text

# ======================================================================================
# data source: MySQL (read-only) OR direct mysqldump parse
# ======================================================================================
WP_POSTS_COLS = ["ID","post_author","post_date","post_date_gmt","post_content","post_title",
    "post_excerpt","post_status","comment_status","ping_status","post_password","post_name",
    "to_ping","pinged","post_modified","post_modified_gmt","post_content_filtered","post_parent",
    "guid","menu_order","post_type","post_mime_type","comment_count"]
WP_POSTMETA_COLS = ["meta_id","post_id","meta_key","meta_value"]
WP_TERMS_COLS = ["term_id","name","slug","term_group"]
WP_TT_COLS = ["term_taxonomy_id","term_id","taxonomy","description","parent","count"]
WP_TR_COLS = ["object_id","term_taxonomy_id","term_order"]

class WpSource:
    """Uniform read API over either a live MySQL connection or a parsed .sql dump."""
    def __init__(self, mode: str):
        self.mode = mode
        self._dump: dict[str, list[dict]] = {}
        if mode == "mysql":
            import pymysql
            self.conn = pymysql.connect(host=C.DB["host"], port=C.DB["port"], user=C.DB["user"],
                password=C.DB["password"], database=C.DB["name"], charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor)
        else:
            self._parse_dump(C.LEGACY_SQLDUMP)

    # --- MySQL ---
    def _q(self, sql: str, args=()):
        with self.conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()

    # --- mysqldump fallback (standard extended-INSERT output) ---
    def _parse_dump(self, path: Path):
        if not path.exists():
            sys.exit(f"database.sql not found at {path}. Run unwpress.py first or use --source mysql.")
        wanted = {f"{C.TP}posts": WP_POSTS_COLS, f"{C.TP}postmeta": WP_POSTMETA_COLS,
                  f"{C.TP}terms": WP_TERMS_COLS, f"{C.TP}term_taxonomy": WP_TT_COLS,
                  f"{C.TP}term_relationships": WP_TR_COLS}
        self._dump = {t: [] for t in wanted}
        buf, table = "", None
        insert_re = re.compile(r"INSERT INTO [`\"]?([\w]+)[`\"]?\s+VALUES", re.I)
        with path.open("r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if table is None:
                    m = insert_re.search(line)
                    if not m or m.group(1) not in wanted:
                        continue
                    table = m.group(1); buf = line[m.end():]
                else:
                    buf += line
                if table and buf.rstrip().endswith(";"):
                    for tup in _split_tuples(buf):
                        vals = _tokenize_values(tup)
                        cols = wanted[table]
                        if len(vals) == len(cols):
                            self._dump[table].append(dict(zip(cols, vals)))
                    table, buf = None, ""

    def posts(self, types: list[str], statuses=("publish",)):
        if self.mode == "mysql":
            ph = ",".join(["%s"] * len(types)); ps = ",".join(["%s"] * len(statuses))
            return self._q(f"SELECT * FROM {C.TP}posts WHERE post_type IN ({ph}) "
                           f"AND post_status IN ({ps})", (*types, *statuses))
        return [r for r in self._dump[f"{C.TP}posts"]
                if r["post_type"] in types and r["post_status"] in statuses]

    def attachments_map(self):
        """attachment ID -> upload URL (guid)."""
        if self.mode == "mysql":
            rows = self._q(f"SELECT ID, guid FROM {C.TP}posts WHERE post_type='attachment'")
        else:
            rows = [r for r in self._dump[f"{C.TP}posts"] if r["post_type"] == "attachment"]
        return {str(r["ID"]): r["guid"] for r in rows}

    def attached_files(self):
        """attachment ID -> relative uploads path from _wp_attached_file (e.g. '2026/04/logo.png')."""
        if self.mode == "mysql":
            rows = self._q(f"SELECT post_id, meta_value FROM {C.TP}postmeta WHERE meta_key='_wp_attached_file'")
            return {str(r["post_id"]): r["meta_value"] for r in rows if r["meta_value"]}
        out = {}
        for r in self._dump[f"{C.TP}postmeta"]:
            if r["meta_key"] == "_wp_attached_file" and r["meta_value"]:
                out[str(r["post_id"])] = r["meta_value"]
        return out

    def meta(self, post_id):
        if self.mode == "mysql":
            rows = self._q(f"SELECT meta_key, meta_value FROM {C.TP}postmeta WHERE post_id=%s", (post_id,))
        else:
            rows = [r for r in self._dump[f"{C.TP}postmeta"] if str(r["post_id"]) == str(post_id)]
        return {r["meta_key"]: r["meta_value"] for r in rows}

    def terms_for(self, object_id):
        if self.mode == "mysql":
            return self._q(
                f"SELECT t.name, t.slug, tt.taxonomy, tt.parent FROM {C.TP}term_relationships tr "
                f"JOIN {C.TP}term_taxonomy tt ON tt.term_taxonomy_id=tr.term_taxonomy_id "
                f"JOIN {C.TP}terms t ON t.term_id=tt.term_id WHERE tr.object_id=%s", (object_id,))
        tt_by_id = {r["term_taxonomy_id"]: r for r in self._dump[f"{C.TP}term_taxonomy"]}
        terms_by_id = {r["term_id"]: r for r in self._dump[f"{C.TP}terms"]}
        out = []
        for rel in self._dump[f"{C.TP}term_relationships"]:
            if str(rel["object_id"]) == str(object_id) and rel["term_taxonomy_id"] in tt_by_id:
                tt = tt_by_id[rel["term_taxonomy_id"]]; t = terms_by_id.get(tt["term_id"], {})
                out.append({"name": t.get("name"), "slug": t.get("slug"),
                            "taxonomy": tt["taxonomy"], "parent": tt["parent"]})
        return out

# tuple splitting + value tokenizing for the dump path -----------------------------------
def _split_tuples(blob: str):
    """Yield each (...) row from a `VALUES (...),(...);` blob, respecting quotes."""
    depth, in_str, esc, cur = 0, False, False, []
    for ch in blob:
        if in_str:
            cur.append(ch)
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == "'": in_str = False
            continue
        if ch == "'": in_str = True; cur.append(ch)
        elif ch == "(":
            depth += 1
            if depth == 1: cur = []
            else: cur.append(ch)
        elif ch == ")":
            depth -= 1
            if depth == 0: yield "".join(cur)
            else: cur.append(ch)
        elif depth >= 1:
            cur.append(ch)

def _tokenize_values(tup: str):
    """Split one row's comma-separated values; unquote/unescape strings, NULL->None."""
    out, cur, in_str, esc = [], [], False, False
    for ch in tup:
        if in_str:
            if esc:
                cur.append({"n":"\n","t":"\t","r":"\r","0":"\0"}.get(ch, ch)); esc = False
            elif ch == "\\": esc = True
            elif ch == "'": in_str = False
            else: cur.append(ch)
        elif ch == "'": in_str = True
        elif ch == ",":
            out.append("".join(cur)); cur = []
        else:
            cur.append(ch)
    out.append("".join(cur))
    return [None if v.strip() == "NULL" else v.strip().strip("'") if v.strip() != "" else "" for v in out]

# ======================================================================================
# ACF reconstruction (relational -> nested)
# ======================================================================================
def reconstruct_acf(meta: dict) -> dict:
    """Rebuild ACF fields from flattened postmeta.
    - keys starting with '_' are ACF field-key pointers -> used only to detect ACF-owned keys.
    - repeaters/flexible: `key`=<int N> with `key_<i>_<sub>` children -> list[dict] (recursive).
    - everything else is kept as a top-level field (de-serialized)."""
    acf_keys = {k[1:] for k in meta if k.startswith("_") and k[1:] in meta}
    flat = {k: maybe_unserialize(v) for k, v in meta.items() if not k.startswith("_")}
    # Detect repeater/flexible parents by their indexed children (`base_<i>_<sub>`), so the
    # count key and every row sub-field are retained even if a `_pointer` is missing.
    child_pat = re.compile(r"^(.*?)_(\d+)_(.+)$")  # non-greedy: attach to shallowest repeater parent
    bases = {m.group(1) for k in flat for m in [child_pat.match(k)] if m}
    # When ACF field-key pointers exist, restrict to ACF-owned keys (+ repeater parents/rows);
    # otherwise keep all non-underscore meta so nothing is silently dropped.
    if acf_keys:
        def owned(k: str) -> bool:
            if k in acf_keys or k in bases:
                return True
            m = child_pat.match(k)
            return bool(m and m.group(1) in bases)
        flat = {k: v for k, v in flat.items() if owned(k)}
    return _nest(flat)

def _nest(flat: dict) -> dict:
    keys = set(flat)
    # Pass 1: claim every repeater/flexible child key (base_<i>_<sub>) up front, regardless of
    # dict order, so flattened sub-fields never leak alongside the rebuilt list.
    child_re = re.compile(r"^(.*?)_(\d+)_(.+)$")  # non-greedy: attach to shallowest repeater parent
    repeaters: dict = {}
    consumed = set()
    for k in keys:
        m = child_re.match(k)
        if m and m.group(1) in keys:            # only group when the parent count key exists
            base, idx, sub = m.group(1), int(m.group(2)), m.group(3)
            repeaters.setdefault(base, {}).setdefault(idx, {})[sub] = flat[k]
            consumed.add(k)
    # Pass 2: emit scalars/groups first, then the rebuilt repeaters (recursively nested).
    out = {}
    for k, v in flat.items():
        if k in consumed or k in repeaters:
            continue
        out[k] = v
    for base, rows in repeaters.items():
        out[base] = [_nest(rows[i]) for i in sorted(rows)]
    return out

# ======================================================================================
# affiliate guardrails
# ======================================================================================
def harvest_affiliates(node):
    """Collapse ACF link fields to plain URLs, collecting every EXTERNAL link.
    Returns (clean_node, [ {label,url,target} ... ])."""
    found: list[dict] = []
    def walk(n, key=""):
        if isinstance(n, dict):
            if "url" in n and set(map(str, n.keys())) <= {"title", "url", "target"}:
                url = (n.get("url") or "").strip()
                if is_external(url):
                    found.append({"label": (n.get("title") or "").strip(),
                                  "url": url, "target": n.get("target") or "_blank"})
                return url
            return {k: walk(v, str(k)) for k, v in n.items()}
        if isinstance(n, list):
            return [walk(x, key) for x in n]
        if isinstance(n, str) and is_external(n) and any(h in key for h in C.AFFILIATE_KEY_HINTS):
            found.append({"label": "", "url": n.strip(), "target": "_blank"})
        return n
    clean = walk(node)
    # de-dup, keep order
    seen, uniq = set(), []
    for a in found:
        if a["url"] not in seen:
            seen.add(a["url"]); uniq.append(a)
    return clean, uniq

# ======================================================================================
# HTML body -> MDX
# ======================================================================================
YT_RE = re.compile(r"(?:youtube\.com/(?:embed/|watch\?v=)|youtu\.be/)([\w\-]{6,})")

def _escape_mdx_braces(md_text: str) -> str:
    """Escape stray { } so MDX/acorn never parses inline CSS/JS/JSON-LD in the body as a JSX
    expression. Fenced ``` blocks and inline `code` spans are left untouched."""
    if not md_text or ("{" not in md_text and "}" not in md_text):
        return md_text
    parts = re.split(r"(```.*?```|`[^`\n]*`)", md_text, flags=re.S)
    for i in range(0, len(parts), 2):           # even indices = non-code segments
        parts[i] = parts[i].replace("{", "&#123;").replace("}", "&#125;")
    return "".join(parts)


def html_to_mdx(html: str, media_urls: set[str]):
    """Convert post_content HTML to MDX body. Extracts YouTube embeds, localises upload
    URLs, strips Gutenberg comments. Returns (mdx_body, [youtube_ids])."""
    if not html:
        return "", []
    html = re.sub(r"<!--\s*/?wp:.*?-->", "", html, flags=re.S)   # drop block comments
    soup = BeautifulSoup(html, "html.parser")
    yt: list[str] = []
    for ifr in soup.find_all("iframe"):
        m = YT_RE.search(ifr.get("src", ""))
        if m:
            yt.append(m.group(1))
            ifr.replace_with(f"\n<YouTube id=\"{m.group(1)}\" />\n")
    # localise media references (old uploads -> /uploads/...)
    for tag, attr in (("img", "src"), ("a", "href"), ("source", "src")):
        for el in soup.find_all(tag):
            v = el.get(attr)
            if v and "/wp-content/uploads/" in v:
                local = "/uploads/" + v.split("/wp-content/uploads/", 1)[1]
                media_urls.add(v); el[attr] = local
    # Neutralize raw HTML so MDX/acorn cannot choke on it: drop dangerous/non-content tags
    # outright, unwrap non-semantic wrappers, and strip EVERY attribute except links/images
    # (this kills leftover style="..."/class="..." that crash the JSX/acorn parser).
    for bad in soup.find_all(["script", "style", "noscript", "iframe", "svg", "form", "input",
                              "button", "select", "textarea", "link", "meta", "object", "embed"]):
        bad.decompose()
    for wrap in soup.find_all(["span", "div", "font", "section", "article", "aside", "header",
                               "footer", "figure", "figcaption", "center", "small", "u", "ins",
                               "abbr", "time", "label", "main", "nav"]):
        wrap.unwrap()
    _keep = {"a": {"href"}, "img": {"src", "alt", "title"}}
    for el in soup.find_all(True):
        el.attrs = {k: v for k, v in el.attrs.items() if k in _keep.get(el.name, set())}
    body = md(str(soup), heading_style="ATX", strip=["script", "style"])
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return _escape_mdx_braces(body), yt

# ======================================================================================
# routing + parity
# ======================================================================================
def route_for(post, template: str | None):
    pt = post["post_type"]
    if template and template in C.PAGE_TEMPLATE_OVERRIDES:
        o = C.PAGE_TEMPLATE_OVERRIDES[template]
        slug = o.get("filename", slugify(post["post_name"] or post["post_title"]))
        return o["content_subdir"], o["route"].format(slug=slug), slug
    spec = C.POST_TYPE_ROUTES.get(pt, dict(content_subdir="pages", route="/{slug}"))
    slug = slugify(post["post_name"] or post["post_title"])
    return spec["content_subdir"], spec["route"].format(slug=slug), slug

def old_pathname(post) -> str:
    guid = (post.get("guid") or "").strip()
    if guid and "?p=" not in guid and "/?" not in guid:
        path = urlparse(guid).path
        if path and path != "/":
            return path if path.endswith("/") else path + "/"
    return f"/{post['post_name']}/"

# ======================================================================================
# main
# ======================================================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["mysql", "sqldump"], default="mysql")
    ap.add_argument("--types", default="businesstool,page,post")
    ap.add_argument("--copy-media", action="store_true", help="copy referenced uploads into public/uploads")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--audit", action="store_true",
                    help="write a permalink dump + slug-collision report to _reports/ before the 301 map")
    ap.add_argument("--audit-only", action="store_true",
                    help="run the audit and STOP before writing any MDX / url-map (review collisions first)")
    args = ap.parse_args()
    if args.audit_only:
        args.audit = True

    C.assert_isolated()
    for d in (C.CONTENT_DIR, C.REDIRECTS_DIR, C.REPORT_DIR):
        d.mkdir(parents=True, exist_ok=True)

    src = WpSource(args.source)
    attach = src.attachments_map()
    attached = src.attached_files()   # attachment ID -> real /uploads relative path
    types = [t.strip() for t in args.types.split(",") if t.strip()]
    posts = src.posts(types)
    if args.limit:
        posts = posts[: args.limit]
    log(f"Migrating {len(posts)} posts from {args.source} …")

    # ---- PRE-PASS: compute routes, cache meta, detect & safely resolve slug collisions ----
    plan, meta_cache, used_files, src_seen, collision_rows = [], {}, {}, {}, []
    for post in posts:
        meta = src.meta(post["ID"]); meta_cache[post["ID"]] = meta
        template = meta.get("_wp_page_template") or None
        subdir, route, slug = route_for(post, template)
        original_slug = slug
        key = (subdir, slug)
        used_files[key] = used_files.get(key, 0) + 1
        collided = used_files[key] > 1
        if collided:  # two posts -> same content file: suffix the slug so nothing is overwritten
            slug = f"{original_slug}-{used_files[key]}"
            route = route[: -len(original_slug)] + slug if route.endswith(original_slug) else route
            collision_rows.append({"kind": "content-file", "id": post["ID"], "type": post["post_type"],
                                   "title": post.get("post_title", ""), "a": original_slug, "b": slug, "route": route})
        old = old_pathname(post)
        if old in src_seen:  # two legacy permalinks collapse to one source path
            collision_rows.append({"kind": "source-dup", "id": post["ID"], "type": post["post_type"],
                                   "title": post.get("post_title", ""), "a": old, "b": route, "route": src_seen[old]})
        src_seen[old] = route
        plan.append({"post": post, "meta": meta, "template": template, "subdir": subdir,
                     "slug": slug, "route": route, "old": old, "collided": collided})

    # ---- AUDIT: dump every permalink + flag collisions BEFORE committing the 301 map ----
    if args.audit:
        write_audit(plan, collision_rows)
        log(f"🔎 audit: {len(plan)} permalinks → scripts/_reports/audit-permalinks.csv")
        if collision_rows:
            log(f"⚠ audit: {len(collision_rows)} slug collision(s) flagged & auto-resolved "
                f"→ scripts/_reports/audit-collisions.csv (review before deploy)")
        else:
            log("✔ audit: no slug collisions detected")
        if args.audit_only:
            log("audit-only: stopping before writing MDX / url-map. Re-run without --audit-only to proceed.")
            return

    # ---- MAIN PASS: write MDX + build the parity map (uses collision-resolved slugs) ----
    parity, media_urls, written = [], set(), 0
    for item in plan:
        post, meta, template = item["post"], item["meta"], item["template"]
        subdir, route, slug = item["subdir"], item["route"], item["slug"]

        acf = reconstruct_acf(meta)
        acf, affiliates = harvest_affiliates(acf)

        # protect affiliate URLs from rebranding
        protected = [a["url"] for a in affiliates]
        acf = rebrand_tree(acf, protected)
        acf = resolve_acf_images(acf, attached, media_urls)
        affiliates = [{**a, "label": apply_rebrand(a["label"], protected)} for a in affiliates]

        body, yt = html_to_mdx(post.get("post_content") or "", media_urls)
        body = apply_rebrand(body, protected)

        # Resolve featured image to its REAL file via _wp_attached_file (the attachment
        # guid is often a dead permalink). Fall back to a guid uploads URL if present.
        tid = str(meta.get("_thumbnail_id") or "")
        thumb = None
        if tid:
            rel = (attached.get(tid) or "").lstrip("/")
            if rel:
                thumb = "/uploads/" + rel
                media_urls.add("/wp-content/uploads/" + rel)
            else:
                g = attach.get(tid) or ""
                if "/wp-content/uploads/" in g:
                    media_urls.add(g)
                    thumb = "/uploads/" + g.split("/wp-content/uploads/", 1)[1]
                else:
                    thumb = g or None

        terms = [t for t in src.terms_for(post["ID"]) if t.get("taxonomy") != "post_format"]

        fm = {
            "title": apply_rebrand(post["post_title"], protected),
            "slug": slug,
            "type": post["post_type"],
            "template": template,
            "route": route,
            "original_url": C.OLD_DOMAIN + item["old"],
            "date": str(post.get("post_date") or ""),
            "modified": str(post.get("post_modified") or ""),
            "seo": {
                "title": apply_rebrand(meta.get("_yoast_wpseo_title") or post["post_title"], protected),
                "description": apply_rebrand(meta.get("_yoast_wpseo_metadesc") or "", protected),
                "canonical": C.NEW_DOMAIN + route,
            },
            "featured_image": apply_rebrand(thumb, protected),
            "youtube_url": (f"https://www.youtube.com/watch?v={yt[0]}" if yt else None),
            "affiliate_url": (affiliates[0]["url"] if affiliates else None),
            "affiliate_links": affiliates,
            "categories": [{"name": apply_rebrand(t["name"], protected), "slug": t["slug"]} for t in terms],
            "acf": acf,
        }
        fm = {k: v for k, v in fm.items() if v not in (None, "", [], {})}

        out_path = C.CONTENT_DIR / subdir / f"{slug}.mdx"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        front = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True, width=100).strip()
        out_path.write_text(f"---\n{front}\n---\n\n{body}\n", encoding="utf-8")
        written += 1

        parity.append({"source": item["old"], "destination": route, "permanent": True,
                       "type": post["post_type"]})

    # URL parity map (Next.js redirects()/vercel.json compatible)
    (C.REDIRECTS_DIR / "url-map.json").write_text(
        json.dumps(parity, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"✔ {written} .mdx written → content/")
    log(f"✔ url-map.json → redirects/ ({len(parity)} routes)")

    if args.copy_media:
        copied = copy_media(media_urls)
        log(f"✔ {copied} media files → public/uploads/")
    else:
        log(f"ℹ {len(media_urls)} media refs found (run with --copy-media to copy them)")

    # rebrand verification: fail loudly if any legacy token survived in output
    leaks = scan_for_leaks(C.CONTENT_DIR)
    if leaks:
        log(f"✘ REBRAND LEAK: {len(leaks)} file(s) still contain legacy tokens (see _reports/leaks.txt)")
        (C.REPORT_DIR / "leaks.txt").write_text("\n".join(leaks), encoding="utf-8")
    else:
        log("✔ rebrand verification passed (no legacy tokens in content/)")


# ======================================================================================
# audit reporting + post-processing helpers
# ======================================================================================
def write_audit(plan, collision_rows):
    """Dump every legacy permalink and any (auto-resolved) slug collisions to CSV for review."""
    C.REPORT_DIR.mkdir(parents=True, exist_ok=True)
    with (C.REPORT_DIR / "audit-permalinks.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "type", "title", "legacy_permalink", "new_route", "content_file", "collision_resolved"])
        for it in plan:
            p = it["post"]
            w.writerow([p["ID"], p["post_type"], p.get("post_title", ""),
                        C.OLD_DOMAIN + it["old"], it["route"],
                        f"content/{it['subdir']}/{it['slug']}.mdx", "yes" if it["collided"] else ""])
    with (C.REPORT_DIR / "audit-collisions.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["kind", "id", "type", "title", "original", "resolved", "route"])
        for r in collision_rows:
            w.writerow([r["kind"], r["id"], r["type"], r["title"], r["a"], r["b"], r["route"]])


def rebrand_tree(node, protected):
    if isinstance(node, dict):
        return {k: rebrand_tree(v, protected) for k, v in node.items()}
    if isinstance(node, list):
        return [rebrand_tree(v, protected) for v in node]
    return apply_rebrand(node, protected)


# ACF image fields hold attachment IDs; resolve them (recursively, incl. repeater rows and
# scalar galleries) to real /uploads paths via _wp_attached_file so the headless frontend can
# render them. Gated on an image-ish field NAME so numeric non-images (year, rating, counts)
# are never touched, and only when the ID actually maps to a file.
_IMG_KEY_RE = re.compile(r"image|img|logo|icon|photo|thumbnail|thumb|avatar|banner|gallery|background|featured", re.I)

def resolve_acf_images(node, attached, media_urls, key=""):
    if isinstance(node, dict):
        return {k: resolve_acf_images(v, attached, media_urls, k) for k, v in node.items()}
    if isinstance(node, list):
        return [resolve_acf_images(v, attached, media_urls, key) for v in node]
    if isinstance(node, str) and node.isdigit() and _IMG_KEY_RE.search(key):
        rel = (attached.get(node) or "").lstrip("/")
        if rel:
            media_urls.add("/wp-content/uploads/" + rel)
            return "/uploads/" + rel
    return node


def copy_media(media_urls):
    n = 0
    for url in media_urls:
        if "/wp-content/uploads/" not in url:
            continue
        rel = url.split("/wp-content/uploads/", 1)[1]
        src = C.LEGACY_UPLOADS / rel
        dst = C.MEDIA_OUT / rel
        if src.is_file():
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.exists():
                shutil.copy2(src, dst); n += 1
    return n


def scan_for_leaks(root):
    # Catch every legacy form: spaced/concat brand, the IOB acronym, and iob_/iob-/--iob-
    # (including markdownify's backslash-escaped iob\_). Only the preserved legacy permalink
    # line (original_url:) may keep the old domain by design.
    pat = re.compile(r"ideal[\s\-]?online[\s\-]?business|idealonlinebusiness|\bIOB\b|\biob\\?[_-]|--iob-", re.I)
    bad = []
    for p in root.rglob("*.mdx"):
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            if pat.search(line) and not line.lstrip().startswith("original_url:"):
                bad.append(f"{p}: {line.strip()[:120]}")
                break
    return bad


if __name__ == "__main__":
    main()
