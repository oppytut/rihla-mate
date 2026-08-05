import { sql, type SQLWrapper } from "drizzle-orm";

export const REQUIRED_APP_TABLES = [
  "packages",
  "landing_pages",
  "bookings",
  "users",
  "sessions",
  "accounts",
  "verifications",
  "settings",
  "license_keys",
  "media",
  "tenants",
] as const;

export type RequiredAppTable = (typeof REQUIRED_APP_TABLES)[number];

export type SchemaReadyResult = {
  schemaReady: boolean;
  missingTables: string[];
};

export type ExecutableDb = {
  execute: (q: SQLWrapper | string) => PromiseLike<unknown>;
};

export function rowsFromExecute(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result as Record<string, unknown>[];
  }
  if (
    result !== null &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  return [];
}

export async function checkSchemaReady(db: ExecutableDb): Promise<SchemaReadyResult> {
  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `);

  const rows = rowsFromExecute(result);
  const present = new Set(
    rows
      .map((row) => {
        const name = row.table_name ?? row.TABLE_NAME;
        return typeof name === "string" ? name : null;
      })
      .filter((name): name is string => name !== null),
  );

  const missingTables = REQUIRED_APP_TABLES.filter((t) => !present.has(t));

  return {
    schemaReady: missingTables.length === 0,
    missingTables: [...missingTables],
  };
}
