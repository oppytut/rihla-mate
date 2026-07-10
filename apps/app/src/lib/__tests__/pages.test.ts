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

vi.mock("@/lib/db/schema/pages", () => ({
  pages: {
    id: "pages.id",
    templateId: "pages.templateId",
    slug: "pages.slug",
    title: "pages.title",
    content: "pages.content",
    seo: "pages.seo",
    isPublished: "pages.isPublished",
    isHomepage: "pages.isHomepage",
    publishedAt: "pages.publishedAt",
    createdAt: "pages.createdAt",
    updatedAt: "pages.updatedAt",
  },
}));

const { pagesRouter } = await import("../trpc/routers/pages");
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

  const callerFactory = createCallerFactory(pagesRouter);
  return callerFactory(ctx);
}

const samplePage = {
  id: "00000000-0000-0000-0000-000000000001",
  templateId: "template-hero",
  slug: "about-us",
  title: "About Us",
  content: { hero: { heading: "Welcome" } },
  seo: { title: "About", description: "Learn about us" },
  isPublished: true,
  isHomepage: false,
  publishedAt: new Date("2026-06-01"),
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-06-15"),
};

// ============================================================
// list
// ============================================================

describe("pagesRouter.list", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns paginated results with items, total, page, limit", async () => {
    const caller = createCaller(db);

    // Items query: select({...}).from(pages).orderBy(...).limit(limit).offset(offset)
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([samplePage] as never);

    // Count query: select({ count: count() }).from(pages) — from() is last
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockResolvedValueOnce([{ count: 42 }] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result).toEqual({
      items: [samplePage],
      total: 42,
      page: 1,
      limit: 20,
    });
  });

  it("returns correct offset for page > 1", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([samplePage] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockResolvedValueOnce([{ count: 100 }] as never);

    const result = await caller.list({ page: 3, limit: 10 });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
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
    vi.mocked(db.offset).mockResolvedValueOnce([samplePage] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockRejectedValueOnce(new Error("Count failed"));

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result.items).toEqual([samplePage]);
    expect(result.total).toBe(0);
  });
});

// ============================================================
// getById
// ============================================================

describe("pagesRouter.getById", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns page when found", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([samplePage] as never);

    const result = await caller.getById({ id: "00000000-0000-0000-0000-000000000001" });

    expect(result).toEqual(samplePage);
  });

  it("throws NOT_FOUND when page does not exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(
      caller.getById({ id: "00000000-0000-0000-0000-000000000099" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ============================================================
// getBySlug
// ============================================================

describe("pagesRouter.getBySlug", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns page when found by slug", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([samplePage] as never);

    const result = await caller.getBySlug({ slug: "about-us" });

    expect(result).toEqual(samplePage);
  });

  it("throws NOT_FOUND when slug does not exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.getBySlug({ slug: "non-existent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ============================================================
// create
// ============================================================

describe("pagesRouter.create", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const validInput = {
    templateId: "template-hero",
    slug: "new-page",
    title: "New Page",
    content: { hero: { heading: "Hello" } },
    seo: { title: "New", description: "A new page" },
    isPublished: true,
    isHomepage: false,
  };

  it("creates page successfully with valid input", async () => {
    const caller = createCaller(db);

    // Slug uniqueness check: select({ id }).from(pages).where(eq(pages.slug, ...)).limit(1)
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    // Insert: insert(pages).values(input).returning()
    const created = { id: "00000000-0000-0000-0000-000000000050", ...validInput };
    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([created] as never);

    const result = await caller.create(validInput);

    expect(result).toEqual(created);
  });

  it("throws CONFLICT when slug already exists", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "00000000-0000-0000-0000-000000000001" },
    ] as never);

    await expect(caller.create(validInput)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

// ============================================================
// update
// ============================================================

describe("pagesRouter.update", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const pageId = "00000000-0000-0000-0000-000000000001";

  it("throws NOT_FOUND when page does not exist", async () => {
    const caller = createCaller(db);

    // Existence check: select({ id }).from(pages).where(eq(pages.id, id)).limit(1)
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.update({ id: pageId, title: "New Title" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("updates page fields successfully", async () => {
    const caller = createCaller(db);

    // Existence check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: pageId }] as never);

    // Update: update(pages).set(data).where(eq(pages.id, id)).returning()
    const updated = { id: pageId, title: "Updated Title", slug: "about-us" };
    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([updated] as never);

    const result = await caller.update({ id: pageId, title: "Updated Title" });

    expect(result).toEqual(updated);
  });

  it("throws CONFLICT when slug is already taken by a different page", async () => {
    const caller = createCaller(db);

    // Existence check: page exists
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: pageId }] as never);

    // Slug conflict check: select({ id }).from(pages).where(eq(pages.slug, ...)).limit(1)
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "00000000-0000-0000-0000-000000000099" },
    ] as never);

    await expect(caller.update({ id: pageId, slug: "taken-slug" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

// ============================================================
// delete
// ============================================================

describe("pagesRouter.delete", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const pageId = "00000000-0000-0000-0000-000000000001";

  it("throws NOT_FOUND when page does not exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.delete({ id: pageId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes page and returns success", async () => {
    const caller = createCaller(db);

    // Existence check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: pageId }] as never);

    // Delete: delete(pages).where(eq(pages.id, id))
    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.delete({ id: pageId });

    expect(result).toEqual({ success: true });
  });
});
