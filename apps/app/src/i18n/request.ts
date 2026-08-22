import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveAppLocale } from "./resolve-locale";

export default getRequestConfig(async ({ requestLocale }) => {
  const resolvedRequestLocale = await requestLocale;
  const cookieLocale = (await cookies()).get("locale")?.value;
  const locale = resolveAppLocale(resolvedRequestLocale, cookieLocale);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
