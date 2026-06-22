import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About TheBusinessTrades — Independent Business Software Reviews",
  description:
    "We help businesses choose software with confidence — independent reviews built on real user sentiment, feature depth, and honest pricing analysis.",
  alternates: { canonical: "/about-us" },
};

/** Transparent, repeatable methodology shown to readers (E-E-A-T trust signal). */
const METHOD = [
  {
    step: "01",
    title: "Real user sentiment",
    body: "We read what actual customers say across review platforms, communities, and support threads — then surface the patterns, not the cherry-picked quotes.",
  },
  {
    step: "02",
    title: "Feature depth",
    body: "We test what each tool actually does against the job it claims to do, so you know where it's genuinely strong and where it falls short.",
  },
  {
    step: "03",
    title: "Honest pricing",
    body: "We model real-world costs — seats, credits, and the upgrades you'll hit as you grow — so there are no surprises after you sign up.",
  },
];

const VALUES = [
  {
    title: "Transparency",
    body: "We disclose how we're funded and how we reach a verdict. When a link is an affiliate link, we say so — and it never changes our rating.",
    icon: (
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
    ),
  },
  {
    title: "Real Data",
    body: "Every recommendation is grounded in tested features, verified pricing, and aggregated user sentiment — never vibes or vendor marketing.",
    icon: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-4" />
        <path d="M13 16V8" />
        <path d="M18 16v-6" />
      </>
    ),
  },
  {
    title: "Independent Curation",
    body: "No brand can pay for a better score or a spot on a list. We curate for our readers first, full stop, so you can trust what you read here.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <article>
      {/* ---------- Mission hero ---------- */}
      <section className="border-b border-line bg-slate-50">
        <div className="container-tbt max-w-4xl py-16 text-center sm:py-20">
          <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            About TheBusinessTrades
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            We make business software decisions simple, fast, and trustworthy.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Choosing the right tool shouldn't mean wading through paid placements and copy-paste
            listicles. We do the testing, read the real reviews, and cut through the noise — so you
            can pick with confidence and get back to running your business.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/tools" className="btn-primary text-sm">Browse tool reviews</Link>
            <Link href="/blogs" className="btn-outline text-sm">Read the blog</Link>
          </div>
        </div>
      </section>

      <div className="container-tbt max-w-4xl">
        {/* ---------- Our Mission ---------- */}
        <section className="py-16">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Our mission</h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">
            There are thousands of business tools and a strong incentive for everyone to tell you
            theirs is the best. Our mission is to be the opposite of that: an independent guide that
            puts the reader first. We exist to turn a confusing, high-stakes decision into a clear,
            ten-minute one — backed by evidence you can verify yourself.
          </p>
        </section>

        {/* ---------- How We Review ---------- */}
        <section className="tbt-section-sep py-16">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">How we review</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Every review on this site follows the same transparent methodology. We weigh three
            things, in this order:
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {METHOD.map((m) => (
              <div
                key={m.step}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
              >
                <span className="text-sm font-bold text-brand-500">{m.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-ink">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{m.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            We only recommend tools we'd be comfortable using ourselves — and we update reviews as
            products and pricing change.
          </p>
        </section>

        {/* ---------- Core Values ---------- */}
        <section className="tbt-section-sep py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Our core values</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-neutral-600">
              Three principles guide every word we publish.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="group rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
              >
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {v.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="tbt-section-sep py-16">
          <div className="rounded-2xl bg-brand-50 p-8 text-center sm:p-10">
            <h2 className="text-xl font-semibold text-ink sm:text-2xl">
              Ready to find your next tool?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-600">
              Explore hundreds of independent, hands-on reviews — each tested on real user
              sentiment, feature depth, and pricing.
            </p>
            <div className="mt-6 flex justify-center">
              <Link href="/tools" className="btn-primary text-sm">Explore all reviews</Link>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
