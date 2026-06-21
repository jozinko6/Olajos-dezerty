import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Olajos Dezerty — Cukráreň a torty na mieru | Hlohovec",
    template: "%s | Olajos Dezerty",
  },
  description:
    "Olajos Dezerty — prémiová cukráreň v Hlohovci. Domáce torty na mieru, zákusky, dezerty a catering. Doručujeme do Hlohovca, Šulekova, Leopoldova, Červeníka a okolitých obcí.",
  keywords: [
    "Olajos Dezerty",
    "cukráreň Hlohovec",
    "torty na mieru",
    "zákusky",
    "dezerty",
    "catering",
    "svadobné torty",
    "narodeninové torty",
  ],
  authors: [{ name: "Olajos Dezerty" }],
  creator: "Olajos Dezerty",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Olajos Dezerty — Cukráreň a torty na mieru",
    description: "Prémiová cukráreň v Hlohovci. Domáce torty, zákusky a catering s doručovaním.",
    url: "http://localhost:3000",
    siteName: "Olajos Dezerty",
    locale: "sk_SK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Olajos Dezerty — Cukráreň a torty na mieru",
    description: "Prémiová cukráreň v Hlohovci. Domáce torty, zákusky a catering.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: "Olajos Dezerty",
    description: "Prémiová cukráreň v Hlohovci. Domáce torty, zákusky a catering.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "M. R. Štefánika",
      addressLocality: "Hlohovec",
      postalCode: "920 01",
      addressCountry: "SK",
    },
    telephone: "+421 905 000 000",
    servesCuisine: "Cukráreň, dezerty",
    priceRange: "€€",
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "08:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "08:00", closes: "14:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "09:00", closes: "13:00" },
    ],
  };

  return (
    <html lang="sk" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
