import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies } from "next/headers";

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
      {children}
    </NextIntlClientProvider>
  );
}
