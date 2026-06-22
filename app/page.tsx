import Link from "next/link";
import type { Metadata } from "next";
import { getHome, getAllTools } from "@/lib/content";
import { MDXContent } from "@/components/MDXContent";
import { ToolCard } from "@/components/ToolCard";

export function generateMetadata(): Metadata {
  const { frontmatter } = getHome();
  return {
    title: frontmatter.seo?.title ?? frontmatter.title,
    description: frontmatter.seo?.description,
    alternates: { canonical: "/" },
  };
}

export default function HomePage() {
  const { frontmatter, body } = getHome();
  const acf = frontmatter.acf ?? {};
  const featured = getAllTools().slice(0, 6).map((t) => ({
    title: t.frontmatter.title,
    slug: t.slug,
    route: t.frontmatter.route,
    logo: t.frontmatter.acf?.logo ?? t.frontmatter.featured_image,
    rating: t.frontmatter.acf?.rating,
    excerpt: t.frontmatter.seo?.description,
    affiliate_url: t.frontmatter.affiliate_url,
  }));

  return (
    <>
      {/* Hero — driven by front.php banner_* ACF fields. Soft sky wash on white. */}
      <section className="border-b border-line bg-gradient-to-b from-brand-50 to-white">
        <div className="container-tbt py-20 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            Independent reviews
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {acf.banner_title ?? "Find the right tools to grow your business"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            {acf.banner_subtitle ?? "Independent, no-nonsense reviews of the software that runs modern businesses."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={acf.banner_button_link ?? "/tools"} className="btn-primary">
              {acf.banner_button ?? "Browse tools"}
            </Link>
            {acf.banner_button_one_link && (
              <Link href={acf.banner_button_one_link} className="btn-ghost">{acf.banner_button_one ?? "Learn more"}</Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured reviews */}
      <section className="container-tbt py-16">
        <h2 className="text-2xl font-bold text-ink">Featured reviews</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => <ToolCard key={t.slug} tool={t} />)}
        </div>
      </section>

      {/* Long-form homepage body from MDX */}
      {body?.trim() ? (
        <section className="container-tbt pb-20">
          <MDXContent source={body} path="content/home/home.mdx" />
        </section>
      ) : null}
    </>
  );
}
