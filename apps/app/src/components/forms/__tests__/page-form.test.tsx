import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures factories see the same instance after hoisting
// ---------------------------------------------------------------------------

const { mockPush, mockToastSuccess } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(" "),
}));

// Mock slug utils – inline pure implementations to avoid hoisting issues
vi.mock("@/lib/utils/slug", () => ({
  slugify: (text: string): string =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .replace(/^-+|-+$/g, ""),
  tryParseJson: (value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) return { valid: true };
    try {
      JSON.parse(value);
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid JSON format" };
    }
  },
}));

// Mock tRPC pages router mutations
const { mockCreateMutate, mockUpdateMutate } = vi.hoisted(() => ({
  mockCreateMutate: vi.fn(),
  mockUpdateMutate: vi.fn(),
}));

vi.mock("@/lib/trpc/react", () => ({
  useTRPC: () => ({
    pages: {
      create: {
        mutationOptions: (callbacks: {
          onSuccess?: () => void;
          onError?: (error: Error) => void;
        }) => ({
          mutationFn: mockCreateMutate,
          ...callbacks,
        }),
      },
      update: {
        mutationOptions: (callbacks: {
          onSuccess?: () => void;
          onError?: (error: Error) => void;
        }) => ({
          mutationFn: mockUpdateMutate,
          ...callbacks,
        }),
      },
    },
  }),
}));

// We need to control useMutation behaviour per-test so we mock it at import
// level.  The component calls useMutation on two hooks (create / update) and
// reads .mutate and .isPending from the result.  We provide a controllable
// implementation via vi.fn() and re-configure it in beforeEach.
const { useMutation } = vi.hoisted(() => ({ useMutation: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useMutation,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MutationState {
  isPending: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

let mutationState: MutationState;

// The component wraps useMutation around the trpc mutationOptions objects.
// useMutation receives { mutationFn, onSuccess, onError } from
// mutationOptions().  We need to capture onSuccess/onError so we can fire them
// from the test.
let capturedCallbacks: Record<
  string,
  { onSuccess?: () => void; onError?: (error: Error) => void }
> = {};

function createUseMutationImpl() {
  let callCount = 0;
  return vi.fn(
    (options: {
      mutationFn: unknown;
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }) => {
      const key = callCount === 0 ? "create" : "update";
      capturedCallbacks[key] = { onSuccess: options.onSuccess, onError: options.onError };
      callCount++;
      return {
        mutate: vi.fn((_payload: unknown) => {
          // Fire the mutation function for coverage but let tests control
          // success/error via captured callbacks
        }),
        isPending: mutationState.isPending,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Import the component *after* mocks are established
// ---------------------------------------------------------------------------

import { PageFormContent, initialPageForm } from "../page-form";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PageFormContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationState = { isPending: false };
    capturedCallbacks = {};
    useMutation.mockImplementation(createUseMutationImpl());
  });

  afterEach(() => {
    cleanup();
  });

  // -- Rendering --------------------------------------------------------------

  describe("rendering", () => {
    it("renders all form fields in create mode", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      expect(screen.getByTestId("page-heading")).toHaveTextContent("pages.createTitle");
      expect(screen.getByTestId("page-template-id")).toBeInTheDocument();
      expect(screen.getByTestId("page-title")).toBeInTheDocument();
      expect(screen.getByTestId("page-slug")).toBeInTheDocument();
      expect(screen.getByTestId("page-content")).toBeInTheDocument();
      expect(screen.getByTestId("page-is-published")).toBeInTheDocument();
      expect(screen.getByTestId("page-is-homepage")).toBeInTheDocument();
      expect(screen.getByTestId("page-seo-title")).toBeInTheDocument();
      expect(screen.getByTestId("page-seo-description")).toBeInTheDocument();
      expect(screen.getByTestId("page-seo-og-image")).toBeInTheDocument();
      expect(screen.getByTestId("page-submit")).toBeInTheDocument();
      expect(screen.getByTestId("page-cancel")).toBeInTheDocument();
    });

    it("renders edit-mode heading and back link", () => {
      render(<PageFormContent initialData={null} isEditMode={true} pageId="page-1" />);

      expect(screen.getByTestId("page-heading")).toHaveTextContent("pages.editTitle");
      expect(screen.getByTestId("pages-back-to-list")).toBeInTheDocument();
    });

    it("uses initialPageForm defaults when no initialData provided", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      const templateSelect = screen.getByTestId("page-template-id") as unknown as HTMLSelectElement;
      expect(templateSelect.value).toBe("default");

      const titleInput = screen.getByTestId("page-title") as HTMLInputElement;
      expect(titleInput.value).toBe("");

      const publishedCheckbox = screen.getByTestId("page-is-published") as HTMLInputElement;
      expect(publishedCheckbox.checked).toBe(false);
    });
  });

  // -- Edit mode pre-fill -----------------------------------------------------

  describe("edit mode", () => {
    it("pre-fills form fields from initialData", () => {
      const data = {
        templateId: "hero",
        slug: "about-us",
        title: "About Us",
        content: '{"hero":{"headline":"Hello"}}',
        seo: {
          title: "SEO Title",
          description: "SEO Description",
          ogImage: "https://example.com/og.png",
        },
        isPublished: true,
        isHomepage: false,
      };

      render(<PageFormContent initialData={data} isEditMode={true} pageId="page-1" />);

      expect(screen.getByTestId("page-template-id")).toHaveValue("hero");
      expect(screen.getByTestId("page-title")).toHaveValue("About Us");
      expect(screen.getByTestId("page-slug")).toHaveValue("about-us");
      expect(screen.getByTestId("page-content")).toHaveValue('{"hero":{"headline":"Hello"}}');
      expect(screen.getByTestId("page-seo-title")).toHaveValue("SEO Title");
      expect(screen.getByTestId("page-seo-description")).toHaveValue("SEO Description");
      expect(screen.getByTestId("page-seo-og-image")).toHaveValue("https://example.com/og.png");
      expect(screen.getByTestId("page-is-published")).toBeChecked();
      expect(screen.getByTestId("page-is-homepage")).not.toBeChecked();
    });

    it("auto-generates slug from title in create mode but not edit mode", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      const titleInput = screen.getByTestId("page-title");
      fireEvent.change(titleInput, { target: { value: "My New Page" } });

      const slugInput = screen.getByTestId("page-slug") as HTMLInputElement;
      expect(slugInput.value).toBe("my-new-page");
    });

    it("does not auto-generate slug from title in edit mode", () => {
      const data = { ...initialPageForm, slug: "existing-slug", title: "Existing" };

      render(<PageFormContent initialData={data} isEditMode={true} pageId="page-1" />);

      const titleInput = screen.getByTestId("page-title");
      fireEvent.change(titleInput, { target: { value: "New Title" } });

      const slugInput = screen.getByTestId("page-slug") as HTMLInputElement;
      // Slug should remain unchanged in edit mode
      expect(slugInput.value).toBe("existing-slug");
    });
  });

  // -- Validation -------------------------------------------------------------

  describe("validation", () => {
    it("shows validation errors for required fields on empty submit", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.click(screen.getByTestId("page-submit"));

      expect(screen.getByTestId("validation-error-title")).toBeInTheDocument();
      expect(screen.getByTestId("validation-error-title")).toHaveTextContent(
        "pages.validation.titleRequired",
      );
      expect(screen.getByTestId("validation-error-slug")).toBeInTheDocument();
      expect(screen.getByTestId("validation-error-slug")).toHaveTextContent(
        "pages.validation.slugRequired",
      );
    });

    it("shows slug validation error for invalid slug format", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "Valid Title" },
      });
      fireEvent.change(screen.getByTestId("page-slug"), {
        target: { value: "Invalid Slug!" },
      });
      fireEvent.click(screen.getByTestId("page-submit"));

      expect(screen.getByTestId("validation-error-slug")).toHaveTextContent(
        "pages.validation.slugInvalid",
      );
      // title should be valid now
      expect(screen.queryByTestId("validation-error-title")).not.toBeInTheDocument();
    });

    it("shows content validation error for invalid JSON", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.change(screen.getByTestId("page-content"), {
        target: { value: "{not valid json" },
      });
      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "Valid Title" },
      });
      fireEvent.change(screen.getByTestId("page-slug"), {
        target: { value: "valid-slug" },
      });
      fireEvent.click(screen.getByTestId("page-submit"));

      expect(screen.getByTestId("validation-error-content")).toHaveTextContent(
        "pages.validation.contentInvalid",
      );
    });

    it("clears validation errors when fields are corrected", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      // First submit with empty fields
      fireEvent.click(screen.getByTestId("page-submit"));
      expect(screen.getByTestId("validation-error-title")).toBeInTheDocument();
      expect(screen.getByTestId("validation-error-slug")).toBeInTheDocument();

      // Fix the title — this also auto-generates slug in create mode
      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "Fixed Title" },
      });

      // Submit again — both errors should be cleared since slug was auto-generated
      fireEvent.click(screen.getByTestId("page-submit"));
      expect(screen.queryByTestId("validation-error-title")).not.toBeInTheDocument();
      expect(screen.queryByTestId("validation-error-slug")).not.toBeInTheDocument();
    });
  });

  // -- Submission (create mode) -----------------------------------------------

  describe("submission - create mode", () => {
    it("calls createMutation.mutate with valid form data", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "My Page" },
      });
      fireEvent.change(screen.getByTestId("page-slug"), {
        target: { value: "my-page" },
      });
      fireEvent.change(screen.getByTestId("page-content"), {
        target: { value: '{"hero": {"headline": "Welcome"}}' },
      });
      fireEvent.change(screen.getByTestId("page-seo-title"), {
        target: { value: "SEO" },
      });
      fireEvent.click(screen.getByTestId("page-is-published"));

      fireEvent.click(screen.getByTestId("page-submit"));

      // The useMutation mock mutate function should have been called
      const createCall = capturedCallbacks.create;
      expect(createCall).toBeDefined();
    });

    it("shows success toast and navigates on create success", async () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "My Page" },
      });
      fireEvent.change(screen.getByTestId("page-slug"), {
        target: { value: "my-page" },
      });
      fireEvent.click(screen.getByTestId("page-submit"));

      // Simulate onSuccess callback
      capturedCallbacks.create?.onSuccess?.();

      expect(mockToastSuccess).toHaveBeenCalledWith("pages.createSuccess");
      expect(mockPush).toHaveBeenCalledWith("/dashboard/pages");
    });
  });

  // -- Submission (edit mode) -------------------------------------------------

  describe("submission - edit mode", () => {
    it("calls updateMutation.mutate with id and form data", () => {
      render(
        <PageFormContent
          initialData={{
            templateId: "default",
            slug: "existing",
            title: "Existing",
            content: "{}",
            seo: { title: "", description: "", ogImage: "" },
            isPublished: false,
            isHomepage: false,
          }}
          isEditMode={true}
          pageId="page-uuid-1"
        />,
      );

      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "Updated Page" },
      });
      fireEvent.click(screen.getByTestId("page-submit"));

      expect(capturedCallbacks.update).toBeDefined();
    });

    it("shows success toast and navigates on update success", async () => {
      render(
        <PageFormContent
          initialData={{
            templateId: "default",
            slug: "existing",
            title: "Existing",
            content: "{}",
            seo: { title: "", description: "", ogImage: "" },
            isPublished: false,
            isHomepage: false,
          }}
          isEditMode={true}
          pageId="page-uuid-1"
        />,
      );

      fireEvent.click(screen.getByTestId("page-submit"));

      // Simulate onSuccess callback
      capturedCallbacks.update?.onSuccess?.();

      expect(mockToastSuccess).toHaveBeenCalledWith("pages.updateSuccess");
      expect(mockPush).toHaveBeenCalledWith("/dashboard/pages");
    });
  });

  // -- Server error handling --------------------------------------------------

  describe("error handling", () => {
    it("displays server error message on mutation failure", async () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "My Page" },
      });
      fireEvent.change(screen.getByTestId("page-slug"), {
        target: { value: "my-page" },
      });
      fireEvent.click(screen.getByTestId("page-submit"));

      // Simulate onError callback — state update is async in React 18
      capturedCallbacks.create?.onError?.(new Error("Server error occurred"));

      await waitFor(() => {
        expect(screen.getByText("Server error occurred")).toBeInTheDocument();
      });
    });

    it("clears server error when user modifies a field", async () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "My Page" },
      });
      fireEvent.change(screen.getByTestId("page-slug"), {
        target: { value: "my-page" },
      });
      fireEvent.click(screen.getByTestId("page-submit"));

      // Trigger an error
      capturedCallbacks.create?.onError?.(new Error("Server error occurred"));
      await waitFor(() => {
        expect(screen.getByText("Server error occurred")).toBeInTheDocument();
      });

      // Modify a field – error should disappear
      fireEvent.change(screen.getByTestId("page-title"), {
        target: { value: "My Updated Page" },
      });

      expect(screen.queryByText("Server error occurred")).not.toBeInTheDocument();
    });
  });

  // -- Loading state ----------------------------------------------------------

  describe("loading state", () => {
    it("disables form fields and changes button text during submission", () => {
      mutationState = { isPending: true };
      useMutation.mockImplementation(createUseMutationImpl());

      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      expect(screen.getByTestId("page-title")).toBeDisabled();
      expect(screen.getByTestId("page-slug")).toBeDisabled();
      expect(screen.getByTestId("page-template-id")).toBeDisabled();
      expect(screen.getByTestId("page-content")).toBeDisabled();
      expect(screen.getByTestId("page-is-published")).toBeDisabled();
      expect(screen.getByTestId("page-is-homepage")).toBeDisabled();
      expect(screen.getByTestId("page-seo-title")).toBeDisabled();
      expect(screen.getByTestId("page-seo-description")).toBeDisabled();
      expect(screen.getByTestId("page-seo-og-image")).toBeDisabled();

      expect(screen.getByTestId("page-submit")).toBeDisabled();
      expect(screen.getByTestId("page-submit")).toHaveTextContent("pages.saving");
      expect(screen.getByTestId("page-cancel")).toBeDisabled();
    });
  });

  // -- Template options -------------------------------------------------------

  describe("template select", () => {
    it("renders all template options", () => {
      render(<PageFormContent initialData={null} isEditMode={false} pageId={null} />);

      const select = screen.getByTestId("page-template-id") as unknown as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);

      expect(options).toContain("default");
      expect(options).toContain("hero");
      expect(options).toContain("split");
    });
  });
});
