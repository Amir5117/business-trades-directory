/**
 * Centralized Affiliate Dictionary — the single source of truth for monetization.
 * =============================================================================
 * The /go/<slug> redirect (app/go/[slug]/route.ts) checks THIS file first, so you
 * never have to touch the 900+ .mdx files again to add or change an affiliate link.
 *
 * HOW TO USE (once you're approved for a program):
 *   1. Key  = the tool's slug exactly as in the URL /tools/<slug>
 *             (the .mdx filename without ".mdx" — usually "<brand>-review").
 *             The route is forgiving: it also matches the bare brand ("helium-10")
 *             and the "<brand>-review" variant, so either works.
 *   2. Value = your full approved affiliate URL, including your tracking/ref ID.
 *   3. Save. /go/<slug> now redirects there automatically.
 *
 * Anything NOT listed here falls back gracefully to the tool's review page,
 * so visitors never hit a dead link while you're still applying for programs.
 */
export const affiliateLinks: Record<string, string> = {
  // Add your approved affiliate links here in the future, e.g.:
  // "helium-10-review": "https://helium10.com/?aff=YOUR_ID",
  // "notion-review":    "https://affiliate.notion.so/your-ref-id",
  // "surfshark-review": "https://surfshark.com/deal?coupon=YOUR_ID",
};

/** Returns the approved affiliate URL for a slug (tries exact, bare, and -review forms), or undefined. */
export function getAffiliateLink(slug: string): string | undefined {
  return (
    affiliateLinks[slug] ??
    affiliateLinks[slug.replace(/-review$/, "")] ??
    affiliateLinks[`${slug}-review`]
  );
}
