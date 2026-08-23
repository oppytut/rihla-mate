import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AuthBrandProvider } from "@/components/auth/auth-brand-context";
import { bureauAbbr, getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname } from "@/lib/site-mode";

export default async function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  const tCommon = await getTranslations("common");
  const tBureau = await getTranslations("marketing.bureau");
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  const bureau = isBureauHostname(hostname);
  const wordmark = bureau
    ? ((await getBureauDisplayName()) ?? tBureau("title"))
    : tCommon("appName");
  const abbr = bureau ? bureauAbbr(wordmark) : tCommon("appNameAbbr");

  return (
    <AuthBrandProvider wordmark={wordmark} abbr={abbr}>
      {children}
    </AuthBrandProvider>
  );
}
