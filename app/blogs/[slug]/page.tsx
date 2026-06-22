import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { postSlugs, getPost } from "@/lib/content";
import { MDXContent } from "@/components/MDXContent";

type Params = { params: { slug: string } };

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  try {
    const { frontmatter } = getPost(params.slug);
    return {
      title: frontmatter.seo?.title ?? frontmatter.title,
      description: frontmatter.seo?.description,
      alternates: { canonical: `/blogs/${params.slug}` },
    };
  } catch {
    return {};
  }
}

export default function BlogPost({ params }: Params) {
  let doc;
  try {
    doc = getPost(params.slug);
  } catch {
    notFound();
  }
  const { frontmatter, body } = doc!;
  return (
    <article className="container-tbt py-12">
      <h1 className="max-w-3xl text-3xl font-bold text-ink sm:text-4xl">{frontmatter.title}</h1>
      {frontmatter.date ? (
        <p className="mt-2 text-sm text-muted">{new Date(frontmatter.date).toLocaleDateString()}</p>
      ) : null}
      {frontmatter.featured_image ? (
        <Image
          src={frontmatter.featured_image}
          alt={frontmatter.title}
          width={1200}
          height={630}
          className="mt-6 h-auto w-full rounded-2xl ring-1 ring-line"
        />
      ) : null}
      <div className="mt-8">
        <MDXContent source={body} path={`content/blog/${params.slug}.mdx`} />
      </div>
    </article>
  );
}
