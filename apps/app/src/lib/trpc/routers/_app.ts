import { createTRPCRouter, publicProcedure } from "../init";
import { licenseRouter } from "./license";
import { featureTestRouter } from "./feature-test";
import { installerRouter } from "./installer";
import { packagesRouter } from "./packages";
import { bookingsRouter } from "./bookings";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" })),
  license: licenseRouter,
  featureTest: featureTestRouter,
  installer: installerRouter,
  packages: packagesRouter,
  bookings: bookingsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
