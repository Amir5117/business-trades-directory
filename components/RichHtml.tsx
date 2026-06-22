/**
 * RichHtml — render migrated ACF rich-text (raw WordPress HTML) safely.
 * HTML, not MDX, so it goes through dangerouslySetInnerHTML (no acorn). We strip
 * <style>/<script> (and optionally <iframe>), drop any legacy "What real users say"
 * heading (the real heading is rendered by the page above the review cards), rewrite
 * /wp-content/uploads/ URLs to /uploads/, and theme Pros/Cons + check lists.
 */
function sanitize(html: string, stripIframes = false): string {
  let s = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  // Global: remove inline "What real users say" headings (h2/h3/h4) so they never render
  // above the videos — the page hardcodes this heading directly above the review cards.
  s = s.replace(/<h([2-4])[^>]*>[^<]*what\s+real\s+users\s+say[^<]*<\/h\1>/gi, "");
  if (stripIframes) {
    s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "").replace(/<iframe[^>]*?\/?>/gi, "");
  }
  return s
    .replace(/https?:\/\/[^"')\s]+?\/wp-content\/uploads\//gi, "/uploads/")
    .replace(/\/wp-content\/uploads\//g, "/uploads/");
}

const CHECK_RE = /fa-(?:square-check|circle-check|check)\b|✅|✔|✓|☑/i;
const X_RE = /fa-(?:circle-xmark|square-xmark|xmark|times)\b|❌|✗|✕|✖|✘/i;

/** Theme Pros/Cons + check/X lists (sky checks / red X); strip original emoji + FA markers. */
function enhance(html: string): string {
  let s = html;
  s = s.replace(/(<h[2-4][^>]*>\s*pros\b[\s\S]*?<\/h[2-4]>\s*)<ul(\s|>)/gi, '$1<ul class="tbt-list tbt-pros"$2');
  s = s.replace(/(<h[2-4][^>]*>\s*cons\b[\s\S]*?<\/h[2-4]>\s*)<ul(\s|>)/gi, '$1<ul class="tbt-list tbt-cons"$2');
  s = s.replace(/<ul>([\s\S]*?)<\/ul>/gi, (m, inner) => {
    if (/class=/i.test(m.slice(0, m.indexOf(">")))) return m;
    const hasCheck = CHECK_RE.test(inner);
    const hasX = X_RE.test(inner);
    if (hasX && !hasCheck) return `<ul class="tbt-list tbt-cons">${inner}</ul>`;
    if (hasCheck) return `<ul class="tbt-list tbt-pros">${inner}</ul>`;
    return m;
  });
  s = s.replace(/<i[^>]*class="[^"]*fa-[^"]*"[^>]*>\s*<\/i>\s*/gi, "");
  s = s.replace(/(<li[^>]*>)(?:\s|&nbsp;)*[✅✔✓☑❌✗✕✖✘•·‣⁃️]+\s*/gi, "$1");
  return s;
}

export function RichHtml({
  html,
  className,
  stripIframes,
}: {
  html?: string;
  className?: string;
  stripIframes?: boolean;
}) {
  if (!html || !html.trim()) return null;
  return (
    <div
      className={className ?? "prose max-w-none"}
      dangerouslySetInnerHTML={{ __html: enhance(sanitize(html, stripIframes)) }}
    />
  );
}
