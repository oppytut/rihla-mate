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
    publicProcedure: t.procedure,
    adminProcedure: t.procedure,
  };
});

vi.mock("@/lib/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db/schema/media", () => ({
  media: {
    id: "media.id",
    filename: "media.filename",
    originalName: "media.originalName",
    mimeType: "media.mimeType",
    sizeBytes: "media.sizeBytes",
    altText: "media.altText",
    width: "media.width",
    height: "media.height",
    createdAt: "media.createdAt",
  },
}));

const { mediaRouter } = await import("../trpc/routers/media");
const { createCallerFactory } = await import("../trpc/init");

type DrizzleMock = TRPCContext["db"] & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
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
    "offset",
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

  const callerFactory = createCallerFactory(mediaRouter);
  return callerFactory(ctx);
}

describe("mediaRouter.list", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const sampleMedia = {
    id: "00000000-0000-0000-0000-000000000001",
    filename: "photo-1.jpg",
    originalName: "vacation.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 102400,
    altText: "Beach sunset",
    width: 1920,
    height: 1080,
    createdAt: new Date("2026-07-01"),
  };

  it("returns paginated items with total, page, limit", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleMedia] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockResolvedValueOnce([{ count: 15 }] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result).toEqual({
      items: [sampleMedia],
      total: 15,
      page: 1,
      limit: 20,
    });
  });

  it("throws INTERNAL_SERVER_ERROR when items query rejects", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockRejectedValueOnce(new Error("DB connection lost"));

    await expect(caller.list({ page: 1, limit: 20 })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("returns total=0 when count query rejects but items succeed", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleMedia] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockRejectedValueOnce(new Error("Count failed"));

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result.items).toEqual([sampleMedia]);
    expect(result.total).toBe(0);
  });

  it("handles empty count result (no rows returned)", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockResolvedValueOnce([] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("mediaRouter.create", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const validInput = {
    filename: "stored-abc.jpg",
    originalName: "my-photo.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 204800,
    altText: "My vacation photo",
    width: 1920,
    height: 1080,
  };

  it("creates media successfully and returns inserted row", async () => {
    const caller = createCaller(db);

    const inserted = {
      id: "00000000-0000-0000-0000-000000000010",
      filename: validInput.filename,
      originalName: validInput.originalName,
      mimeType: validInput.mimeType,
      sizeBytes: validInput.sizeBytes,
      altText: validInput.altText,
      width: validInput.width,
      height: validInput.height,
      createdAt: new Date("2026-07-10"),
    };

    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([inserted] as never);

    const result = await caller.create(validInput);

    expect(result).toEqual(inserted);
  });

  it("creates media with minimal required fields only", async () => {
    const caller = createCaller(db);

    const minimalInput = {
      filename: "stored-min.jpg",
      originalName: "min.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 51200,
    };

    const inserted = {
      id: "00000000-0000-0000-0000-000000000011",
      filename: minimalInput.filename,
      originalName: minimalInput.originalName,
      mimeType: minimalInput.mimeType,
      sizeBytes: minimalInput.sizeBytes,
      altText: null,
      width: null,
      height: null,
      createdAt: new Date("2026-07-10"),
    };

    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([inserted] as never);

    const result = await caller.create(minimalInput);

    expect(result).toEqual(inserted);
  });
});

describe("mediaRouter.update", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const mediaId = "00000000-0000-0000-0000-000000000001";

  it("updates altText successfully and returns updated row", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: mediaId }] as never);

    const updated = {
      id: mediaId,
      filename: "photo-1.jpg",
      originalName: "vacation.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 102400,
      altText: "Updated alt text",
      width: 1920,
      height: 1080,
      createdAt: new Date("2026-07-01"),
    };

    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([updated] as never);

    const result = await caller.update({ id: mediaId, altText: "Updated alt text" });

    expect(result).toEqual(updated);
  });

  it("throws NOT_FOUND when media does not exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(
      caller.update({ id: "00000000-0000-0000-0000-000000000099", altText: "New alt" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("mediaRouter.delete", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const mediaId = "00000000-0000-0000-0000-000000000001";

  it("deletes media successfully and returns { success: true }", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: mediaId }] as never);

    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.delete({ id: mediaId });

    expect(result).toEqual({ success: true });
  });

  it("throws NOT_FOUND when media does not exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(
      caller.delete({ id: "00000000-0000-0000-0000-000000000099" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
