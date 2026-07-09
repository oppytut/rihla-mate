import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import Script from "next/script";
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
