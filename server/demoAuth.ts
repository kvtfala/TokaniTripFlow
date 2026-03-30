// Demo Login Authentication
// IMPORTANT: This is for DEMO purposes only
// Supports multiple demo users (one per role) for testing access levels
// Do NOT use in production

import bcrypt from "bcryptjs";
import type { Express } from "express";
import { storage } from "./storage";

const DEMO_COMPANY_CODE = process.env.DEMO_COMPANY_CODE ?? "itt001";

/**
 * Demo login endpoint - validates company code, email, and password
 * Supports all demo users seeded in storage — no env-var email restriction.
 * Each user must have a matching companyCode and passwordHash.
 */
export function setupDemoAuth(app: Express) {
  app.post("/api/demo-login", async (req, res) => {
    const { companyCode, email, password } = req.body;

    if (!companyCode || !email || !password) {
      return res.status(400).json({
        message: "Company code, email, and password are required",
      });
    }

    if (companyCode !== DEMO_COMPANY_CODE) {
      return res.status(401).json({
        message: "Invalid company code",
      });
    }

    const user = await storage.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.companyCode !== companyCode) {
      return res.status(401).json({
        message: "Invalid company code for this account",
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        message: "Account not configured for demo login",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const demoSession = {
      isDemo: true,
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };

    req.login(demoSession, (err) => {
      if (err) {
        console.error("Demo login session creation failed:", err);
        return res.status(500).json({ message: "Failed to create session" });
      }

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Demo login session save failed:", saveErr);
          return res.status(500).json({ message: "Failed to save session" });
        }

        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyCode: user.companyCode,
          },
        });
      });
    });
  });
}

export async function hashDemoPassword(): Promise<string> {
  return await bcrypt.hash(process.env.DEMO_PASSWORD ?? "itt1235*", 10);
}
