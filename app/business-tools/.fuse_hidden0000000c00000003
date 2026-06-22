import type { Metadata } from "next";
import Link from "next/link";
import { getToolCategories } from "@/lib/content";

export const metadata: Metadata = {
  title: "Business Tools by Category",
  description: "Browse 900+ independently reviewed business tools, organised by category.",
  alternates: { canonical: "/business-tools" },
};

export default function BusinessTools() {
  const cats = getToolCategories();
  const total = cats.reduce((n, c) => n + c.count, 0);
  return (
    <section className="container-tbt py-12">
      <h1 className="text-3xl font-bold text-ink">Business tools by category</h1>
      <p className="mt-2 text-muted">
        {total}+ tools reviewed across {cats.length} categories. Pick a category to compare.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="card flex items-center justify-between gap-3"
          >
            <span className="font-semibold text-ink">{c.name}</span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              {c.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
