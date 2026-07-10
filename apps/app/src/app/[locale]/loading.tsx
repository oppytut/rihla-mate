import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{t("loading")}</p>
    </div>
  );
}
