import Link from "next/link";

const NAV = [
  { label: "Tools", href: "/tools" },
  { label: "Categories", href: "/business-tools" },
  { label: "Blog", href: "/blogs" },
  { label: "About", href: "/about-us" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-tbt flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 font-extrabold text-white">T</span>
          <span className="hidden sm:inline">TheBusinessTrades</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-body transition-colors hover:text-brand-700"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Functional, no-JS search: GET to /tools?q=… which seeds the live client filter. */}
        <form action="/tools" method="get" role="search" className="flex items-center gap-2">
          <label htmlFor="site-search" className="sr-only">Search tools</label>
          <input
            id="site-search"
            type="search"
            name="q"
            placeholder="Search tools…"
            autoComplete="off"
            className="w-32 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink placeholder:text-muted outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 sm:w-56"
          />
          <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
        </form>
      </div>
    </header>
  );
}
