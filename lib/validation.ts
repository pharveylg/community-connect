import * as z from "zod";
import {
  CATEGORY_SLUGS,
  LEAD_TIMES,
  RATE_TYPES,
  TOPUP_METHODS,
  MIN_TOPUP_PESOS,
  MAX_TOPUP_PESOS,
  VERIFICATION_ID_TYPES,
} from "@/lib/catalog";

// --- Philippine mobile numbers ------------------------------------------------

/**
 * Accepts 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX, 9XXXXXXXXX (spaces,
 * dashes, dots and parentheses ignored) and returns the normalized
 * 09XXXXXXXXX form, or null when invalid.
 */
export function normalizePhMobile(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  const local = digits.match(/^(?:0(9\d{9})|(?:\+?63)?(9\d{9}))$/);
  if (!local) return null;
  return `0${local[1] ?? local[2]}`;
}

export const PH_MOBILE_MESSAGE =
  "Please enter a valid PH mobile number (e.g. 0917 123 4567).";

export const PhMobileSchema = z
  .string()
  .trim()
  .refine((v) => normalizePhMobile(v) !== null, PH_MOBILE_MESSAGE);

// --- Auth / onboarding ---------------------------------------------------------

export const RegisterBasicInfoSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name."),
  mobile: PhMobileSchema,
  email: z.email("Please enter a valid email address.").trim(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const LoginSchema = z.object({
  email: z.email("Please enter a valid email address.").trim(),
  password: z.string().min(1, "Please enter your password."),
});

/** For users whose Firebase Auth account exists but whose profile was never created. */
export const CompleteProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name."),
  mobile: PhMobileSchema,
});

export const DependentSchema = z.object({
  name: z.string().trim().min(2, "Please enter their full name."),
  relationship: z.string().trim().min(2, "Please enter your relationship to them."),
  notes: z.string().trim().optional().default(""),
});

// --- Provider services -----------------------------------------------------------

export const ServiceListingSchema = z.object({
  categorySlug: z.enum(CATEGORY_SLUGS, "Please choose a service category."),
  title: z.string().trim().min(3, "Please give your service a short name.").max(60),
  description: z.string().trim().max(300, "Keep the description under 300 characters.").optional().default(""),
  rateType: z.enum(RATE_TYPES, "Please choose a rate type."),
  rateAmount: z.coerce
    .number({ error: "Please enter your rate as a number." })
    .int("Whole pesos only.")
    .min(1, "Your rate must be at least ₱1.")
    .max(1_000_000, "Please contact us for rates above ₱1,000,000."),
  negotiable: z.boolean().default(true),
  city: z.string().trim().min(2, "Please enter your city.").max(60),
  barangay: z.string().trim().min(2, "Please enter your barangay.").max(60),
  leadTime: z.enum(LEAD_TIMES, "Please choose how much notice you need."),
});

export type RegisterBasicInfo = z.infer<typeof RegisterBasicInfoSchema>;
export type DependentInput = z.infer<typeof DependentSchema>;
export type ServiceListingInput = z.infer<typeof ServiceListingSchema>;

// --- Bookings -------------------------------------------------------------------

export const BookingRequestSchema = z.object({
  preferredDate: z.string().trim().min(1, "Please choose your preferred date."),
  preferredTime: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().max(300, "Keep your message under 300 characters.").optional().default(""),
});
export type BookingRequestInput = z.infer<typeof BookingRequestSchema>;

// --- Credit top-ups ----------------------------------------------------------------

export const TopUpRequestSchema = z.object({
  amount: z.coerce
    .number({ error: "Please enter an amount in pesos." })
    .int("Whole pesos only.")
    .min(MIN_TOPUP_PESOS, `Minimum top-up is ₱${MIN_TOPUP_PESOS}.`)
    .max(MAX_TOPUP_PESOS, `Maximum top-up is ₱${MAX_TOPUP_PESOS.toLocaleString("en-PH")}.`),
  method: z.enum(TOPUP_METHODS, "Please choose how you sent the payment."),
  refNumber: z.string().trim().min(4, "Please enter your payment reference number.").max(60),
});
export type TopUpRequestInput = z.infer<typeof TopUpRequestSchema>;

// --- ID verification ---------------------------------------------------------------

export const VerificationSchema = z.object({
  legalName: z.string().trim().min(3, "Please enter your full legal name.").max(80),
  idType: z.enum(VERIFICATION_ID_TYPES, "Please choose your ID type."),
  idNumber: z.string().trim().min(4, "Please enter your ID number.").max(40),
  mobile: PhMobileSchema,
  facebookUrl: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^https?:\/\//.test(v), "Paste a link starting with http(s)://")
    .optional()
    .default(""),
});
export type VerificationInput = z.infer<typeof VerificationSchema>;

// --- Job board -------------------------------------------------------------------

export const JobPostSchema = z.object({
  title: z.string().trim().min(4, "Give your request a short title (e.g. Aircon cleaning).").max(80),
  description: z.string().trim().max(400, "Keep details under 400 characters.").optional().default(""),
  categorySlug: z.enum(CATEGORY_SLUGS, "Please choose a category."),
  barangay: z.string().trim().min(2, "Please enter your barangay.").max(60),
  city: z.string().trim().min(2, "Please enter your city.").max(60),
  whenNeeded: z.string().trim().max(20).optional().default("flexible"),
  budget: z.coerce
    .number({ error: "Budget must be a number." })
    .int("Whole pesos only.")
    .min(1, "Budget must be at least ₱1.")
    .max(1_000_000)
    .nullable()
    .optional()
    .default(null),
});
export type JobPostInput = z.infer<typeof JobPostSchema>;

export const JobOfferSchema = z.object({
  amount: z.coerce
    .number({ error: "Please enter your price as a number." })
    .int("Whole pesos only.")
    .min(1, "Your price must be at least ₱1.")
    .max(1_000_000),
  message: z.string().trim().max(300, "Keep your message under 300 characters.").optional().default(""),
});
export type JobOfferInput = z.infer<typeof JobOfferSchema>;
