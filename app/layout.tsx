import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitialization = `(() => {
  document.documentElement.dataset.js = "enabled";
  try {
    const saved = localStorage.getItem("neurostack-theme");
    const theme = saved === "dark" || saved === "light" ? saved : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();`;

export const metadata: Metadata = {
  title: {
    default: "NeuroStack Explorer",
    template: "%s | NeuroStack Explorer",
  },
  description:
    "An interactive technical demonstration connecting public NWB neurophysiology data with open-source analysis, modeling, and scientific visualization tools.",
  applicationName: "NeuroStack Explorer",
  authors: [{ name: "Fatgezim ‘Zim’ Bela" }],
  creator: "Fatgezim ‘Zim’ Bela",
  category: "Scientific software",
  openGraph: {
    title: "NeuroStack Explorer",
    description:
      "A provenance-first interactive workflow for public NWB data, neural analysis, modeling, uncertainty, and scientific visualization.",
    type: "website",
    images: [
      {
        url: "/neurostack-og.png",
        width: 1731,
        height: 908,
        alt: "Illustrative neural spike raster linked to tuning, trace, and population-embedding views.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroStack Explorer",
    description: "Open neural data, made inspectable.",
    images: ["/neurostack-og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-js="disabled" data-theme="light" lang="en" suppressHydrationWarning>
      <head>
        <meta content="#f4f6f2" name="theme-color" />
        <script dangerouslySetInnerHTML={{ __html: themeInitialization }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
