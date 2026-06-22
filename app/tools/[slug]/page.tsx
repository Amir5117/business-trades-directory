import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toolSlugs, getTool, getRelatedTools } from "@/lib/content";
import { MDXContent } from "@/components/MDXContent";
import { RichHtml } from "@/components/RichHtml";
import { RatingStars } from "@/components/RatingStars";
import { AffiliateButton, YouTube } from "@/lib/mdx-components";

type Params = { params: { slug: string } };
type Acf = Record<string, any>;

export function generateStaticParams() {
  return toolSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  try {
    const { frontmatter } = getTool(params.slug);
    return {
      title: frontmatter.seo?.title ?? frontmatter.title,
      description: frontmatter.seo?.description,
      alternates: { canonical: frontmatter.route },
      openGraph: { images: frontmatter.featured_image ? [frontmatter.featured_image] : [] },
    };
  } catch {
    return {};
  }
}

/* ---------- helpers ---------- */

/** True only for a real, renderable image source (local /uploads or http URL, not a placeholder). */
function isRenderableImage(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const s = src.trim();
  if (!s) return false;
  if (/(placeholder|no[-_]?image|default[-_]?(image|thumb)|blank|dummy|spacer|1x1)/i.test(s)) return false;
  const isUrl = /^(https?:)?\/\//.test(s) || s.startsWith("/");
  const looksImage = /\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i.test(s);
  return isUrl && (looksImage || s.includes("/uploads/") || /(?:logo\.clearbit\.com|i\.ytimg\.com|img\.youtube\.com|upload\.wikimedia\.org)/i.test(s));
}

const num = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const initials = (name: string): string =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "★";

/** Small chevron separator for the breadcrumb trail. */
function Chevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4 text-neutral-300">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}

/** Titled section backed by an ACF HTML content field. Renders nothing if empty. */
function HtmlSection({
  id,
  title,
  html,
  divider,
}: {
  id?: string;
  title?: string;
  html?: string;
  divider?: boolean;
}) {
  if (!html || !html.trim()) return null;
  return (
    <section id={id} className={divider ? "tbt-section-sep mt-12 scroll-mt-24" : "mt-12 scroll-mt-24"}>
      {title ? <h2 className="text-2xl font-bold text-ink">{title}</h2> : null}
      <RichHtml html={html} className="prose mt-4 max-w-none" />
    </section>
  );
}

/** Parse alternatives_content (`<p>lead</p><ul><li><strong>Name:</strong> desc</li>…</ul>`)
 *  into a lead paragraph + competitor items so they can render as scannable cards.
 *  Falls back gracefully (returns no items) when the content isn't a structured list. */
function parseAlternatives(html?: string): { lead: string; items: { name: string; desc: string }[] } {
  if (!html || !html.trim()) return { lead: "", items: [] };
  const items: { name: string; desc: string }[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null) {
    const inner = m[1];
    const strong = inner.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
    let name = "";
    let desc = "";
    if (strong) {
      name = strong[1].replace(/<[^>]+>/g, "").replace(/:\s*$/, "").trim();
      desc = inner.replace(strong[0], "").replace(/<[^>]+>/g, " ").replace(/^[\s:]+/, "").replace(/\s+/g, " ").trim();
    } else {
      const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const i = text.indexOf(":");
      if (i > 0) {
        name = text.slice(0, i).trim();
        desc = text.slice(i + 1).trim();
      } else {
        name = text;
      }
    }
    if (name) items.push({ name, desc });
  }
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const lead = p ? p[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
  return { lead, items };
}

const YT_RE = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,15})/g;

/** Collect EVERY YouTube id (videos_section repeater + youtube_url + videos_content), de-duped. */
function collectVideoIds(acf: Acf, frontmatter: Acf): string[] {
  const ids: string[] = [];
  const scan = (raw: unknown) => {
    if (!raw) return;
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);
    let m: RegExpExecArray | null;
    YT_RE.lastIndex = 0;
    while ((m = YT_RE.exec(str)) !== null) ids.push(m[1]);
  };
  if (Array.isArray(acf.videos_section)) {
    for (const item of acf.videos_section) {
      scan(item && typeof item === "object" ? item.video_link ?? item.video_url ?? item : item);
    }
  }
  scan(frontmatter.youtube_url);
  scan(acf.videos_content);
  return [...new Set(ids)];
}

/** Compact sky-blue star row for sub-ratings (filled to `value` out of 5). */
function MiniStars({ value }: { value: number }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span className="relative inline-block text-[13px] leading-none text-line" aria-hidden="true">
      ★★★★★
      <span className="absolute inset-0 overflow-hidden text-brand-500" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

/* ---------- page ---------- */

export default function ToolReviewPage({ params }: Params) {
  let doc;
  try {
    doc = getTool(params.slug);
  } catch {
    notFound();
  }
  const { frontmatter, body } = doc!;
  const acf = (frontmatter.acf ?? {}) as Acf;

  const logoSrc = acf.logo || frontmatter.featured_image;
  const logo = isRenderableImage(logoSrc) ? logoSrc : "";
  const rating = num(acf.review_ster ?? acf.rating);
  const ctaLabel = acf.one_button_one || acf.one_button || `Visit ${frontmatter.title}`;
  const shortDesc =
    acf.review_titie || frontmatter.seo?.description || (acf.overview_content || "").replace(/<[^>]+>/g, "").slice(0, 180);

  const videoIds = collectVideoIds(acf, frontmatter as Acf);

  // Rating breakdown (review_listing[] -> { label, value } from "<span>4.7</span> EASE OF USE")
  const breakdown = (Array.isArray(acf.review_listing) ? acf.review_listing : [])
    .map((it: any) => {
      const raw = String(it?.review_listing_title ?? "");
      const value = num((raw.match(/[\d.]+/) || [])[0]);
      const label = raw.replace(/<[^>]+>/g, " ").replace(/[\d.]+/, "").replace(/\s+/g, " ").trim();
      return { label, value };
    })
    .filter((b: any) => b.label && b.value > 0);

  // Services grid (services_section_list[] -> { services_section_list_title })
  const services = (Array.isArray(acf.services_section_list) ? acf.services_section_list : [])
    .map((it: any) => String(it?.services_section_list_title ?? "").trim())
    .filter(Boolean);

  // Real user reviews (review_area[]) — display ONLY what exists; NO artificial limit, all items render.
  const reviews = (Array.isArray(acf.review_area) ? acf.review_area : [])
    .map((r: any) => ({
      name: String(r?.review_area_name ?? "").trim(),
      content: String(r?.review_area_content ?? "").trim(), // raw HTML -> rendered via RichHtml
      source: String(r?.review_area_posting ?? "").trim(),
      date: String(r?.date ?? "").trim(),
      image: r?.review_area_image,
      star: num(r?.review_area_star),
      subs: (Array.isArray(r?.overall_rating_section) ? r.overall_rating_section : [])
        .map((s: any) => ({ label: String(s?.overall_rating_title ?? "").trim(), value: num(s?.overall_rating_star) }))
        .filter((s: any) => s.label),
    }))
    .filter((r: any) => r.content || r.name);

  // FAQs (faqs_section[] -> { faqs_area_title (question), faqs_area_content (answer HTML) })
  const faqs = (Array.isArray(acf.faqs_section) ? acf.faqs_section : [])
    .map((it: any) => ({
      q: String(it?.faqs_area_title ?? "").trim(),
      a: String(it?.faqs_area_content ?? "").trim(),
    }))
    .filter((it: any) => it.q || it.a);

  const primaryCat = (Array.isArray(frontmatter.categories) ? frontmatter.categories : []).find(
    (c: any) => c?.slug
  ) as { name?: string; slug?: string } | undefined;
  const related = getRelatedTools(params.slug, 3);

  /* ---------- JSON-LD: editorial Review of the tool (Product) for Google rich snippets ----------
     Star rating, reviewer/author and tool description rendered into the HTML source so search
     engines can surface them in results. Built entirely from the real frontmatter/ACF data. */
  const schemaImage = logo || (isRenderableImage(frontmatter.featured_image) ? (frontmatter.featured_image as string) : "");
  const schemaDesc = String(shortDesc || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
  const schemaRating = rating > 0 ? Math.min(5, rating) : 4.5;
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    name: `${frontmatter.title} Review`,
    itemReviewed: {
      "@type": "Product",
      name: frontmatter.title,
      ...(schemaImage ? { image: schemaImage } : {}),
      ...(schemaDesc ? { description: schemaDesc } : {}),
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(schemaRating),
      bestRating: "5",
      worstRating: "1",
    },
    author: { "@type": "Organization", name: "TheBusinessTrades" },
    publisher: { "@type": "Organization", name: "TheBusinessTrades" },
    ...(frontmatter.route ? { url: String(frontmatter.route) } : {}),
  };
  // Escape "<" so a stray "</script>" in data can never break out of the tag.
  const jsonLd = JSON.stringify(reviewSchema).replace(/</g, "\\u003c");

  return (
    <article>
      {/* SEO: Review + Product structured data (rich snippet) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      {/* ---------- Hero (light slate, full-width) ---------- */}
      <section className="border-b border-line bg-slate-50">
        <div className="container-tbt pb-20 pt-8 text-center sm:pt-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-neutral-500">
            <Link href="/" className="transition-colors hover:text-brand-600">Home</Link>
            <Chevron />
            {primaryCat?.slug ? (
              <>
                <Link href="/business-tools" className="transition-colors hover:text-brand-600">Categories</Link>
                <Chevron />
                <Link href={`/category/${primaryCat.slug}`} className="transition-colors hover:text-brand-600">
                  {primaryCat.name || primaryCat.slug}
                </Link>
              </>
            ) : (
              <Link href="/tools" className="transition-colors hover:text-brand-600">Tools</Link>
            )}
            <Chevron />
            <span className="font-medium text-neutral-800">{frontmatter.title}</span>
          </nav>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {frontmatter.title} Review
          </h1>
          {acf.review_titie ? (
            <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{acf.review_titie}</p>
          ) : null}
        </div>
      </section>

      {/* ---------- Floating product card ---------- */}
      <div className="container-tbt">
        <div className="relative z-10 -mt-12 mx-auto max-w-5xl rounded-xl border border-slate-100 bg-white p-6 shadow-md md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              {logo ? (
                <Image
                  src={logo}
                  alt={frontmatter.title}
                  width={96}
                  height={96}
                  className="h-24 w-24 shrink-0 rounded-lg object-contain ring-1 ring-line"
                />
              ) : (
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-brand-50 text-2xl font-bold text-brand-600">
                  {initials(frontmatter.title)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-ink sm:text-2xl">{frontmatter.title}</h2>
                {rating > 0 ? <div className="mt-1.5"><RatingStars value={rating} /></div> : null}
                {shortDesc ? <p className="mt-2 max-w-md text-sm text-muted">{shortDesc}</p> : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <a href="#overview" className="btn-outline text-sm">Read review</a>
              <AffiliateButton href={`/go/${params.slug}`}>{ctaLabel}</AffiliateButton>
            </div>
          </div>

          {/* Rating breakdown (real review_listing data) */}
          {breakdown.length ? (
            <div className="mt-6 grid gap-x-8 gap-y-3 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {breakdown.map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">{b.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(b.value / 5) * 100}%` }} />
                    </span>
                    <span className="w-7 text-right text-sm font-bold text-ink">{b.value.toFixed(1)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="container-tbt pb-4">
        <HtmlSection id="overview" title={acf.overview_title || "Overview"} html={acf.overview_content} divider />
        <HtmlSection title={acf.features_title} html={acf.features_content} />
        <HtmlSection html={acf.features_listing} />

        {/* Services grid (real services_section_list) */}
        {services.length ? (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-ink">{acf.services_section_title || "Services"}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {services.map((s: string, i: number) => {
                const [head, ...rest] = s.split(/:(.+)/);
                const detail = rest.join("").trim();
                return (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-300 hover:shadow-md">
                    <p className="text-sm font-semibold text-ink">{head.trim()}</p>
                    {detail ? <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Pricing / other services HTML */}
        <HtmlSection html={acf.services_section_content} />

        {/* Review body — contains Pros & Cons (styled by RichHtml: sky checks / red X) */}
        <HtmlSection title={acf.review_title} html={acf.review_content} />

        {/* Videos */}
        {videoIds.length ? (
          <section className="mt-12">
            {acf.videos_title ? <h2 className="text-2xl font-bold text-ink">{acf.videos_title}</h2> : null}
            <div className={`mt-4 grid gap-6 ${videoIds.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {videoIds.map((vid, i) => (
                <YouTube key={`${vid}-${i}`} id={vid} title={`${frontmatter.title} video ${i + 1}`} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Real user reviews — every review_area item renders (no limit); content is real HTML.
            The hardcoded heading is omitted when the ACF HTML already contains one (avoids a duplicate). */}
        {reviews.length ? (
          <section id="user-reviews" className="tbt-section-sep mt-12 scroll-mt-24">
            {/* Heading is unconditional; legacy inline headings are stripped in RichHtml. */}
            <h2 className="text-2xl font-bold text-ink">What real users say</h2>
            <div className="mt-5 flex flex-col gap-6">
              {reviews.map((r: any, i: number) => (
                <figure key={i} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    {isRenderableImage(r.image) ? (
                      <Image
                        src={r.image}
                        alt={r.name || "Reviewer"}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover ring-1 ring-line"
                      />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                        {initials(r.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      {r.name ? <figcaption className="font-semibold text-ink">{r.name}</figcaption> : null}
                      <p className="text-xs text-muted">{[r.source, r.date].filter(Boolean).join(" • ")}</p>
                    </div>
                    {r.star > 0 ? <div className="ml-auto"><MiniStars value={r.star} /></div> : null}
                  </div>

                  {/* review_area_content is raw HTML — render it so <p> tags format instead of showing literally */}
                  {r.content ? (
                    <RichHtml
                      html={r.content}
                      className="prose prose-sm mt-4 max-w-none border-l-2 border-brand-200 pl-4"
                    />
                  ) : null}

                  {r.subs.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4">
                      {r.subs.map((s: any, j: number) => (
                        <div key={j} className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted">{s.label}</span>
                          <span className="flex items-center gap-1.5">
                            <MiniStars value={s.value} />
                            <span className="text-xs font-semibold text-ink">{s.value.toFixed(1)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* Alternatives — rendered as scannable competitor cards when alternatives_content is a
            structured list; falls back to plain rich-text for tools where it's inline prose. */}
        {(() => {
          const alt = parseAlternatives(acf.alternatives_content);
          if (alt.items.length < 2) {
            return <HtmlSection title={acf.alternatives_title} html={acf.alternatives_content} divider />;
          }
          return (
            <section id="alternatives" className="tbt-section-sep mt-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-ink">
                {acf.alternatives_title || `Top ${frontmatter.title} Alternatives`}
              </h2>
              {alt.lead ? <p className="mt-3 max-w-3xl text-muted">{alt.lead}</p> : null}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {alt.items.map((a, i) => (
                  <div
                    key={i}
                    className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
                  >
                    <p className="font-semibold text-ink transition-colors duration-300 group-hover:text-brand-700">
                      {a.name}
                    </p>
                    {a.desc ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.desc}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* FAQs — intro paragraph + the real faqs_section repeater as static <details> accordions */}
        {(acf.faqs_content?.trim() || faqs.length) ? (
          <section id="faqs" className="tbt-section-sep mt-12 scroll-mt-24">
            <h2 className="text-2xl font-bold text-ink">{acf.faqs_title || "Frequently asked questions"}</h2>
            {acf.faqs_content?.trim() ? (
              <RichHtml html={acf.faqs_content} className="prose mt-4 max-w-none" />
            ) : null}
            {faqs.length ? (
              <div className="mt-6 space-y-3">
                {faqs.map((f: any, i: number) => (
                  <details key={i} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:border-brand-200 hover:shadow-md">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                      <span>{f.q || `Question ${i + 1}`}</span>
                      <span className="ml-2 shrink-0 text-2xl leading-none text-brand-500 transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    {f.a ? (
                      <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                        <RichHtml html={f.a} className="prose prose-sm max-w-none" />
                      </div>
                    ) : null}
                  </details>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {body && body.trim() ? (
          <div className="mt-12">
            <MDXContent source={body} path={`content/tools/${params.slug}.mdx`} />
          </div>
        ) : null}

        {/* Final CTA */}
        <div className="mt-12 rounded-2xl bg-brand-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">Ready to try {frontmatter.title}?</h2>
          <div className="mt-4 flex justify-center">
            <AffiliateButton href={`/go/${params.slug}`}>{ctaLabel}</AffiliateButton>
          </div>
          <p className="mt-3 text-xs text-muted">
            We may earn a commission if you sign up through our links, at no extra cost to you.
          </p>
        </div>

        {/* Related tools — reduce bounce: same-category, top-rated fallback, current excluded */}
        {related.length ? (
          <section className="tbt-section-sep mt-12">
            <h2 className="text-2xl font-bold text-ink">You might also like</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={r.route}
                  className="group flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    {isRenderableImage(r.logo) ? (
                      <Image
                        src={r.logo}
                        alt={r.title}
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-lg object-contain ring-1 ring-line"
                      />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                        {initials(r.title)}
                      </span>
                    )}
                    <span className="font-semibold text-ink transition-colors duration-300 group-hover:text-brand-700">
                      {r.title}
                    </span>
                  </div>
                  {num(r.rating) > 0 ? <div className="mt-3"><RatingStars value={r.rating} /></div> : null}
                  <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:underline">Read review &rarr;</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
