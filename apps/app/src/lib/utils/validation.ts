import { BOOKING_STATUSES } from "@/lib/utils/constants";
import { logger } from "@/lib/utils/logger";

export interface BookingValidationInput {
  packageId: string;
  departureDate: string;
  customerName: string;
  totalPrice: string;
  travelers: number;
  customerEmail?: string;
  customerPhone?: string;
  status?: string;
}

export interface BookingValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateBooking(
  input: BookingValidationInput,
  t?: (key: string) => string,
): BookingValidationResult {
  const errors: Record<string, string> = {};
  const _ = (key: string, fallback: string) => (t ? t(key) : fallback);

  if (!input.customerName.trim()) {
    errors.customerName = _("validation.customerNameRequired", "Customer name is required");
  }

  if (!input.packageId.trim()) {
    errors.packageId = _("validation.packageRequired", "Package is required");
  }

  if (!input.departureDate.trim()) {
    errors.departureDate = _("validation.departureDateRequired", "Departure date is required");
  }

  if (!input.totalPrice.trim()) {
    errors.totalPrice = _("validation.totalPriceRequired", "Total price is required");
  } else if (!/^\d+(\.\d{1,2})?$/.test(input.totalPrice)) {
    errors.totalPrice = _("validation.invalidPriceFormat", "Invalid price format");
  }

  if (input.travelers < 1) {
    errors.travelers = _("validation.minTravelerRequired", "Minimum 1 traveler required");
  }

  if (
    input.customerEmail &&
    input.customerEmail.trim() !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim())
  ) {
    errors.customerEmail = _("validation.invalidEmailFormat", "Invalid email format");
  }

  if (
    input.customerPhone &&
    input.customerPhone.trim() !== "" &&
    !/^[\d\s()+\-.]{6,20}$/.test(input.customerPhone.trim())
  ) {
    errors.customerPhone = _("validation.invalidPhoneFormat", "Invalid phone number format");
  }

  if (input.status && !(BOOKING_STATUSES as readonly string[]).includes(input.status)) {
    errors.status = _("validation.invalidStatus", "Invalid status value");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface PackageValidationInput {
  title: string;
  slug: string;
  price: string;
  durationDays: number;
  itinerary?: string;
  inclusions?: string;
  exclusions?: string;
  availableDates?: string;
  gallery?: string;
}

export interface PackageValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validatePackage(
  input: PackageValidationInput,
  t?: (key: string) => string,
): PackageValidationResult {
  const errors: Record<string, string> = {};
  const _ = (key: string, fallback: string) => (t ? t(key) : fallback);

  if (!input.title.trim()) {
    errors.title = _("validation.titleRequired", "Title is required");
  }

  if (!input.slug.trim()) {
    errors.slug = _("validation.slugRequired", "Slug is required");
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    errors.slug = _("validation.invalidSlugFormat", "Invalid slug format");
  }

  if (!input.price.trim()) {
    errors.price = _("validation.priceRequired", "Price is required");
  } else if (!/^\d+(\.\d{1,2})?$/.test(input.price)) {
    errors.price = _("validation.invalidPriceFormat", "Invalid price format");
  }

  if (input.durationDays < 1) {
    errors.durationDays = _("validation.durationMinOneDay", "Duration must be at least 1 day");
  }

  const jsonFields: Array<{ key: string; value?: string }> = [
    { key: "itinerary", value: input.itinerary },
    { key: "inclusions", value: input.inclusions },
    { key: "exclusions", value: input.exclusions },
    { key: "availableDates", value: input.availableDates },
    { key: "gallery", value: input.gallery },
  ];

  for (const field of jsonFields) {
    if (field.value && field.value.trim() !== "") {
      try {
        JSON.parse(field.value);
      } catch (err) {
        logger.error(
          "[validation] Failed to parse JSON field:",
          { component: "validation", field: field.key },
          err,
        );
        errors[field.key] = _("validation.invalidJsonFormat", "Invalid JSON format");
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
