import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Cairo } from "next/font/google";
import { cookies, headers } from "next/headers";
import { getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname, PRODUCT_ORIGIN } from "@/lib/site-mode";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (isBureauHostname(hostname)) {
    const name = (await getBureauDisplayName()) ?? "Paket Umrah";
    return {
      title: {
        default: name,
        template: "%s",
      },
      description: "Pilih paket Umrah, lihat jadwal keberangkatan, dan daftar secara online.",
      applicationName: name,
      openGraph: {
        siteName: name,
        title: name,
      },
    };
  }
  const description =
    "Platform white-label travel Umrah self-hosted. Landing page branded, dashboard admin, dan booking engine untuk biro perjalanan.";
  return {
    metadataBase: new URL(PRODUCT_ORIGIN),
    title: {
      default: "Rihla Mate",
      template: "%s · Rihla Mate",
    },
    description,
    applicationName: "Rihla Mate",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: PRODUCT_ORIGIN,
      siteName: "Rihla Mate",
      title: "Rihla Mate",
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: "Rihla Mate",
      description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieLocale = (await cookies()).get("locale")?.value;

  // Detect locale from URL path (set by next-intl middleware)
  // Fall back to cookie, then default "id"
  const pathname = (await headers()).get("x-next-intl-locale") || "";
  const locale = pathname || cookieLocale || "id";
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${plusJakarta.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
