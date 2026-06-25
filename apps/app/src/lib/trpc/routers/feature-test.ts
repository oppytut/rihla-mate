import { createTRPCRouter, publicProcedure } from "../init";
import { licenseMiddleware, requireFeature } from "@/lib/license/guard";

export const featureTestRouter = createTRPCRouter({
  seoStatus: publicProcedure
    .use(licenseMiddleware)
    .use(requireFeature("seo"))
    .query(() => ({ enabled: true })),

  analyticsStatus: publicProcedure
    .use(licenseMiddleware)
    .use(requireFeature("analytics"))
    .query(() => ({ enabled: true })),
});
