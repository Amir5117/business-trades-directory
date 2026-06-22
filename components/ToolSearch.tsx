"use client";

import { useMemo, useState } from "react";
import { ToolCard } from "@/components/ToolCard";
import type { ToolCardRef } from "@/lib/types/interfaces";

/** Client-side, real-time filter over the full tool directory (title / excerpt / slug). */
export function ToolSearch({
  tools,
  initialQuery = "",
}: {
  tools: ToolCardRef[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tools;
    return tools.filter((t) => {
      const hay = `${t.title ?? ""} ${t.excerpt ?? ""} ${t.slug ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [q, tools]);

  const shown = filtered.slice(0, 300);

  return (
    <div>
      <div className="sticky top-16 z-10 -mx-4 mb-8 border-b border-line/60 bg-white/95 px-4 py-3 backdrop-blur">
        <input
          id="tool-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 900+ tools by name…"
          aria-label="Search tools"
          autoComplete="off"
          autoFocus
          className="field"
        />
        <p className="mt-2 text-sm text-muted">
          {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
          {q ? ` matching “${q}”` : ""}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="text-muted">No tools match “{q}”. Try a shorter or different term.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      )}

      {filtered.length > shown.length ? (
        <p className="mt-8 text-center text-sm text-muted">
          Showing the first {shown.length} of {filtered.length}. Refine your search to narrow it down.
        </p>
      ) : null}
    </div>
  );
}
