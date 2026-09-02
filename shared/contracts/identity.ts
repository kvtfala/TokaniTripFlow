import { z } from "zod";
import { membershipRoleSchema } from "@shared/schema";

export const membershipStatusSchema = z.enum([
  "invited", "active", "suspended", "revoked",
]);

export const organisationStatusSchema = z.enum(["active", "suspended", "closed"]);

export const userProfileSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(160),
  timeZone: z.string().trim().min(1).max(100),
  locale: z.string().trim().min(2).max(20),
});

export const organisationMembershipSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: membershipRoleSchema,
  status: membershipStatusSchema,
  activatedAt: z.string().datetime().nullable(),
});

export const authenticatedIdentityContextSchema = z.object({
  user: userProfileSchema,
  memberships: z.array(organisationMembershipSchema),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  role: membershipRoleSchema,
  expiresInHours: z.number().int().min(1).max(168).default(48),
});

export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type AuthenticatedIdentityContext = z.infer<typeof authenticatedIdentityContextSchema>;
export type CreateInvitation = z.infer<typeof createInvitationSchema>;
