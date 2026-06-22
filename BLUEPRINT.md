# TheBusinessTrades — Phase 2 Blueprint (Data Extraction & Content Modeling)

This is the working reference for migrating **IdealOnlineBusiness (WordPress + ACF)** into
**TheBusinessTrades (Next.js App Router + TypeScript + Tailwind + local MDX)**. The WordPress
backend is being **retired**: after extraction, nothing here talks to WordPress at runtime.

---

## 0. Isolation contract (read this first)

```
IOB-GIT/
├── Idealonlinebusiness/            # legacy theme (Phase 1) — untouched
├── IOB-Migration-Assessment.docx   # Phase 1 deliverable
├── legacy-wp-data/                 # ⛔ READ-ONLY SOURCE — git-ignored, never edited
│   ├── archive/idealonlinebusiness.wpress
│   └── wpress-extract/             # produced by scripts/unwpress.py
│       ├── database.sql
│       └── wp-content/uploads/…
└── thebusinesstrades-nextjs/       # ✅ NEW PROJECT — the only place we write
    ├── app/                        # App Router routes
    ├── components/                 # React UI
    ├── content/                    # GENERATED .mdx  (write target)
    ├── lib/                        # types + content loader
    ├── public/uploads/             # GENERATED media (copied from legacy uploads)
    ├── redirects/url-map.json       # GENERATED URL parity map
    └── scripts/                    # migrate.py, unwpress.py, config.py
```

Guarantees enforced in code:

- `scripts/config.py :: assert_isolated()` refuses to run if a write target resolves
  outside `thebusinesstrades-nextjs/`, or if the project root sits inside `legacy-wp-data/`.
- `legacy-wp-data/.gitignore` ignores the entire tree (it is 6 GB and contains a DB dump).
- The migration only ever **reads** from `LEGACY_ROOT` and **writes** to `content/`,
  `public/uploads/`, `redirects/`.

---

## 1. One-time setup

```bash
cd thebusinesstrades-nextjs
cp .env.example .env.local            # fill DB creds + NEXT_PUBLIC_* (new GA4 id!)
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r scripts/requirements.txt
npm install
```

## 2. Extraction & transform run order

```bash
# (a) unpack the 6 GB archive into the read-only extract dir
python scripts/unwpress.py ../legacy-wp-data/archive/idealonlinebusiness.wpress \
                           ../legacy-wp-data/wpress-extract

# (b) make the DB queryable (Option A — recommended)
mysql -u root -e "CREATE DATABASE tbt_legacy CHARACTER SET utf8mb4;"
mysql -u root tbt_legacy < ../legacy-wp-data/wpress-extract/database.sql

# (c) transform -> MDX + url-map.json (+ copy media)
python scripts/migrate.py --source mysql --copy-media --types businesstool,page,post

#     …or with no MySQL installed, parse the dump directly:
python scripts/migrate.py --source sqldump --copy-media

# (d) build the static site
npm run dev          # localhost:3000
npm run build        # static generation for Vercel
```

The transformer prints a summary and runs a **rebrand-leak self-check**; if any legacy token
survives in `content/`, it writes `scripts/_reports/leaks.txt` and warns.

---

## 3. What `migrate.py` does (per post)

1. **Reconstruct ACF** — flattens `wp_postmeta` back into nested objects. Repeaters/flexible
   content (`key=<N>` + `key_<i>_<sub>`) become `list[dict]` (recursively); ACF link/image
   blobs are PHP-unserialized. ~287 ACF calls across 14 templates collapse into structured data.
2. **Harvest affiliates** — every external link field is collected into `affiliate_links[]`
   and the primary into `affiliate_url`. Affiliate URLs are **masked before rebranding** so
   partner links are preserved byte-for-byte (revenue guardrail).
3. **Rebrand-in-transit** — ordered, case-preserving regex map (see `config.REBRAND_RULES`):
   `Ideal Online Business → TheBusinessTrades`, `idealonlinebusiness.com → thebusinesstrades.com`,
   `@idealonlinebusiness → @thebusinesstrades`, `--iob-/iob_/iob- → --tbt-/tbt_/tbt-`, `IOB → TheBusinessTrades`.
4. **HTML → MDX body** — strips Gutenberg comments, converts `<iframe>` YouTube to `<YouTube id>`,
   localizes `/wp-content/uploads/…` to `/uploads/…`, then markdownifies.
5. **Frontmatter + write** — emits `content/<subdir>/<slug>.mdx` (YAML + body).
6. **URL parity** — appends `{source, destination, permanent}` to `redirects/url-map.json`,
   flagging collisions. `next.config.mjs` turns this into 301s.

### Route map (`config.py`)
| WP source | Next.js route | content/ |
|-----------|---------------|----------|
| `businesstool` (CPT) | `/tools/{slug}` | `content/tools/` |
| `bt_categories` (tax) | `/category/{slug}` | `content/categories/` |
| `our_category` (tax) | `/collections/{slug}` | `content/collections/` |
| `page` | `/{slug}` | `content/pages/` |
| `post` | `/blog/{slug}` | `content/blog/` |
| `front.php` template | `/` | `content/home/home.mdx` |
| Deel landing / thank-you | `/go/deel`, `/go/deel/thank-you` | `content/landing/` |

---

## 4. Content schema

TypeScript models live in `lib/types/interfaces.ts`:
`BaseFrontmatter<TAcf>` (common), `HomeAcf` (front.php), `BusinessToolAcf`
(single-businesstool.php), `ToolCategory` (taxonomy), plus `AffiliateLink`, `SeoMeta`,
`RedirectRule`. Legacy field-name typos (`review_titie`, `sectoin_6_button`) are kept verbatim
for a lossless migration; normalize later in a mapper if desired.

`lib/content.ts` is the build-time loader (gray-matter) used by Server Components and
`generateStaticParams`. `lib/mdx-components.tsx` maps `<YouTube>` and `<AffiliateButton>` and
styles links/images.

---

## 5. App Router

```
app/
├── layout.tsx              # shell, metadata, GA4 (new property), header/footer
├── globals.css             # Tailwind + --tbt-* tokens
├── page.tsx                # home (content/home/home.mdx)
├── [slug]/page.tsx         # static pages (About, Contact, Legal…)
├── tools/
│   ├── page.tsx            # index of all reviews
│   └── [slug]/page.tsx     # single review (SSG via generateStaticParams)
└── category/
    └── [slug]/page.tsx     # taxonomy archive (lists tools by category slug)
```

Every dynamic route pre-renders with `generateStaticParams()` and sets canonical/OG via
`generateMetadata()` — full SSG, deployable statically to Vercel from GitHub.

---

## 6. Design system (White + Sky Blue)

`tailwind.config.js` defines a `brand` Sky-Blue ramp (primary `brand-500 #0ea5e9`) on pure-white
`surface` with cool-slate ink. Helpers in `globals.css`: `.btn-primary`, `.btn-ghost`, `.card`,
`.container-tbt`. Typography via `@tailwindcss/typography`. Deliberately low-motion and clean for
a trustworthy SaaS-review feel.

---

## 7. Deploy

Push `thebusinesstrades-nextjs/` to GitHub → import to Vercel. `redirects()` in `next.config.mjs`
serves the 301 parity map at the edge. For a pure static host (`output: 'export'`), export the
parity map to `vercel.json` / `_redirects` instead, since `redirects()` is ignored in that mode.

> **Affiliate compliance:** the legacy theme emitted bare `<a>` tags. `<AffiliateButton>` now adds
> `rel="sponsored nofollow noopener"` + `target="_blank"` on every outbound offer (FTC / Google).
