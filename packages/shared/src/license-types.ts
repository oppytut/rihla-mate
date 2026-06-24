// =============================================
// License Plans
// =============================================
export const LICENSE_PLANS = ["starter", "pro", "enterprise"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

// =============================================
// Feature Flags (per plan)
// =============================================
export const LICENSE_FEATURES = [
  "multi_tenant",
  "custom_domain",
  "white_label",
  "seo",
  "analytics",
  "priority_support",
  "api_access",
  "template_marketplace",
  "booking_engine",
  "payment_gateway",
] as const;
export type LicenseFeature = (typeof LICENSE_FEATURES)[number];

// =============================================
// License Status
// =============================================
export const LICENSE_STATUSES = ["active", "revoked", "expired", "trial", "grace_period"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

// =============================================
// License Key Payload (what's embedded in the key)
// =============================================
export interface LicensePayload {
  /** Unique license ID (lic_xxx) */
  licenseId: string;
  /** Customer ID (cust_xxx) */
  customerId: string;
  /** Customer/company name */
  customerName: string;
  /** License plan */
  plan: LicensePlan;
  /** Enabled features */
  features: LicenseFeature[];
  /** Max sub-tenants (for multi-tenant plans) */
  maxTenants: number;
  /** Max monthly bookings allowed */
  maxMonthlyBookings: number;
  /** License expiration date (ISO 8601) */
  expiresAt: string;
  /** Grace period in days after expiration */
  gracePeriodDays: number;
  /** Whether this is a trial license */
  isTrial: boolean;
  /** Trial duration in days */
  trialDays: number;
  /** URL of the license server API */
  apiUrl: string;
}

// =============================================
// License State (stored on app server, in .rihla-mate/license.json)
// =============================================
export interface LicenseState {
  /** Full license key string (RML1.xxx.yyy) */
  key: string;
  /** Decoded and verified payload */
  payload: LicensePayload;
  /** Current status */
  status: LicenseStatus;
  /** When the license was activated */
  activatedAt: string;
  /** Last successful check-in timestamp */
  lastCheckinAt: string | null;
  /** Consecutive failed check-in count */
  failedCheckins: number;
  /** Instance fingerprint (hardware hash) */
  instanceId: string;
  /** Domain where app is installed */
  domain: string | null;
}

// =============================================
// Trial State
// =============================================
export interface TrialState {
  /** Whether trial is active */
  active: boolean;
  /** When trial started (ISO 8601) */
  startedAt: string;
  /** Trial duration in days */
  durationDays: number;
  /** When trial ends (ISO 8601) */
  expiresAt: string;
}

// =============================================
// Activation Request/Response (app -> license server)
// =============================================
export interface ActivateRequest {
  licenseKey: string;
  instanceId: string;
  domain?: string;
  ipAddress?: string;
}

export interface ActivateResponse {
  success: boolean;
  license: LicensePayload & {
    status: LicenseStatus;
    activatedAt: string;
    domain: string;
  };
}

export interface ActivateError {
  success: false;
  error: string;
  code: "INVALID_KEY" | "LICENSE_NOT_FOUND" | "ALREADY_ACTIVATED" | "EXPIRED" | "REVOKED";
  /** If already activated, the domain it's bound to */
  existingDomain?: string;
}

// =============================================
// Check-in Request/Response (app -> license server)
// =============================================
export interface CheckinRequest {
  licenseId: string;
  instanceId: string;
  ipAddress?: string;
  appVersion?: string;
  /** Hash of license module files (integrity check) */
  moduleHash?: string;
}

export interface CheckinResponse {
  status: "ok" | "warning" | "revoked" | "expired";
  plan: LicensePlan;
  features: LicenseFeature[];
  expiresAt: string;
  /** Remaining grace period days (0 if no grace period active) */
  graceRemaining: number;
  /** Warning messages (e.g., tampered module detected) */
  warnings?: string[];
}

// =============================================
// Revoke Request/Response (admin -> license server)
// =============================================
export interface RevokeRequest {
  licenseId: string;
  reason?: string;
}

export interface RevokeResponse {
  success: true;
}

// =============================================
// Health Response
// =============================================
export interface HealthResponse {
  status: "ok";
  timestamp: string;
  uptime: number;
}

// =============================================
// Plan Features Map
// =============================================
export const PLAN_FEATURES: Record<LicensePlan, LicenseFeature[]> = {
  starter: ["custom_domain", "white_label", "booking_engine"],
  pro: [
    "custom_domain",
    "white_label",
    "seo",
    "analytics",
    "booking_engine",
    "payment_gateway",
    "multi_tenant",
  ],
  enterprise: [
    "custom_domain",
    "white_label",
    "seo",
    "analytics",
    "booking_engine",
    "payment_gateway",
    "multi_tenant",
    "api_access",
    "template_marketplace",
    "priority_support",
  ],
};

// =============================================
// Plan Limits
// =============================================
export const PLAN_LIMITS: Record<
  LicensePlan,
  { maxTenants: number; maxMonthlyBookings: number }
> = {
  starter: { maxTenants: 1, maxMonthlyBookings: 100 },
  pro: { maxTenants: 5, maxMonthlyBookings: 500 },
  enterprise: { maxTenants: 0, maxMonthlyBookings: 0 }, // 0 = unlimited
};

// =============================================
// User Roles
// =============================================
export const USER_ROLES = ["owner", "admin", "staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// =============================================
// Booking Status
// =============================================
export const BOOKING_STATUSES = ["pending", "confirmed", "paid", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// =============================================
// Package Status
// =============================================
export const PACKAGE_STATUSES = ["draft", "published", "archived"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

// =============================================
// Tenant Status
// =============================================
export const TENANT_STATUSES = ["active", "suspended", "inactive"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];
