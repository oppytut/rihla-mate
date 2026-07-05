import { createTRPCRouter, publicProcedure } from "../init";
import { licenseRouter } from "./license";
import { featureTestRouter } from "./feature-test";
import { installerRouter } from "./installer";
import { packagesRouter } from "./packages";
import { bookingsRouter } from "./bookings";
import { userRouter } from "./user";
import { midtransRouter } from "./midtrans";
import { dashboardRouter } from "./dashboard";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" })),
  license: licenseRouter,
  featureTest: featureTestRouter,
  installer: installerRouter,
  packages: packagesRouter,
  bookings: bookingsRouter,
  user: userRouter,
  midtrans: midtransRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
