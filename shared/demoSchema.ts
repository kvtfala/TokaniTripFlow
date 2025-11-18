// Demo Login Schema
// Validation schema for demo authentication with company code + email/password

import { z } from "zod";

export const demoLoginSchema = z.object({
  companyCode: z.string()
    .min(1, "Company code is required")
    .regex(/^[a-z0-9]+$/i, "Company code must be alphanumeric"),
  email: z.string()
    .email("Valid email is required")
    .min(1, "Email is required"),
  password: z.string()
    .min(1, "Password is required"),
});

export type DemoLoginInput = z.infer<typeof demoLoginSchema>;
