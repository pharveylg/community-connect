// Service catalog + freemium entitlements.
//
// Monetization model (see community-connect docs):
// - Seekers are free forever.
// - Providers get a permanently free tier: an always-visible listing plus a
//   monthly allowance of accepted bookings. Paid extras (unlimited accepts,
//   boosts, more service slots) arrive with the credits/wallet build.
// - Providers can define their OWN service ("Other") — e.g. trash pickup,
//   junk & scrap metal hauling — with their own rates. Frequently created
//   custom services are candidates to graduate into official categories.

export type CategorySlug =
  | "transport"
  | "handyman"
  | "errands"
  | "home-cleaning"
  | "gardening"
  | "care-home"
  | "events"
  | "other";

export type Category = {
  slug: CategorySlug;
  label: string;
  emoji: string;
  blurb: string;
};

export const SERVICE_CATEGORIES: Category[] = [
  {
    slug: "transport",
    label: "Transport & Delivery",
    emoji: "🚗",
    blurb: "Rides, deliveries, hatod sa airport, errand trips",
  },
  {
    slug: "handyman",
    label: "Handyman & Repairs",
    emoji: "🔧",
    blurb: "Plumbing, electrical, leaks, installations",
  },
  {
    slug: "errands",
    label: "Errands",
    emoji: "📦",
    blurb: "Pickups, drop-offs, lining up, buy-and-deliver",
  },
  {
    slug: "home-cleaning",
    label: "Home Cleaning",
    emoji: "🧹",
    blurb: "House cleaning, laundry, dishwashing help",
  },
  {
    slug: "gardening",
    label: "Gardening & Lawn",
    emoji: "🌿",
    blurb: "Gardening, lawn care, yard cleanup",
  },
  {
    slug: "care-home",
    label: "Care & Companionship",
    emoji: "🏠",
    blurb: "Caregiving, senior companions, house help",
  },
  {
    slug: "events",
    label: "Events & Catering",
    emoji: "🎉",
    blurb: "Catering, event staff, decorations",
  },
  {
    slug: "other",
    label: "My own service",
    emoji: "✨",
    blurb: "Trash pickup, junk & scrap metal, anything else — name it and set your rate",
  },
];

export const CATEGORY_SLUGS = SERVICE_CATEGORIES.map((c) => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

export function getCategory(slug: string): Category | undefined {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}

export const CUSTOM_CATEGORY: CategorySlug = "other";

// --- Rates -----------------------------------------------------------------

export const RATE_TYPES = ["per_job", "hourly", "daily"] as const;
export type RateType = (typeof RATE_TYPES)[number];

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  per_job: "per job",
  hourly: "per hour",
  daily: "per day",
};

export function formatRate(amount: number, rateType: RateType): string {
  return `₱${amount.toLocaleString("en-PH")} ${RATE_TYPE_LABELS[rateType]}`;
}

// --- Availability ------------------------------------------------------------

export const LEAD_TIMES = [
  "same_day",
  "1_hour",
  "3_hours",
  "1_day",
  "3_days",
  "1_week",
] as const;
export type LeadTime = (typeof LEAD_TIMES)[number];

export const LEAD_TIME_LABELS: Record<LeadTime, string> = {
  same_day: "Same-day available",
  "1_hour": "1 hour notice",
  "3_hours": "3 hours notice",
  "1_day": "1 day notice",
  "3_days": "3 days notice",
  "1_week": "1 week notice",
};

// --- Freemium entitlements (free tier) ---------------------------------------

/** Active service listings a free-tier provider may have. Paid tier raises this. */
export const FREE_MAX_ACTIVE_SERVICES = 2;

/** Accepted bookings a provider gets for free each calendar month. */
export const FREE_MONTHLY_ACCEPTS = 5;

/** Flat fee (₱, from provider credits) for accepts beyond the free allowance. */
export const EXTRA_ACCEPT_FEE_PESOS = 20;

// --- Manual credit top-ups (money stays off-platform) ---------------------------

export const TOPUP_METHODS = ["gcash", "maya", "bank"] as const;
export type TopUpMethod = (typeof TOPUP_METHODS)[number];

export const TOPUP_METHOD_LABELS: Record<TopUpMethod, string> = {
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank transfer",
};

export const MIN_TOPUP_PESOS = 100;
export const MAX_TOPUP_PESOS = 10000;

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

// --- ID verification (admin-approved badge) -------------------------------------

export const VERIFICATION_ID_TYPES = [
  "philsys",
  "drivers_license",
  "umid",
  "passport",
  "barangay_clearance",
  "other_gov",
] as const;
export type VerificationIdType = (typeof VERIFICATION_ID_TYPES)[number];

export const VERIFICATION_ID_LABELS: Record<VerificationIdType, string> = {
  philsys: "PhilSys National ID",
  drivers_license: "Driver's License",
  umid: "UMID",
  passport: "Passport",
  barangay_clearance: "Barangay Clearance",
  other_gov: "Other government ID",
};

/** Verified status is valid for one year, then lapses (annual re-verification). */
export const VERIFICATION_VALIDITY_DAYS = 365;

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";
