import { Pool } from "pg";
import { randomUUID } from "crypto";
import { hashPassword } from "@better-auth/utils/password";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://rihlamate:rihlamate_dev@localhost:5432/rihlamate_dev";

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const userId = randomUUID();
  const email = "playwright@rihlamate.test";
  const password = "testpass123";
  const now = new Date();
  const sessionToken = randomUUID();
  const sessionExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Generate a proper scrypt hash matching Better Auth's algorithm
  // @better-auth/utils/password uses: scrypt with N=16384, r=16, p=1, dkLen=64
  // Format: <16-byte-hex-salt>:<64-byte-hex-key> (32 hex chars : 128 hex chars)
  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clean up existing test user
    await client.query(
      "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [email]
    );
    await client.query(
      "DELETE FROM accounts WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [email]
    );
    await client.query("DELETE FROM verifications WHERE identifier = $1", [email]);
    await client.query("DELETE FROM users WHERE email = $1", [email]);

    // Insert user (matching Better Auth users table)
    await client.query(
      `INSERT INTO users (id, email, name, email_verified, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, "Playwright Admin", true, "admin", now, now]
    );

    // Insert account with scrypt password hash for "testpass123"
    // Uses @better-auth/utils/password hashPassword() which produces:
    //   scrypt(N=16384, r=16, p=1, dkLen=64) with NFKC normalization
    //   format: <salt-hex>:<key-hex> = 32 hex chars : 128 hex chars

    await client.query(
      `INSERT INTO accounts (id, user_id, provider_id, account_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), userId, "credential", email, passwordHash, now, now]
    );

    await client.query(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), userId, sessionToken, sessionExpires, now, now]
    );

    await client.query("COMMIT");
    console.log(`SESSION_TOKEN=${sessionToken}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
