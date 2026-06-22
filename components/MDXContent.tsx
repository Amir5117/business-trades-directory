import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/lib/mdx-components";

/**
 * Server-rendered MDX (App Router RSC). Compilation is wrapped in try/catch so a single
 * malformed .mdx file logs its path to the server terminal and renders a graceful fallback
 * instead of crashing the whole route with a 500 (e.g. acorn "Could not parse expression").
 */
export async function MDXContent({ source, path }: { source: string; path?: string }) {
  if (!source?.trim()) return null;
  try {
    const { content } = await compileMDX({
      source,
      components: mdxComponents,
      options: { parseFrontmatter: false },
    });
    return <div className="prose max-w-none">{content}</div>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[MDX] compile FAILED -> ${path ?? "(unknown .mdx)"}\n      ${msg}\n`);
    return (
      <div className="prose max-w-none">
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          This section could not be rendered. See the server log for the file and reason.
        </p>
      </div>
    );
  }
}
