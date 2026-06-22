"""
config.py — single source of truth for the migration.

Everything here is data, not logic: paths, the rebrand token map, the WordPress
post-type -> Next.js route map, and the affiliate-detection rules. migrate.py imports
these. Edit here, never hard-code in the transformer.
"""
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")  # fallback

# --------------------------------------------------------------------------------------
# PATHS  (read-only IN, isolated Next.js OUT)
# --------------------------------------------------------------------------------------
# scripts/ lives at thebusinesstrades-nextjs/scripts/, so project root is one up.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_ROOT  = Path(os.getenv("LEGACY_ROOT", "../legacy-wp-data/wpress-extract")).resolve()

# WRITE TARGETS — all inside the new project. The script must NEVER write outside these.
CONTENT_DIR   = PROJECT_ROOT / "content"          # generated .mdx
PUBLIC_DIR    = PROJECT_ROOT / "public"           # copied/optimized media
MEDIA_OUT     = PUBLIC_DIR / "uploads"
REDIRECTS_DIR = PROJECT_ROOT / "redirects"        # url-map.json
REPORT_DIR    = PROJECT_ROOT / "scripts" / "_reports"

LEGACY_UPLOADS = LEGACY_ROOT / "wp-content" / "uploads"
LEGACY_SQLDUMP = LEGACY_ROOT / "database.sql"

# Hard guardrail: refuse to run if a write target would escape the project.
def assert_isolated() -> None:
    for p in (CONTENT_DIR, PUBLIC_DIR, REDIRECTS_DIR, REPORT_DIR):
        assert PROJECT_ROOT in p.resolve().parents or p.resolve() == PROJECT_ROOT, \
            f"Refusing to write outside the Next.js project: {p}"
    assert "legacy-wp-data" not in str(PROJECT_ROOT), "Project root must be separate from legacy data."

# --------------------------------------------------------------------------------------
# DATABASE (Option A: read-only SELECTs against an imported dump)
# --------------------------------------------------------------------------------------
DB = dict(
    host=os.getenv("WP_DB_HOST", "127.0.0.1"),
    port=int(os.getenv("WP_DB_PORT", "3306")),
    name=os.getenv("WP_DB_NAME", "tbt_legacy"),
    user=os.getenv("WP_DB_USER", "root"),
    password=os.getenv("WP_DB_PASSWORD", ""),
)
TP = os.getenv("WP_TABLE_PREFIX", "wp_")   # table prefix

OLD_DOMAIN = os.getenv("LEGACY_OLD_DOMAIN", "https://idealonlinebusiness.com").rstrip("/")
NEW_DOMAIN = os.getenv("NEXT_PUBLIC_SITE_URL", "https://thebusinesstrades.com").rstrip("/")

# --------------------------------------------------------------------------------------
# REBRAND MAP  (ordered: most specific first; case-preserving for the brand word)
# --------------------------------------------------------------------------------------
# Tuples are (regex_pattern, replacement, flags, case_preserve).
# These run over CONTENT ONLY. Affiliate/external URLs are masked out first (see migrate.py).
import re
REBRAND_RULES = [
    # 1. spaced / hyphenated brand phrase -> proper brand
    (r"ideal[\s\-]+online[\s\-]+business", "TheBusinessTrades", re.I, False),
    # 2. email + domain BEFORE the bare word, so we don't double-replace
    (r"idealonlinebusiness\.com", "thebusinesstrades.com", re.I, False),
    (r"@idealonlinebusiness\b", "@thebusinesstrades", re.I, False),
    # 3. concatenated brand -> case-preserving (IdealOnlineBusiness->TheBusinessTrades, idealonlinebusiness->thebusinesstrades)
    (r"idealonlinebusiness", "TheBusinessTrades", re.I, True),
    # 4. code identifiers / css tokens
    (r"--iob-", "--tbt-", 0, False),
    (r"\biob(?=\\?[_-])", "tbt", 0, False),   # iob_  iob-  and markdownify-escaped iob\_  iob\-
    # 5. bare acronym used in prose (won't touch iob_ / iob- handled above)
    (r"\bIOB\b", "TheBusinessTrades", 0, False),
]

# Brand strings for display injection / verification
OLD_BRAND_DISPLAY = "Ideal Online Business"
NEW_BRAND_DISPLAY = "TheBusinessTrades"
NEW_BRAND_SLUG    = "thebusinesstrades"
NEW_SUPPORT_EMAIL = "info@thebusinesstrades.com"
NEW_TWITTER       = "@thebusinesstrades"

# --------------------------------------------------------------------------------------
# POST TYPE -> ROUTE MAP  (drives both .mdx folder + URL parity)
# --------------------------------------------------------------------------------------
# new_route is a Python format string fed `slug` (+ optional `parent`).
POST_TYPE_ROUTES = {
    "businesstool": dict(content_subdir="tools",      route="/tools/{slug}"),
    "page":         dict(content_subdir="pages",      route="/{slug}"),
    "post":         dict(content_subdir="blog",       route="/blog/{slug}"),
}
# Taxonomy term archives
TAXONOMY_ROUTES = {
    "bt_categories": dict(content_subdir="categories", route="/category/{slug}"),
    "our_category":  dict(content_subdir="collections", route="/collections/{slug}"),
}
# Page-template special cases (front.php is the static home; thank-you pages kept verbatim)
PAGE_TEMPLATE_OVERRIDES = {
    "front.php":               dict(content_subdir="home", route="/", filename="home"),
    "Thankyou-deel-page.php":  dict(content_subdir="landing", route="/go/deel/thank-you"),
    "deel-page-template.php":  dict(content_subdir="landing", route="/go/deel"),
}

# --------------------------------------------------------------------------------------
# AFFILIATE GUARDRAILS
# --------------------------------------------------------------------------------------
# Any ACF field whose KEY matches these is treated as a CTA/affiliate link container.
AFFILIATE_KEY_HINTS = (
    "button_link", "button_one_link", "cta", "affiliate", "offer",
    "section_4_button_link", "one_button_link", "one_button_one_link",
    "banner_button_link", "banner_button_one_link", "four_button_link",
    "header_button_link", "footer_button_link", "deal", "visit", "go_to",
)
# Hosts that are us (NOT affiliate) — links to these are internalised, never masked.
INTERNAL_HOSTS = ("idealonlinebusiness.com", "www.idealonlinebusiness.com",
                  "thebusinesstrades.com", "www.thebusinesstrades.com")
# rel applied to every outbound affiliate link in the new components.
AFFILIATE_REL = "sponsored nofollow noopener"
