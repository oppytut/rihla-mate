import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — variables shared between vi.mock factories and test code
// ---------------------------------------------------------------------------
const {
  mockRouterPush,
  mockToastSuccess,
  mockToastError,
  mockSlugify,
  mockValidatePackage,
  mockCn,
  mockUseMutation,
  mockTRPCCreateMutationOptions,
  mockTRPCUpdateMutationOptions,
} = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockSlugify: vi.fn(),
  mockValidatePackage: vi.fn(),
  mockCn: vi.fn(),
  mockUseMutation: vi.fn(),
  mockTRPCCreateMutationOptions: vi.fn((opts: Record<string, unknown>) => ({
    mutationKey: ["packages.create"],
    mutationFn: vi.fn(),
    ...opts,
  })),
  mockTRPCUpdateMutationOptions: vi.fn((opts: Record<string, unknown>) => ({
    mutationKey: ["packages.update"],
    mutationFn: vi.fn(),
    ...opts,
  })),
}));

// ---------------------------------------------------------------------------
// Mock next-intl
// ---------------------------------------------------------------------------
vi.mock("next-intl", () => ({
  useTranslations: () => {
    return (key: string) => {
      const map: Record<string, string> = {
        "packages.editTitle": "Edit Package",
        "packages.createTitle": "Create Package",
        "common.appName": "Rihla Mate",
        "packages.backToList": "Back to list",
        "packages.fields.section.basic": "Basic Info",
        "packages.fields.title": "Title",
        "packages.fields.slug": "Slug",
        "packages.fields.description": "Description",
        "packages.fields.category": "Category",
        "packages.fields.durationDays": "Duration (days)",
        "packages.fields.departureCity": "Departure City",
        "packages.fields.status": "Status",
        "packages.fields.section.pricing": "Pricing",
        "packages.fields.price": "Price",
        "packages.fields.currency": "Currency",
        "packages.fields.section.media": "Media",
        "packages.fields.featuredImage": "Featured Image",
        "packages.fields.gallery": "Gallery",
        "packages.fields.section.content": "Content",
        "packages.fields.itinerary": "Itinerary",
        "packages.fields.inclusions": "Inclusions",
        "packages.fields.exclusions": "Exclusions",
        "packages.fields.availableDates": "Available Dates",
        "packages.category.standard": "Standard",
        "packages.category.premium": "Premium",
        "packages.category.vip": "VIP",
        "packages.category.economy": "Economy",
        "packages.status.draft": "Draft",
        "packages.status.published": "Published",
        "packages.status.archived": "Archived",
        "packages.save": "Save",
        "packages.saving": "Saving...",
        "packages.createSuccess": "Package created successfully",
        "packages.updateSuccess": "Package updated successfully",
        "packages.validation.titleRequired": "Title is required",
        "packages.validation.slugRequired": "Slug is required",
        "packages.validation.priceRequired": "Price is required",
        "packages.validation.durationMin": "Duration must be at least 1 day",
        "packages.invalidJson": "Invalid JSON",
        "common.error": "An error occurred",
      };
      return map[key] ?? key;
    };
  },
}));

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock next/link
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    "data-testid"?: string;
  }) => (
    <a href={href} data-testid={props["data-testid"]}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock sonner toast
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/utils/slug
// ---------------------------------------------------------------------------
vi.mock("@/lib/utils/slug", () => ({
  slugify: mockSlugify,
}));

// ---------------------------------------------------------------------------
// Mock @/lib/utils/validation
// ---------------------------------------------------------------------------
vi.mock("@/lib/utils/validation", () => ({
  validatePackage: mockValidatePackage,
}));

// ---------------------------------------------------------------------------
// Mock @/lib/utils (cn)
// ---------------------------------------------------------------------------
vi.mock("@/lib/utils", () => ({
  cn: mockCn,
}));

// ---------------------------------------------------------------------------
// Mock @tanstack/react-query
// ---------------------------------------------------------------------------
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useMutation: mockUseMutation,
  };
});

// ---------------------------------------------------------------------------
// Mock tRPC
// ---------------------------------------------------------------------------
vi.mock("@/lib/trpc/react", () => ({
  useTRPC: () => ({
    packages: {
      create: {
        mutationOptions: mockTRPCCreateMutationOptions,
      },
      update: {
        mutationOptions: mockTRPCUpdateMutationOptions,
      },
    },
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after all mocks are hoisted)
// ---------------------------------------------------------------------------
import { PackageFormContent, type PackageForm } from "../package-form";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
  };
}

const validFormData: PackageForm = {
  title: "Bali Adventure",
  slug: "bali-adventure",
  description: "Amazing Bali trip",
  category: "premium",
  durationDays: 3,
  price: "1500000",
  currency: "IDR",
  departureCity: "Jakarta",
  status: "published",
  featuredImage: "https://example.com/img.jpg",
  itinerary: '[{"day":1,"description":"Arrive in Bali"}]',
  inclusions: '["Hotel","Transport"]',
  exclusions: '["Flight tickets"]',
  availableDates: '["2026-08-01","2026-08-15"]',
  gallery: '["https://example.com/g1.jpg"]',
};

function renderCreateMode() {
  return render(<PackageFormContent initialData={null} isEditMode={false} packageId="" />);
}

function renderEditMode(overrides?: Partial<PackageForm>) {
  return render(
    <PackageFormContent
      initialData={{ ...validFormData, ...overrides }}
      isEditMode={true}
      packageId="00000000-0000-0000-0000-000000000001"
    />,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("package-title"), validFormData.title);
  await user.clear(screen.getByTestId("package-slug"));
  await user.type(screen.getByTestId("package-slug"), validFormData.slug);
  await user.type(screen.getByTestId("package-price"), validFormData.price);
  fireEvent.change(screen.getByTestId("package-itinerary"), {
    target: { value: validFormData.itinerary },
  });
  fireEvent.change(screen.getByTestId("package-inclusions"), {
    target: { value: validFormData.inclusions },
  });
  fireEvent.change(screen.getByTestId("package-exclusions"), {
    target: { value: validFormData.exclusions },
  });
  fireEvent.change(screen.getByTestId("package-available-dates"), {
    target: { value: validFormData.availableDates },
  });
  fireEvent.change(screen.getByTestId("package-gallery"), {
    target: { value: validFormData.gallery },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PackageFormContent - render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockImplementation(() => defaultMutation());
    mockValidatePackage.mockReturnValue({ valid: true, errors: {} });
    mockSlugify.mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, "-"));
    mockCn.mockImplementation((...args: unknown[]) => args.filter(Boolean).join(" "));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all form fields in create mode", () => {
    renderCreateMode();

    expect(screen.getByTestId("page-heading")).toHaveTextContent("Create Package");
    expect(screen.getByTestId("package-title")).toBeInTheDocument();
    expect(screen.getByTestId("package-slug")).toBeInTheDocument();
    expect(screen.getByTestId("package-description")).toBeInTheDocument();
    expect(screen.getByTestId("package-category")).toBeInTheDocument();
    expect(screen.getByTestId("package-duration-days")).toBeInTheDocument();
    expect(screen.getByTestId("package-departure-city")).toBeInTheDocument();
    expect(screen.getByTestId("package-status")).toBeInTheDocument();
    expect(screen.getByTestId("package-price")).toBeInTheDocument();
    expect(screen.getByTestId("package-currency")).toBeInTheDocument();
    expect(screen.getByTestId("package-featured-image")).toBeInTheDocument();
    expect(screen.getByTestId("package-gallery")).toBeInTheDocument();
    expect(screen.getByTestId("package-itinerary")).toBeInTheDocument();
    expect(screen.getByTestId("package-inclusions")).toBeInTheDocument();
    expect(screen.getByTestId("package-exclusions")).toBeInTheDocument();
    expect(screen.getByTestId("package-available-dates")).toBeInTheDocument();
    expect(screen.getByTestId("package-submit")).toBeInTheDocument();
    expect(screen.getByTestId("package-cancel")).toBeInTheDocument();
  });

  it("renders edit mode heading and pre-fills fields", () => {
    renderEditMode();

    expect(screen.getByTestId("page-heading")).toHaveTextContent("Edit Package");
    expect(screen.getByTestId("package-title")).toHaveValue("Bali Adventure");
    expect(screen.getByTestId("package-slug")).toHaveValue("bali-adventure");
    expect(screen.getByTestId("package-description")).toHaveValue("Amazing Bali trip");
    expect(screen.getByTestId("package-category")).toHaveValue("premium");
    expect(screen.getByTestId("package-duration-days")).toHaveValue(3);
    expect(screen.getByTestId("package-departure-city")).toHaveValue("Jakarta");
    expect(screen.getByTestId("package-status")).toHaveValue("published");
    expect(screen.getByTestId("package-price")).toHaveValue("1500000");
    expect(screen.getByTestId("package-currency")).toHaveValue("IDR");
    expect(screen.getByTestId("package-featured-image")).toHaveValue("https://example.com/img.jpg");
  });

  it("uses default values when no initialData and not in edit mode", () => {
    renderCreateMode();

    expect(screen.getByTestId("package-category")).toHaveValue("standard");
    expect(screen.getByTestId("package-duration-days")).toHaveValue(1);
    expect(screen.getByTestId("package-currency")).toHaveValue("IDR");
    expect(screen.getByTestId("package-status")).toHaveValue("draft");
  });

  it("auto-generates slug from title in create mode", async () => {
    const user = userEvent.setup();
    renderCreateMode();

    const titleInput = screen.getByTestId("package-title");
    const slugInput = screen.getByTestId("package-slug");

    await user.type(titleInput, "Lombok Escape");

    expect(slugInput).toHaveValue("lombok-escape");
  });
});

describe("PackageFormContent - validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockImplementation(() => defaultMutation());
    mockSlugify.mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, "-"));
    mockCn.mockImplementation((...args: unknown[]) => args.filter(Boolean).join(" "));
  });

  afterEach(() => {
    cleanup();
  });

  it("shows validation errors when submitting empty form", async () => {
    mockValidatePackage.mockReturnValue({
      valid: false,
      errors: {
        title: "Title is required",
        slug: "Slug is required",
        price: "Price is required",
        durationDays: "Duration must be at least 1 day",
      },
    });

    const user = userEvent.setup();
    renderCreateMode();

    await user.click(screen.getByTestId("package-submit"));

    expect(screen.getByTestId("validation-error-title")).toHaveTextContent("Title is required");
    expect(screen.getByTestId("validation-error-slug")).toHaveTextContent("Slug is required");
    expect(screen.getByTestId("validation-error-price")).toHaveTextContent("Price is required");
    expect(screen.getByTestId("validation-error-durationDays")).toHaveTextContent(
      "Duration must be at least 1 day",
    );
  });

  it("shows validation error for invalid JSON fields", async () => {
    mockValidatePackage.mockReturnValue({
      valid: false,
      errors: {
        itinerary: "Invalid JSON",
        gallery: "Invalid JSON",
      },
    });

    const user = userEvent.setup();
    renderCreateMode();

    await user.type(screen.getByTestId("package-title"), "Test Package");
    await user.type(screen.getByTestId("package-slug"), "test-package");
    await user.type(screen.getByTestId("package-price"), "1000000");
    fireEvent.change(screen.getByTestId("package-itinerary"), {
      target: { value: "{invalid" },
    });
    fireEvent.change(screen.getByTestId("package-gallery"), {
      target: { value: "not-json" },
    });

    await user.click(screen.getByTestId("package-submit"));

    expect(screen.getByTestId("validation-error-itinerary")).toHaveTextContent("Invalid JSON");
    expect(screen.getByTestId("validation-error-gallery")).toHaveTextContent("Invalid JSON");
  });
});

describe("PackageFormContent - submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatePackage.mockReturnValue({ valid: true, errors: {} });
    mockSlugify.mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, "-"));
    mockCn.mockImplementation((...args: unknown[]) => args.filter(Boolean).join(" "));
  });

  afterEach(() => {
    cleanup();
  });

  it("calls createMutation.mutate with form data on submit in create mode", async () => {
    const createMutateSpy = vi.fn();
    mockUseMutation.mockImplementation((opts: { mutationKey?: string[] }) => {
      if (opts.mutationKey?.[0] === "packages.create") {
        return { ...defaultMutation(), mutate: createMutateSpy };
      }
      return defaultMutation();
    });

    const user = userEvent.setup();
    renderCreateMode();

    await fillValidForm(user);
    await user.click(screen.getByTestId("package-submit"));

    expect(createMutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: validFormData.title,
        slug: validFormData.slug,
        price: validFormData.price,
        currency: "IDR",
        status: "draft",
        category: "standard",
        durationDays: 1,
      }),
    );
  });

  it("calls updateMutation.mutate with form data and id in edit mode", async () => {
    const updateMutateSpy = vi.fn();
    mockUseMutation.mockImplementation((opts: { mutationKey?: string[] }) => {
      if (opts.mutationKey?.[0] === "packages.update") {
        return { ...defaultMutation(), mutate: updateMutateSpy };
      }
      return defaultMutation();
    });

    const user = userEvent.setup();
    renderEditMode();

    await user.click(screen.getByTestId("package-submit"));

    expect(updateMutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "00000000-0000-0000-0000-000000000001",
        title: validFormData.title,
        slug: validFormData.slug,
        price: validFormData.price,
      }),
    );
  });

  it("redirects to dashboard on create success", async () => {
    let capturedOnSuccess: (() => void) | undefined;
    const mutateSpy = vi.fn();
    mockUseMutation.mockImplementation(
      (opts: { onSuccess?: () => void; mutationKey?: string[] }) => {
        if (opts.mutationKey?.[0] === "packages.create") {
          capturedOnSuccess = opts.onSuccess;
          return { ...defaultMutation(), mutate: mutateSpy };
        }
        return defaultMutation();
      },
    );

    const user = userEvent.setup();
    renderCreateMode();

    await fillValidForm(user);
    await user.click(screen.getByTestId("package-submit"));

    capturedOnSuccess?.();

    expect(mockToastSuccess).toHaveBeenCalledWith("Package created successfully");
    expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/packages");
  });

  it("redirects to dashboard on update success", async () => {
    let capturedOnSuccess: (() => void) | undefined;
    mockUseMutation.mockImplementation(
      (opts: { onSuccess?: () => void; mutationKey?: string[] }) => {
        if (opts.mutationKey?.[0] === "packages.update") {
          capturedOnSuccess = opts.onSuccess;
          return { ...defaultMutation(), mutate: vi.fn() };
        }
        return defaultMutation();
      },
    );

    const user = userEvent.setup();
    renderEditMode();

    await user.click(screen.getByTestId("package-submit"));

    capturedOnSuccess?.();

    expect(mockToastSuccess).toHaveBeenCalledWith("Package updated successfully");
    expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/packages");
  });

  it("shows server error when create mutation fails", async () => {
    let capturedOnError: ((error: Error) => void) | undefined;
    mockUseMutation.mockImplementation(
      (opts: { onError?: (error: Error) => void; mutationKey?: string[] }) => {
        if (opts.mutationKey?.[0] === "packages.create") {
          capturedOnError = opts.onError;
          return { ...defaultMutation(), mutate: vi.fn() };
        }
        return defaultMutation();
      },
    );

    const user = userEvent.setup();
    renderCreateMode();

    await fillValidForm(user);
    await user.click(screen.getByTestId("package-submit"));

    capturedOnError?.(new Error("Server validation failed"));

    await waitFor(() => {
      expect(screen.getByText("Server validation failed")).toBeInTheDocument();
    });
  });

  it("shows fallback error message when mutation error has no message", async () => {
    let capturedOnError: ((error: Error) => void) | undefined;
    mockUseMutation.mockImplementation(
      (opts: { onError?: (error: Error) => void; mutationKey?: string[] }) => {
        if (opts.mutationKey?.[0] === "packages.create") {
          capturedOnError = opts.onError;
          return { ...defaultMutation(), mutate: vi.fn() };
        }
        return defaultMutation();
      },
    );

    const user = userEvent.setup();
    renderCreateMode();

    await fillValidForm(user);
    await user.click(screen.getByTestId("package-submit"));

    capturedOnError?.(new Error(""));

    await waitFor(() => {
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });
});

describe("PackageFormContent - loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatePackage.mockReturnValue({ valid: true, errors: {} });
    mockSlugify.mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, "-"));
    mockCn.mockImplementation((...args: unknown[]) => args.filter(Boolean).join(" "));
  });

  afterEach(() => {
    cleanup();
  });

  it("disables submit button and shows saving text when submitting", () => {
    mockUseMutation.mockImplementation(() => ({
      ...defaultMutation(),
      isPending: true,
      mutate: vi.fn(),
    }));

    renderCreateMode();

    const submitBtn = screen.getByTestId("package-submit");
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Saving...");
  });

  it("disables form fields when submitting", () => {
    mockUseMutation.mockImplementation(() => ({
      ...defaultMutation(),
      isPending: true,
      mutate: vi.fn(),
    }));

    renderCreateMode();

    expect(screen.getByTestId("package-title")).toBeDisabled();
    expect(screen.getByTestId("package-slug")).toBeDisabled();
    expect(screen.getByTestId("package-price")).toBeDisabled();
    expect(screen.getByTestId("package-description")).toBeDisabled();
    expect(screen.getByTestId("package-category")).toBeDisabled();
    expect(screen.getByTestId("package-duration-days")).toBeDisabled();
    expect(screen.getByTestId("package-cancel")).toBeDisabled();
  });
});
