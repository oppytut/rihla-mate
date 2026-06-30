import "dotenv/config";
import { parseArgs } from "node:util";
import { generateLicenseKey } from "../src/lib/keygen";
import { generateKeyPair } from "../src/lib/signing";

// Minimal logger for CLI output — structured logging lib not available in this package
const cliLog = {
  info: (msg: string) => console.log(msg),
  error: (msg: string) => console.error(msg),
};

function printHelp() {
  console.log(`
Usage: npm run keygen -- [options]

Options:
  --plan <starter|pro|enterprise>  License plan (default: starter)
  --customer-id <id>               Customer ID
  --customer-name <name>           Customer name
  --features <list>                Comma-separated feature list
  --max-tenants <n>                Max tenants (default: 1)
  --max-monthly-bookings <n>       Max monthly bookings (default: 100)
  --expires-at <iso-date>          Expiration date (default: 1 year from now)
  --trial                          Mark as trial license
  --trial-days <n>                 Trial duration in days (default: 14)
  --api-url <url>                  API URL for check-in
  --generate-keys                  Generate and print Ed25519 key pair
  --help                           Show this help
`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      plan: { type: "string" },
      "customer-id": { type: "string" },
      "customer-name": { type: "string" },
      features: { type: "string" },
      "max-tenants": { type: "string" },
      "max-monthly-bookings": { type: "string" },
      "expires-at": { type: "string" },
      trial: { type: "boolean" },
      "trial-days": { type: "string" },
      "api-url": { type: "string" },
      "generate-keys": { type: "boolean" },
      help: { type: "boolean" },
    },
    strict: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (values["generate-keys"]) {
    const { publicKey, privateKey } = await generateKeyPair();
    console.log("Ed25519 Key Pair (hex-encoded):");
    console.log(`LICENSE_PUBLIC_KEY=${Buffer.from(publicKey).toString("hex")}`);
    console.log(`LICENSE_PRIVATE_KEY=${Buffer.from(privateKey).toString("hex")}`);
    return;
  }

  if (!values["customer-id"]) {
    cliLog.error("Error: --customer-id is required. Use --help for usage info.");
    return;
  }

  const expiresAt =
    values["expires-at"] ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const licenseId = `lic_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const key = await generateLicenseKey({
    licenseId,
    customerId: values["customer-id"],
    customerName: values["customer-name"] ?? "Unknown",
    plan: (values.plan as "starter" | "pro" | "enterprise") ?? "starter",
    features: values.features ? values.features.split(",").map((f) => f.trim()) : [],
    maxTenants: parseInt(values["max-tenants"] ?? "1", 10),
    maxMonthlyBookings: parseInt(values["max-monthly-bookings"] ?? "100", 10),
    expiresAt,
    gracePeriodDays: 7,
    isTrial: values.trial ?? false,
    trialDays: parseInt(values["trial-days"] ?? "14", 10),
    apiUrl: values["api-url"] ?? "https://license.rihla-mate.com/api/v1",
  });

  console.log(`License ID: ${licenseId}`);
  console.log(`License Key: ${key}`);
}

const isMainModule =
  process.argv[1]?.endsWith("keygen-cli.ts") || process.argv[1]?.endsWith("keygen-cli.js");
if (isMainModule) {
  main().catch((err) => {
    cliLog.error(`Error: ${err}`);
    process.exit(1);
  });
}
