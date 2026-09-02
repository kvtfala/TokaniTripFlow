import { describe, expect, it } from "vitest";
import {
  authenticatedIdentityContextSchema,
  createInvitationSchema,
} from "./identity";

describe("B2 identity contracts", () => {
  it("normalizes invitation email without accepting an organisation or authority", () => {
    const invitation = createInvitationSchema.parse({
      email: "  USER@Example.COM ",
      role: "employee",
    });
    expect(invitation.email).toBe("user@example.com");
    expect(invitation.expiresInHours).toBe(48);
    expect("organisationId" in invitation).toBe(false);
  });

  it("represents multiple memberships without selecting authority in the browser", () => {
    const result = authenticatedIdentityContextSchema.safeParse({
      user: {
        userId: "c0f7f8d4-8cb0-4d53-8bb1-e6d1462c29a5",
        displayName: "Test User",
        timeZone: "Pacific/Fiji",
        locale: "en",
      },
      memberships: [{
        id: "25a43b64-edf5-422a-863b-5ed9c3ff8b65",
        organisationId: "32c1b534-248b-42ef-9158-02dfbbce4347",
        userId: "c0f7f8d4-8cb0-4d53-8bb1-e6d1462c29a5",
        role: "coordinator",
        status: "active",
        activatedAt: "2026-09-01T20:00:00.000Z",
      }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects excessively long invitation validity", () => {
    expect(createInvitationSchema.safeParse({
      email: "user@example.com",
      role: "employee",
      expiresInHours: 720,
    }).success).toBe(false);
  });
});
