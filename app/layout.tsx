import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "TheBusinessTrades";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thebusinesstrades.com";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Honest SaaS & Business Tool Reviews`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Independent, in-depth reviews and comparisons of the best online business tools.",
  openGraph: { siteName: SITE_NAME, type: "website", url: SITE_URL },
  twitter: { card: "summary_large_image", site: "@thebusinesstrades" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter />
        {GA_ID ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html:
                  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
                  `gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        ) : null}
      </body>
    </html>
  );
}
