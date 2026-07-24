import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .default("postgres://rihlamate:rihlamate@localhost:5432/rihlamate_dev"),
    LICENSE_KEY: z.string().optional(),
    LICENSE_PUBLIC_KEY: z.string().optional(),
    LICENSE_SERVER_URL: z.string().url().default("http://localhost:3001"),
    /** API key for license-server `/api/v1/*` (Authorization Bearer or X-API-Key). */
    LICENSE_API_KEY: z.string().optional(),
    /** Stable instance fingerprint for activate/check-in (defaults applied at call sites). */
    INSTANCE_ID: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1).default("ci-test-secret-key-for-build-only"),
    BETTER_AUTH_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    MIDTRANS_SERVER_KEY: z.string().optional(),
    MIDTRANS_CLIENT_KEY: z.string().optional(),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    DEPLOYMENT_TARGET: z.enum(["vps", "cloudflare"]).default("vps"),
    S3_ENDPOINT: z.string().url().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    LICENSE_KEY: process.env.LICENSE_KEY,
    LICENSE_PUBLIC_KEY: process.env.LICENSE_PUBLIC_KEY,
    LICENSE_SERVER_URL: process.env.LICENSE_SERVER_URL,
    LICENSE_API_KEY: process.env.LICENSE_API_KEY,
    INSTANCE_ID: process.env.INSTANCE_ID,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
    MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    DEPLOYMENT_TARGET: process.env.DEPLOYMENT_TARGET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
  },
  // Treat empty Worker plain-text vars as unset so defaults (e.g. BETTER_AUTH_SECRET)
  // apply instead of failing z.string().min(1).
  emptyStringAsUndefined: true,
});
