import type { Metadata } from "next";

import { SiteHeader } from "../components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Cities Surveillance Registry",
    template: "%s | Smart Cities Surveillance Registry",
  },
  description:
    "Public transparency and accountability registry for smart-city surveillance systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          <div>
            <strong>Smart Cities Surveillance Registry</strong>
            <span>
              Public infrastructure for surveillance transparency and accountability.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
