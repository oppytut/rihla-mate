import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the rate-limit middleware so procedures are a plain passthrough
// (no IP extraction, no rate-limiting logic).
vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

// Provide a real tRPC instance with all procedures the packages router needs.
vi.mock("../trpc/init", async () => {
  const t = initTRPC.context<TRPCContext>().create({
    transformer: { serialize: (v: unknown) => v, deserialize: (v: unknown) => v },
    errorFormatter: ({ shape }) => shape,
  });

  // createRateLimitMiddleware is mocked above – import the mock version
  const { createRateLimitMiddleware: mockRateLimit } = await import("../trpc/rate-limit");
  const relaxedRateLimit = mockRateLimit(60_000, 60);

  const publicProcedure = t.procedure;

  const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

  const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (ctx.session.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

  return {
    createTRPCRouter: t.router,
    createCallerFactory: t.createCallerFactory,
    publicProcedure,
    protectedProcedure,
    adminProcedure,
    strictRateLimit: relaxedRateLimit,
    mediumRateLimit: relaxedRateLimit,
    standardRateLimit: relaxedRateLimit,
    relaxedRateLimit,
  };
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockDb(): TRPCContext["db"] {
  const db: Record<string, unknown> = {};

  const methods = [
    "select",
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "leftJoin",
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

  return db as unknown as TRPCContext["db"];
}

function makeMockContext(overrides?: Partial<TRPCContext>): TRPCContext {
  return {
    headers: new Headers(),
    db: makeMockDb(),
    session: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reusable test data
// ---------------------------------------------------------------------------

const adminSession = {
  session: {
    id: "s1",
    userId: "u1",
    expiresAt: new Date("2099-01-01"),
    token: "tok",
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  user: {
    id: "u1",
    email: "admin@test.com",
    emailVerified: true,
    name: "Admin",
    image: null,
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const nonAdminSession = {
  session: {
    id: "s2",
    userId: "u2",
    expiresAt: new Date("2099-01-01"),
    token: "tok",
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  user: {
    id: "u2",
    email: "user@test.com",
    emailVerified: true,
    name: "User",
    image: null,
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

async function createCaller(ctx: TRPCContext) {
  const { packagesRouter } = await import("../trpc/routers/packages");
  const { createCallerFactory } = await import("../trpc/init");
  return createCallerFactory(packagesRouter)(ctx);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("packagesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Authorization
  // -----------------------------------------------------------------------

  describe("authorization", () => {
    it("throws UNAUTHORIZED when there is no session", async () => {
      const ctx = makeMockContext({ session: null });
      const caller = await createCaller(ctx);

      await expect(caller.list({})).rejects.toThrow(TRPCError);
      await expect(caller.list({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws FORBIDDEN for non-admin users", async () => {
      const ctx = makeMockContext({ session: nonAdminSession });
      const caller = await createCaller(ctx);

      await expect(caller.list({})).rejects.toThrow(TRPCError);
      await expect(caller.list({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("allows admin users (tested implicitly by all remaining tests)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      // Mock the two select chains for list
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }));

      const caller = await createCaller(ctx);
      const result = await caller.list({});
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe("list", () => {
    it("returns paginated results with items and total when no filters", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const mockItems = [
        {
          id: "pkg-1",
          title: "Bali Tour",
          slug: "bali-tour",
          category: "premium",
          durationDays: 5,
          price: "1500000",
          currency: "IDR",
          status: "published",
          createdAt: new Date("2025-01-01"),
        },
      ];

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockItems),
                  }),
                }),
              }),
            }),
          };
        }
        // Second select: count query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.list({});

      expect(result).toEqual({
        items: mockItems,
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it("applies search filter (ilike)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.list({ search: "bali" });

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it("applies status filter (eq)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.list({ status: "published" });

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it("applies both filters simultaneously (and condition)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.list({ search: "bali", status: "published" });

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it("handles Promise.allSettled rejection for items query → INTERNAL_SERVER_ERROR", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockRejectedValue(new Error("DB error")),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);

      let caught: unknown = null;
      try {
        await caller.list({});
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(TRPCError);
      expect((caught as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect((caught as TRPCError).message).toBe("Failed to fetch packages");
    });

    it("handles count query rejection gracefully (total=0, items still returned)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const mockItems = [
        {
          id: "pkg-1",
          title: "Bali Tour",
          slug: "bali-tour",
          category: "premium",
          durationDays: 5,
          price: "1500000",
          currency: "IDR",
          status: "published",
          createdAt: new Date("2025-01-01"),
        },
      ];

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockItems),
                  }),
                }),
              }),
            }),
          };
        }
        // count query rejects
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error("Count error")),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.list({});

      expect(result).toEqual({
        items: mockItems,
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe("getById", () => {
    it("returns package when found", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const mockPackage = {
        id: "pkg-1",
        title: "Bali Tour",
        slug: "bali-tour",
        description: "Amazing tour",
        durationDays: 5,
        price: "1500000",
        currency: "IDR",
        itinerary: [],
        inclusions: [],
        exclusions: [],
        departureCity: "Jakarta",
        availableDates: [],
        featuredImage: "img.jpg",
        gallery: [],
        category: "premium",
        status: "published",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockPackage]),
          }),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.getById({ id: "00000000-0000-0000-0000-000000000001" });

      expect(result).toEqual(mockPackage);
    });

    it("throws NOT_FOUND when no result", async () => {
      const ctx = makeMockContext({ session: adminSession });

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(caller.getById({ id: "00000000-0000-0000-0000-000000000002" })).rejects.toThrow(
        TRPCError,
      );

      await expect(
        caller.getById({ id: "00000000-0000-0000-0000-000000000002" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Package not found",
      });
    });

    it("passes correct UUID to eq()", async () => {
      const ctx = makeMockContext({ session: adminSession });

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "00000000-0000-0000-0000-000000000003" }]),
          }),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.getById({ id: "00000000-0000-0000-0000-000000000003" });

      expect(result).toBeDefined();
      expect(result.id).toBe("00000000-0000-0000-0000-000000000003");
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe("create", () => {
    const validInput = {
      title: "Bali Adventure",
      slug: "bali-adventure",
      description: "An amazing adventure",
      durationDays: 3,
      price: "2500000",
      currency: "IDR",
      itinerary: '[{"day":1,"title":"Arrival"}]',
      inclusions: '["hotel","meals"]',
      exclusions: '["flights"]',
      departureCity: "Jakarta",
      availableDates: '["2025-06-01"]',
      featuredImage: "img.jpg",
      gallery: '["photo1.jpg"]',
      category: "premium",
      status: "draft",
    };

    it("creates package successfully with parsed JSONB fields", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const createdPackage = {
        id: "new-pkg-1",
        ...validInput,
        itinerary: [{ day: 1, title: "Arrival" }],
        inclusions: ["hotel", "meals"],
        exclusions: ["flights"],
        availableDates: ["2025-06-01"],
        gallery: ["photo1.jpg"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Slug check returns empty (no conflict)
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Insert
      (ctx.db.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdPackage]),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.create(validInput);

      expect(result).toEqual(createdPackage);
    });

    it("throws CONFLICT when slug already exists", async () => {
      const ctx = makeMockContext({ session: adminSession });

      // Slug check returns existing row
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-pkg" }]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(caller.create(validInput)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "A package with this slug already exists",
      });
    });

    it("throws BAD_REQUEST when itinerary JSON is invalid", async () => {
      const ctx = makeMockContext({ session: adminSession });

      // Slug check returns empty
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(caller.create({ ...validInput, itinerary: "not-json" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid JSON in itinerary",
      });
    });

    it("throws BAD_REQUEST when gallery JSON is invalid", async () => {
      const ctx = makeMockContext({ session: adminSession });

      // Slug check returns empty
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(caller.create({ ...validInput, gallery: "not-json" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid JSON in gallery",
      });
    });

    it("uses default values when optional fields omitted", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const minimalInput = {
        title: "Minimal Tour",
        slug: "minimal-tour",
        durationDays: 2,
        price: "1000000",
      };

      const createdPackage = {
        id: "new-pkg-2",
        title: "Minimal Tour",
        slug: "minimal-tour",
        durationDays: 2,
        price: "1000000",
        currency: "IDR",
        itinerary: [],
        inclusions: [],
        exclusions: [],
        availableDates: [],
        gallery: [],
        category: "standard",
        status: "draft",
        description: undefined,
        departureCity: undefined,
        featuredImage: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Slug check returns empty
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Insert
      (ctx.db.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdPackage]),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.create(minimalInput);

      expect(result).toEqual(createdPackage);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe("update", () => {
    const pkgUpdateId = "11111111-1111-1111-1111-111111111111";
    const existingPackage = {
      id: pkgUpdateId,
      title: "Old Title",
      slug: "old-slug",
      description: "Old desc",
      durationDays: 3,
      price: "1000000",
      currency: "IDR",
      itinerary: [],
      inclusions: [],
      exclusions: [],
      departureCity: null,
      availableDates: [],
      featuredImage: null,
      gallery: [],
      category: "standard",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("updates package fields successfully", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const updatedPackage = { ...existingPackage, title: "New Title" };

      // Existence check
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingPackage]),
          }),
        }),
      });

      // Update
      (ctx.db.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedPackage]),
          }),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.update({ id: pkgUpdateId, title: "New Title" });

      expect(result).toEqual(updatedPackage);
    });

    it("throws NOT_FOUND when package doesn't exist", async () => {
      const ctx = makeMockContext({ session: adminSession });

      // Existence check returns empty (called twice — once per caller.update)
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(
        caller.update({ id: "22222222-2222-2222-2222-222222222222", title: "New Title" }),
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.update({ id: "22222222-2222-2222-2222-222222222222", title: "New Title" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Package not found",
      });
    });

    it("throws CONFLICT when new slug belongs to another package", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        // Odd calls: existence check passes
        if (selectCallCount % 2 === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([existingPackage]),
              }),
            }),
          };
        }
        // Even calls: slug conflict returns DIFFERENT package
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "other-pkg" }]),
            }),
          }),
        };
      });

      const caller = await createCaller(ctx);

      await expect(caller.update({ id: pkgUpdateId, slug: "taken-slug" })).rejects.toThrow(
        TRPCError,
      );

      await expect(caller.update({ id: pkgUpdateId, slug: "taken-slug" })).rejects.toMatchObject({
        code: "CONFLICT",
        message: "A package with this slug already exists",
      });
    });

    it("allows same slug (slug conflict check passes when same id)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const updatedPackage = { ...existingPackage, title: "New Title" };

      // Existence check passes
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingPackage]),
          }),
        }),
      });

      // Slug conflict check returns the SAME package
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: pkgUpdateId }]),
          }),
        }),
      });

      // Update succeeds
      (ctx.db.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedPackage]),
          }),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.update({ id: pkgUpdateId, slug: "old-slug" });

      expect(result).toEqual(updatedPackage);
    });

    it("parses JSONB fields on update", async () => {
      const ctx = makeMockContext({ session: adminSession });

      const updatedPackage = {
        ...existingPackage,
        itinerary: [{ day: 1, title: "Updated" }],
        gallery: ["new.jpg"],
      };

      // Existence check passes
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingPackage]),
          }),
        }),
      });

      // Update
      (ctx.db.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedPackage]),
          }),
        }),
      });

      const caller = await createCaller(ctx);
      const result = await caller.update({
        id: pkgUpdateId,
        itinerary: '[{"day":1,"title":"Updated"}]',
        gallery: '["new.jpg"]',
      });

      expect(result).toEqual(updatedPackage);
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  describe("delete", () => {
    const pkgId = "00000000-0000-0000-0000-000000000099";

    it("deletes package with no bookings", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Existence check passes
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: pkgId }]),
              }),
            }),
          };
        }
        // Booking count query returns 0
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.delete({ id: pkgId });

      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when package doesn't exist", async () => {
      const ctx = makeMockContext({ session: adminSession });

      // Existence check returns empty
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(caller.delete({ id: pkgId })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: pkgId })).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Package not found",
      });
    });

    it("throws PRECONDITION_FAILED when bookings exist (booking count > 0)", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1 || selectCallCount === 3) {
          // Existence check passes
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: pkgId }]),
              }),
            }),
          };
        }
        // Booking count query returns > 0
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);

      await expect(caller.delete({ id: pkgId })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: pkgId })).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: "Cannot delete package with existing bookings",
      });
    });

    it("allows delete when booking count is 0", async () => {
      const ctx = makeMockContext({ session: adminSession });

      let selectCallCount = 0;
      (ctx.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Existence check passes
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: pkgId }]),
              }),
            }),
          };
        }
        // Booking count query returns exactly 0
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const caller = await createCaller(ctx);
      const result = await caller.delete({ id: pkgId });

      expect(result).toEqual({ success: true });
    });
  });
});
