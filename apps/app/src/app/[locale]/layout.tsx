import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { Toaster } from "@/components/ui/sonner";
import {
  hostnameFromHostHeader,
  isBureauHostname,
  pickBureauClientMessages,
} from "@/lib/site-mode";

function MidtransSnapScript() {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!clientKey) return null;

  const isSandbox = clientKey.startsWith("SB-Mid-client-");
  const snapUrl = isSandbox
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";

  return (
    <Script
      src={snapUrl}
      data-client-key={clientKey}
      data-midtrans-snap="1"
      strategy="afterInteractive"
    />
  );
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
  const allMessages = await getMessages({ locale: resolvedLocale });
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  const messages = isBureauHostname(hostname) ? pickBureauClientMessages(allMessages) : allMessages;

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
