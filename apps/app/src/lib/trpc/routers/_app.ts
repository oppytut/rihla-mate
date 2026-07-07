import { createTRPCRouter, publicProcedure } from "../init";
import { licenseRouter } from "./license";
import { licenseAdminRouter } from "./license-admin";
import { featureTestRouter } from "./feature-test";
import { installerRouter } from "./installer";
import { packagesRouter } from "./packages";
import { bookingsRouter } from "./bookings";
import { userRouter } from "./user";
import { midtransRouter } from "./midtrans";
import { dashboardRouter } from "./dashboard";
import { settingsRouter } from "./settings";
import { customersRouter } from "./customers";
import { mediaRouter } from "./media";
import { pagesRouter } from "./pages";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" })),
  license: licenseRouter,
  licenseAdmin: licenseAdminRouter,
  featureTest: featureTestRouter,
  installer: installerRouter,
  packages: packagesRouter,
  bookings: bookingsRouter,
  user: userRouter,
  midtrans: midtransRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
  customers: customersRouter,
  media: mediaRouter,
  pages: pagesRouter,
});

export type AppRouter = typeof appRouter;
