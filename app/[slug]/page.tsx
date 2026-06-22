import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageSlugs, getPage } from "@/lib/content";
import { MDXContent } from "@/components/MDXContent";
import { RichHtml } from "@/components/RichHtml";

type Params = { params: { slug: string } };

// Slugs that have their own dedicated route — exclude from this catch-all to avoid clashes.
const RESERVED = new Set(["business-tools", "blogs", "about-us", "contact-us"]);

export function generateStaticParams() {
  return pageSlugs().filter((s) => !RESERVED.has(s)).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  try {
    const { frontmatter } = getPage(params.slug);
    return {
      title: frontmatter.seo?.title ?? frontmatter.title,
      description: frontmatter.seo?.description,
      alternates: { canonical: `/${params.slug}` },
    };
  } catch {
    return {};
  }
}

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);
const looksLikeAsset = (s: string) =>
  /^(\/|https?:)/i.test(s) || /\.(png|jpe?g|webp|gif|svg)$/i.test(s);

/**
 * Render an ACF payload (object of HTML strings / plain text / nested arrays) as page body.
 * HTML strings go through <RichHtml/>; plain text becomes a paragraph; assets/urls are skipped.
 */
function AcfContent({ acf }: { acf: Record<string, unknown> }) {
  const blocks: JSX.Element[] = [];
  const pushVal = (key: string, v: unknown) => {
    if (typeof v === "string") {
      const s = v.trim();
      if (!s || looksLikeAsset(s)) return;
      if (isHtml(s)) {
        blocks.push(<RichHtml key={key} html={s} className="prose mt-6 max-w-none" />);
      } else {
        blocks.push(<p key={key} className="mt-4 text-body">{s}</p>);
      }
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          Object.entries(item as Record<string, unknown>).forEach(([k2, v2]) =>
            pushVal(`${key}-${i}-${k2}`, v2)
          );
        } else {
          pushVal(`${key}-${i}`, item);
        }
      });
    }
  };
  Object.entries(acf).forEach(([k, v]) => pushVal(k, v));
  return <>{blocks}</>;
}

export default function StaticPage({ params }: Params) {
  let doc;
  try {
    doc = getPage(params.slug);
  } catch {
    notFound();
  }
  const { frontmatter, body } = doc!;
  const acf = (frontmatter.acf ?? {}) as Record<string, unknown>;
  const hasBody = !!body?.trim();
  const hasAcf = Object.keys(acf).length > 0;

  const updated = (frontmatter as { modified?: string }).modified;
  const updatedLabel = updated
    ? new Date(updated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <article className="container-tbt py-12">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{frontmatter.title}</h1>
        {updatedLabel ? (
          <p className="mt-3 text-sm text-neutral-500">Last updated {updatedLabel}</p>
        ) : null}
      </header>
      {hasBody ? (
        <div className="mt-8 max-w-3xl border-t border-line pt-8">
          <MDXContent source={body} path={`content/pages/${params.slug}.mdx`} />
        </div>
      ) : null}
      {hasAcf ? <AcfContent acf={acf} /> : null}
      {!hasBody && !hasAcf ? (
        <p className="mt-8 text-muted">This page has no content yet.</p>
      ) : null}
    </article>
  );
}
