import Link from "next/link";
import Image from "next/image";
import { RatingStars } from "./RatingStars";
import type { ToolCardRef } from "@/lib/types/interfaces";

export function ToolCard({ tool }: { tool: ToolCardRef }) {
  return (
    <Link href={tool.route} className="card group flex flex-col gap-3">
      {tool.logo ? (
        <Image
          src={tool.logo}
          alt={tool.title}
          width={120}
          height={48}
          className="h-12 w-auto object-contain"
        />
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-50 font-bold text-brand-600">
          {(tool.title ?? "?").charAt(0)}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{tool.title}</h3>
      {tool.rating ? <RatingStars value={tool.rating} /> : null}
      {tool.excerpt ? <p className="line-clamp-3 text-sm text-muted">{tool.excerpt}</p> : null}
      <span className="mt-auto text-sm font-semibold text-brand-600 transition-colors group-hover:text-brand-700">
        Read review →
      </span>
    </Link>
  );
}
