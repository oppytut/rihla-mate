import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/lib/auth-session";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) {
    const locale = await getLocale();
    redirect({ href: "/sign-in", locale });
  }

  return <DashboardShell>{children}</DashboardShell>;
}
