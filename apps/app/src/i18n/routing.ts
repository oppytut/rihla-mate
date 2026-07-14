import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en", "ar"],
  defaultLocale: "id",
  localePrefix: "as-needed",
  localeDetection: false,
});
