import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth-session";
import { DashboardShell } from "./dashboard-shell";
import { bureauAbbr, getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname } from "@/lib/site-mode";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) {
    const locale = await getLocale();
    redirect({ href: "/sign-in", locale });
  }

  const tCommon = await getTranslations("common");
  const tBureau = await getTranslations("marketing.bureau");
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  const bureau = isBureauHostname(hostname);
  const wordmark = bureau
    ? ((await getBureauDisplayName()) ?? tBureau("title"))
    : tCommon("appName");
  const abbr = bureau ? bureauAbbr(wordmark) : tCommon("appNameAbbr");

  return (
    <DashboardShell brandWordmark={wordmark} brandAbbr={abbr} bureau={bureau}>
      {children}
    </DashboardShell>
  );
}
