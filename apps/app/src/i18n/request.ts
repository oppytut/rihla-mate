import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async ({ requestLocale }) => {
  const resolvedRequestLocale = await requestLocale;
  const cookieLocale = (await cookies()).get("locale")?.value;
  const locale = resolvedRequestLocale ?? cookieLocale ?? "id";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
