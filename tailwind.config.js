/**
 * tailwind.config.js — TheBusinessTrades design tokens.
 * Aesthetic: clean, modern, trustworthy SaaS-review. Pure-white surfaces + Sky-Blue accent.
 * Restrained motion (no flashy interactivity) — subtle shadows, generous whitespace.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.mdx",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sky-Blue brand ramp (primary = brand-500 === sky-500)
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9", // primary
          600: "#0284c7", // hover / active
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        // Neutrals: pure-white surfaces on cool slate ink
        surface: "#ffffff", // page background
        subtle: "#f8fafc",  // contrast section bands (slate-50)
        card: "#ffffff",    // cards / panels / inputs
        ink: "#0f172a",     // headings (slate-900)
        body: "#334155",    // paragraph text (slate-700)
        muted: "#64748b",   // captions / meta (slate-500)
        line: "#e2e8f0",    // hairline borders (slate-200)
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(2,132,199,0.18)",
        cta: "0 8px 20px -8px rgba(2,132,199,0.55)",
      },
      maxWidth: { content: "72rem" },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.body"),
            "--tw-prose-headings": theme("colors.ink"),
            "--tw-prose-lead": theme("colors.body"),
            "--tw-prose-links": theme("colors.brand.600"),
            "--tw-prose-bold": theme("colors.ink"),
            "--tw-prose-counters": theme("colors.muted"),
            "--tw-prose-bullets": theme("colors.brand.300"),
            "--tw-prose-hr": theme("colors.line"),
            "--tw-prose-quotes": theme("colors.ink"),
            "--tw-prose-quote-borders": theme("colors.brand.200"),
            "--tw-prose-captions": theme("colors.muted"),
            "--tw-prose-th-borders": theme("colors.line"),
            "--tw-prose-td-borders": theme("colors.line"),
            maxWidth: "70ch",
            a: { textDecoration: "none", fontWeight: "500" },
            "a:hover": { textDecoration: "underline" },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
