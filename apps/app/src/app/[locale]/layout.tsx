import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { Toaster } from "@/components/ui/sonner";

function MidtransSnapScript() {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!clientKey) return null;

  const isSandbox = clientKey.startsWith("SB-Mid-client-");
  const snapUrl = isSandbox
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";

  return <Script src={snapUrl} data-client-key={clientKey} strategy="afterInteractive" />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieLocale = (await cookies()).get("locale")?.value;
  const resolvedLocale = locale || cookieLocale || "id";
  const messages = await getMessages({ locale: resolvedLocale });

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
      <TRPCReactProvider>
        {children}
        <Toaster />
        <MidtransSnapScript />
      </TRPCReactProvider>
    </NextIntlClientProvider>
  );
}
