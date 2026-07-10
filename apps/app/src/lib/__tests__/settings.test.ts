import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import type { TRPCContext } from "../trpc/context";

vi.mock("../trpc/init", async () => {
  const t = initTRPC.context<TRPCContext>().create({
    transformer: { serialize: (v: unknown) => v, deserialize: (v: unknown) => v },
    errorFormatter: ({ shape }) => shape,
  });
  return {
    createTRPCRouter: t.router,
    createCallerFactory: t.createCallerFactory,
    adminProcedure: t.procedure,
  };
});

vi.mock("@/lib/db/schema/settings", () => ({
  settings: {
    key: "settings.key",
    value: "settings.value",
    updatedAt: "settings.updatedAt",
  },
}));

const { settingsRouter } = await import("../trpc/routers/settings");
const { createCallerFactory } = await import("../trpc/init");

type DrizzleMock = TRPCContext["db"] & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

function mockDb(): DrizzleMock {
  const db: Record<string, unknown> = {};

  const methods = [
    "select",
    "from",
    "where",
    "orderBy",
    "limit",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ];

  for (const method of methods) {
    db[method] = vi.fn(() => db);
  }

  return db as unknown as DrizzleMock;
}

function createCaller(db: DrizzleMock) {
  const ctx: TRPCContext = {
    headers: new Headers(),
    db,
    session: {
      session: {
        id: "sess-1",
        userId: "user-1",
        expiresAt: new Date(),
        token: "tok",
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "user-1",
        email: "admin@test.com",
        emailVerified: true,
        name: "Admin",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };

  const callerFactory = createCallerFactory(settingsRouter);
  return callerFactory(ctx);
}

describe("settingsRouter.list", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns key-value map from settings rows", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockResolvedValueOnce([
      { key: "site_name", value: "Rihla Mate" },
      { key: "theme", value: "dark" },
    ] as never);

    const result = await caller.list();

    expect(result).toEqual({
      site_name: "Rihla Mate",
      theme: "dark",
    });
  });

  it("returns empty object when no settings", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockResolvedValueOnce([] as never);

    const result = await caller.list();

    expect(result).toEqual({});
  });
});

describe("settingsRouter.get", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns setting when found", async () => {
    const caller = createCaller(db);
    const row = { key: "site_name", value: "Rihla Mate", updatedAt: new Date() };

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([row] as never);

    const result = await caller.get({ key: "site_name" });

    expect(result).toEqual(row);
  });

  it("throws NOT_FOUND when key does not exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.get({ key: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("settingsRouter.set", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("inserts new setting when key does not exist", async () => {
    const caller = createCaller(db);
    const insertedRow = { key: "site_name", value: "Rihla Mate" };

    // existing check: empty
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    // insert path
    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([insertedRow] as never);

    const result = await caller.set({ key: "site_name", value: "Rihla Mate" });

    expect(result).toEqual(insertedRow);
  });

  it("updates existing setting when key exists", async () => {
    const caller = createCaller(db);
    const updatedRow = { key: "site_name", value: "Updated Name" };

    // existing check: found
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ key: "site_name" }] as never);

    // update path
    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([updatedRow] as never);

    const result = await caller.set({ key: "site_name", value: "Updated Name" });

    expect(result).toEqual(updatedRow);
  });

  it("returns the inserted row with key and value", async () => {
    const caller = createCaller(db);
    const row = { key: "theme", value: "light" };

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([row] as never);

    const result = await caller.set({ key: "theme", value: "light" });

    expect(result).toHaveProperty("key", "theme");
    expect(result).toHaveProperty("value", "light");
  });
});

describe("settingsRouter.delete", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("checks existence before deleting when key is found", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ key: "old_setting" }] as never);

    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.delete({ key: "old_setting" });

    expect(result).toEqual({ success: true });
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("deletes successfully and returns { success: true }", async () => {
    const caller = createCaller(db);

    // existing check: found
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ key: "site_name" }] as never);

    // delete
    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.delete({ key: "site_name" });

    expect(result).toEqual({ success: true });
  });

  it("throws NOT_FOUND when key does not exist", async () => {
    const caller = createCaller(db);

    // existing check: empty
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.delete({ key: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
