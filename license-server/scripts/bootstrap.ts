import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { generateLicenseKey } from "../src/lib/keygen";

const DEFAULT_API_URL = "https://rihla-mate-license-production.ariefna95.workers.dev/api/v1";

function randomId(prefix: string, len = 16): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, len)}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!process.env.LICENSE_PRIVATE_KEY) {
    throw new Error("LICENSE_PRIVATE_KEY is required");
  }

  const db = drizzle(neon(databaseUrl), { schema });
  const apiKeyValue =
    process.env.BOOTSTRAP_API_KEY ?? `sk_${crypto.randomUUID().replace(/-/g, "")}`;
  const apiUrl = process.env.API_URL ?? DEFAULT_API_URL;

  const existingKeys = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.name, "bootstrap"))
    .limit(1);

  let apiKey = apiKeyValue;
  if (existingKeys[0]) {
    apiKey = existingKeys[0].key;
    console.log("Bootstrap API key already exists (reusing).");
  } else {
    await db.insert(schema.apiKeys).values({
      id: randomId("apk", 12),
      key: apiKeyValue,
      name: "bootstrap",
    });
    console.log("Created bootstrap API key.");
  }

  const customerId = "cus_bootstrap";
  const [existingCustomer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1);

  if (!existingCustomer) {
    await db.insert(schema.customers).values({
      id: customerId,
      name: "Bootstrap Customer",
      email: "bootstrap@rihla-mate.local",
    });
    console.log("Created bootstrap customer.");
  } else {
    console.log("Bootstrap customer already exists.");
  }

  const licenseId = "lic_bootstrap";
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const [existingLicense] = await db
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.id, licenseId))
    .limit(1);

  if (!existingLicense) {
    await db.insert(schema.licenses).values({
      id: licenseId,
      customerId,
      plan: "pro",
      features: ["multi_tenant", "custom_domain", "white_label"],
      maxTenants: 5,
      maxMonthlyBookings: 1000,
      expiresAt,
      gracePeriodDays: 7,
      isTrial: false,
      trialDays: 14,
      status: "active",
    });
    console.log("Created bootstrap license row.");
  } else {
    console.log("Bootstrap license row already exists.");
  }

  const licenseKey = await generateLicenseKey({
    licenseId,
    customerId,
    customerName: "Bootstrap Customer",
    plan: "pro",
    features: ["multi_tenant", "custom_domain", "white_label"],
    maxTenants: 5,
    maxMonthlyBookings: 1000,
    expiresAt: expiresAt.toISOString(),
    gracePeriodDays: 7,
    isTrial: false,
    trialDays: 14,
    apiUrl,
  });

  console.log("");
  console.log("=== Bootstrap complete ===");
  console.log(`API_KEY=${apiKey}`);
  console.log(`LICENSE_KEY=${licenseKey}`);
  if (process.env.LICENSE_PUBLIC_KEY) {
    console.log(`LICENSE_PUBLIC_KEY=${process.env.LICENSE_PUBLIC_KEY}`);
  }
  console.log(`API_URL=${apiUrl}`);
  console.log("");
  console.log("Smoke activate:");
  console.log(
    `curl -sS -X POST "${apiUrl}/activate" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{"licenseKey":"${licenseKey}","instanceId":"inst_smoke","domain":"rihla-mate.ariefna95.workers.dev"}'`,
  );
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
