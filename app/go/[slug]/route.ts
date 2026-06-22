import { NextResponse } from "next/server";
import type { MdxDoc } from "@/lib/types/interfaces";
import { getTool } from "@/lib/content";
import { getAffiliateLink } from "@/lib/affiliates";

// Resolves per request (dictionary first, then .mdx fallback, then the review page).
// Node runtime required: we read .mdx from disk. Never run on the edge.
export const dynamic = "force-dynamic";

const SITE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thebusinesstrades.com").hostname.replace(/^www\./, "");
  } catch {
    return "thebusinesstrades.com";
  }
})();

/** Look up the tool by the given slug, then by `${slug}-review`. */
function findTool(slug: string): { slug: string; doc: MdxDoc<Record<string, unknown>> } | null {
  for (const s of [slug, `${slug}-review`]) {
    try {
      return { slug: s, doc: getTool(s) as unknown as MdxDoc<Record<string, unknown>> };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/** True for a usable, absolute, EXTERNAL http(s) destination (not our own host). */
function isUsableExternal(u: string): boolean {
  const s = u.trim();
  if (!s || s === "#") return false;
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    const host = new URL(s).hostname.replace(/^www\./, "");
    return !!host && host !== SITE_HOST && !host.endsWith(`.${SITE_HOST}`);
  } catch {
    return false;
  }
}

/** .mdx fallback: first usable external affiliate/website URL from frontmatter/ACF. */
function pickMdxUrl(frontmatter: Record<string, any>): string | null {
  const acf = (frontmatter.acf ?? {}) as Record<string, any>;
  const candidates = [
    frontmatter.affiliate_url,
    frontmatter.affiliate_link,
    frontmatter.website_url,
    frontmatter.url,
    acf.one_button_one_link,
    acf.instant_sign_up,
    acf.affiliate_link,
    acf.website_url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && isUsableExternal(c)) return c.trim();
  }
  return null;
}

export function GET(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;

  // 1) Centralized affiliate dictionary is the single source of truth — check it FIRST.
  const dictUrl = getAffiliateLink(slug);
  if (dictUrl && /^https?:\/\//i.test(dictUrl)) {
    return NextResponse.redirect(dictUrl, 302);
  }

  // 2) Fall back to a real external link stored on the .mdx (blank after the wipe; future-proof).
  const found = findTool(slug);
  if (found) {
    const mdxUrl = pickMdxUrl(found.doc.frontmatter as Record<string, any>);
    if (mdxUrl) return NextResponse.redirect(mdxUrl, 302);
    // 3) No link yet → send them to the review page (never a 404).
    return NextResponse.redirect(new URL(`/tools/${found.slug}`, request.url), 302);
  }

  // Unknown slug → graceful fallback to the tools index.
  return NextResponse.redirect(new URL("/tools", request.url), 302);
}
