import type { Metadata } from "next";
import { categorySlugs, getCategory } from "@/lib/content";
import { ToolCard } from "@/components/ToolCard";

type Params = { params: { slug: string } };

/** Pre-render every bt_categories archive (SSG). */
export function generateStaticParams() {
  return categorySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const cat = getCategory(params.slug);
  return {
    title: `${cat.name} — Reviews & Comparisons`,
    description: cat.description ?? `The best ${cat.name} tools, reviewed and compared.`,
    alternates: { canonical: cat.route },
  };
}

export default function CategoryPage({ params }: Params) {
  const cat = getCategory(params.slug);
  return (
    <section className="container-tbt py-12">
      <header className="border-b border-line pb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Category</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{cat.name}</h1>
        {cat.description ? <p className="mt-3 max-w-2xl text-muted">{cat.description}</p> : null}
        {cat.acf?.intro ? <p className="mt-3 max-w-2xl text-muted">{cat.acf.intro}</p> : null}
      </header>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cat.tools.length > 0 ? (
          cat.tools.map((t) => <ToolCard key={t.slug} tool={t} />)
        ) : (
          <p className="text-muted">No tools in this category yet.</p>
        )}
      </div>
    </section>
  );
}
