import * as z from "zod";

export const RegisterBasicInfoSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name."),
  mobile: z.string().trim().min(7, "Please enter a valid mobile number."),
  email: z.email("Please enter a valid email address.").trim(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const LoginSchema = z.object({
  email: z.email("Please enter a valid email address.").trim(),
  password: z.string().min(1, "Please enter your password."),
});

export const DependentSchema = z.object({
  name: z.string().trim().min(2, "Please enter their full name."),
  relationship: z.string().trim().min(2, "Please enter your relationship to them."),
  notes: z.string().trim().optional().default(""),
});

export type RegisterBasicInfo = z.infer<typeof RegisterBasicInfoSchema>;
export type DependentInput = z.infer<typeof DependentSchema>;
