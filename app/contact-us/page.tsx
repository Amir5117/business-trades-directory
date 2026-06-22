import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact TheBusinessTrades — Get in Touch",
  description:
    "Questions, feedback, partnership ideas, or a tool we should review? Reach the TheBusinessTrades editorial team by email or on Instagram.",
  alternates: { canonical: "/contact-us" },
};

const EMAIL = "thebusinesstrades@gmail.com";
const IG_HANDLE = "@thebusinesstrades_";
const IG_URL = "https://instagram.com/thebusinesstrades_";

const cardClass =
  "group flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-md";

export default function ContactPage() {
  return (
    <article>
      {/* ---------- Header ---------- */}
      <section className="border-b border-line bg-slate-50">
        <div className="container-tbt max-w-4xl py-16 text-center sm:py-20">
          <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Contact
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Get in touch
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Have a question, spotted something we should fix, or want us to review a tool? We read
            every message — reach out and we'll get back to you.
          </p>
        </div>
      </section>

      <div className="container-tbt max-w-4xl py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Email */}
          <a href={`mailto:${EMAIL}`} className={cardClass}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">Email us</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              The fastest way to reach the editorial team.
            </p>
            <span className="mt-4 break-all text-sm font-semibold text-brand-600 group-hover:underline">
              {EMAIL}
            </span>
          </a>

          {/* Instagram */}
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" className={cardClass}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">Follow on Instagram</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Tips, tool spotlights, and behind-the-scenes.
            </p>
            <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:underline">
              {IG_HANDLE}
            </span>
          </a>

          {/* Suggest a tool */}
          <a
            href={`mailto:${EMAIL}?subject=Tool%20suggestion`}
            className={cardClass}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">Suggest a tool</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Think we're missing something? Tell us what to review next.
            </p>
            <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:underline">
              Send a suggestion
            </span>
          </a>
        </div>

        {/* What to expect */}
        <div className="mt-10 rounded-2xl bg-brand-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">What to expect</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            We typically reply within two business days. We're an independent publication — we don't
            sell coverage, and reaching out never changes how a tool is rated.
          </p>
        </div>
      </div>
    </article>
  );
}
