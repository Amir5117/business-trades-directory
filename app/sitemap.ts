import type { MetadataRoute } from "next";
import {
  getAllTools,
  getAllPosts,
  pageSlugs,
  getPage,
  categorySlugs,
} from "@/lib/content";

// Production domain comes from env so the same build is correct on any host.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://thebusinesstrades.com").replace(/\/$/, "");

/** First parseable date from the candidates, else now — keeps lastModified always valid. */
function toDate(...vals: (string | undefined)[]): Date {
  for (const v of vals) {
    if (v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/blogs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/business-tools`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about-us`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact-us`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  // All tool review pages (900+)
  for (const t of getAllTools()) {
    const fm = t.frontmatter as { modified?: string; date?: string };
    entries.push({
      url: `${SITE_URL}/tools/${t.slug}`,
      lastModified: toDate(fm.modified, fm.date),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Blog posts
  for (const p of getAllPosts()) {
    const fm = p.frontmatter as { modified?: string; date?: string };
    entries.push({
      url: `${SITE_URL}/blogs/${p.slug}`,
      lastModified: toDate(fm.modified, fm.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Category hubs
  for (const slug of categorySlugs()) {
    entries.push({
      url: `${SITE_URL}/category/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Static / legal pages (skip those that already have a dedicated route above)
  const dedicated = new Set(["business-tools", "blogs", "about-us", "contact-us"]);
  for (const slug of pageSlugs()) {
    if (dedicated.has(slug)) continue;
    let lastModified = now;
    try {
      const fm = getPage(slug).frontmatter as { modified?: string; date?: string };
      lastModified = toDate(fm.modified, fm.date);
    } catch {
      /* unreadable page — fall back to now */
    }
    entries.push({ url: `${SITE_URL}/${slug}`, lastModified, changeFrequency: "yearly", priority: 0.3 });
  }

  return entries;
}
