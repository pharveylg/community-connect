import * as z from "zod";
import { CATEGORY_SLUGS, LEAD_TIMES, RATE_TYPES } from "@/lib/catalog";

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
