import { Pool, type PoolClient } from "pg";
import { randomUUID } from "crypto";
import { hashPassword } from "@better-auth/utils/password";

const DEFAULT_EMAIL = "playwright@rihlamate.test";
const DEFAULT_PASSWORD = "testpass123";
const DEFAULT_NAME = "Playwright Admin";
const LICENSE_KEY = "CI-TEST-LICENSE-KEY";

function requireGate(): void {
  if (process.env.E2E_ADMIN_SEED === "1") return;
  console.error(
    [
      "Refusing to run: set E2E_ADMIN_SEED=1 to seed the e2e admin user.",
      "This script writes credential accounts and must not run accidentally.",
      "",
      "Example:",
      "  E2E_ADMIN_SEED=1 DATABASE_URL=postgres://... pnpm db:seed:e2e-admin",
    ].join("\n"),
  );
  process.exit(1);
}

function resolveConnectionUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim();
  return unpooled || databaseUrl;
}

async function upsertAdmin(client: PoolClient): Promise<{
  userId: string;
  email: string;
  created: boolean;
}> {
  const email = (process.env.E2E_ADMIN_EMAIL?.trim() || DEFAULT_EMAIL).toLowerCase();
  const password = process.env.E2E_ADMIN_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const name = process.env.E2E_ADMIN_NAME?.trim() || DEFAULT_NAME;
  const now = new Date();
  const passwordHash = await hashPassword(password);

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );

  let userId: string;
  let created = false;

  if (existing.rows[0]) {
    userId = existing.rows[0].id;
    await client.query(
      `UPDATE users
       SET name = $2,
           email_verified = true,
           role = 'admin',
           updated_at = $3
       WHERE id = $1`,
      [userId, name, now],
    );

    const account = await client.query<{ id: string }>(
      `SELECT id FROM accounts
       WHERE user_id = $1 AND provider_id = 'credential'
       LIMIT 1`,
      [userId],
    );

    if (account.rows[0]) {
      await client.query(
        `UPDATE accounts
         SET password = $2,
             account_id = $3,
             updated_at = $4
         WHERE id = $1`,
        [account.rows[0].id, passwordHash, email, now],
      );
    } else {
      await client.query(
        `INSERT INTO accounts (id, user_id, provider_id, account_id, password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), userId, "credential", email, passwordHash, now, now],
      );
    }
  } else {
    userId = randomUUID();
    created = true;
    await client.query(
      `INSERT INTO users (id, email, name, email_verified, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, name, true, "admin", now, now],
    );
    await client.query(
      `INSERT INTO accounts (id, user_id, provider_id, account_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), userId, "credential", email, passwordHash, now, now],
    );
  }

  await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM verifications WHERE identifier = $1`, [email]);

  return { userId, email, created };
}

async function upsertLicense(client: PoolClient): Promise<void> {
  const now = new Date();
  await client.query(`DELETE FROM license_keys WHERE key = $1`, [LICENSE_KEY]);
  await client.query(
    `INSERT INTO license_keys (key, type, seats, issued_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [LICENSE_KEY, "pro", 10, now, new Date("2030-12-31T00:00:00Z")],
  );
}

export async function main(): Promise<void> {
  requireGate();

  const connectionUrl = resolveConnectionUrl();
  const safeUrl = connectionUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  console.log(`[e2e-admin-seed] connecting (pg direct): ${safeUrl}`);

  const pool = new Pool({ connectionString: connectionUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { userId, email, created } = await upsertAdmin(client);

    if (process.env.E2E_ADMIN_SEED_LICENSE === "1") {
      await upsertLicense(client);
      console.log(`[e2e-admin-seed] license key upserted: ${LICENSE_KEY}`);
    }

    await client.query("COMMIT");
    console.log(`[e2e-admin-seed] admin ${created ? "created" : "updated"}: ${email} (${userId})`);
    console.log(
      "[e2e-admin-seed] done. Sign in with that email/password; catalog seed is separate (apps/app seed.ts).",
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

const isMain =
  require.main === module ||
  process.argv[1]?.endsWith("neon-e2e-admin-seed.ts") ||
  process.argv[1]?.endsWith("neon-e2e-admin-seed.js");

if (isMain) {
  main().catch((err) => {
    console.error("[e2e-admin-seed] failed:", err);
    process.exit(1);
  });
}
