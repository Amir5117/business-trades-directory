/**
 * mdx-components.tsx — component map passed to <MDXRemote/>/compileMDX.
 * <YouTube/> (re-exported from components/YouTube) and <AffiliateButton/> are emitted by
 * migrate.py; plain links/images are styled and pointed at the local /uploads tree.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode, AnchorHTMLAttributes } from "react";
import { YouTube } from "@/components/YouTube";

export { YouTube };

export function AffiliateButton({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      className="not-prose inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-semibold
                 text-white shadow-cta transition-all duration-300 ease-in-out hover:-translate-y-0.5
                 hover:bg-brand-600 hover:shadow-lg focus-visible:outline
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      data-affiliate="true"
    >
      {children ?? "Visit site"}
      <span aria-hidden>↗</span>
    </a>
  );
}

/** Rewrite any legacy /wp-content/uploads/ URL to the local /uploads path. */
function localize(src?: string): string {
  if (!src) return "";
  return src
    .replace(/https?:\/\/[^"')\s]+?\/wp-content\/uploads\//i, "/uploads/")
    .replace("/wp-content/uploads/", "/uploads/");
}

function SmartLink({ href = "#", children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener" className="text-brand-600 underline-offset-2 hover:underline" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="text-brand-600 underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export const mdxComponents = {
  YouTube,
  AffiliateButton,
  a: SmartLink,
  img: (props: any) => (
    <Image
      src={localize(props.src)}
      alt={props.alt ?? ""}
      width={Number(props.width) || 1200}
      height={Number(props.height) || 675}
      className="my-6 h-auto w-full rounded-xl ring-1 ring-line"
    />
  ),
};
