import type { Metadata } from "next";
import { getAllTools, toolCard } from "@/lib/content";
import { ToolSearch } from "@/components/ToolSearch";

export const metadata: Metadata = {
  title: "All Business Tool Reviews",
  description: "Search and browse every business tool we have independently reviewed.",
  alternates: { canonical: "/tools" },
};

export default function ToolsIndex({ searchParams }: { searchParams: { q?: string } }) {
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const tools = getAllTools()
    .map(toolCard)
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  return (
    <section className="container-tbt py-12">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">All tool reviews</h1>
      <p className="mt-2 text-muted">{tools.length} tools reviewed and counting.</p>
      <div className="mt-8">
        {/* key=q remounts the client filter so a header search seeds a fresh initial query */}
        <ToolSearch key={q} tools={tools} initialQuery={q} />
      </div>
    </section>
  );
}
