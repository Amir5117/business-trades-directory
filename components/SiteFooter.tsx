import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-subtle">
      <div className="container-tbt grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">T</span>
            TheBusinessTrades
          </div>
          <p className="mt-3 text-sm text-muted">
            Independent reviews of the best online business tools.
          </p>
          <p className="mt-3 text-sm text-muted">
            <a href="mailto:thebusinesstrades@gmail.com" className="text-brand-600 hover:underline">
              thebusinesstrades@gmail.com
            </a>
          </p>
        </div>
        <FooterCol title="Explore" links={[["All tools", "/tools"], ["Categories", "/business-tools"], ["Blog", "/blogs"]]} />
        <FooterCol title="Company" links={[["About", "/about-us"], ["Contact", "/contact-us"]]} />
        <FooterCol title="Legal" links={[["Privacy", "/privacy-policy"], ["Affiliate disclosure", "/affiliate-disclosure"]]} />
      </div>
      <div className="border-t border-line py-6">
        <p className="container-tbt text-sm text-muted">
          © {new Date().getFullYear()} TheBusinessTrades. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-muted hover:text-brand-700">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
