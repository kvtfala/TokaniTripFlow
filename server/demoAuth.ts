// Demo Login Authentication
// IMPORTANT: This is for DEMO purposes only with hardcoded credentials
// Do NOT use in production

import bcrypt from "bcryptjs";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Demo credentials (hardcoded for demo environment)
const DEMO_COMPANY_CODE = "itt001";
const DEMO_EMAIL = "desmond.bale@islandtraveltech.com";
const DEMO_PASSWORD = "itt1235*";

/**
 * Demo login endpoint - validates company code, email, and password
 * This creates a session just like Replit Auth, but uses email/password
 */
export function setupDemoAuth(app: Express) {
  app.post("/api/demo-login", async (req, res) => {
    const { companyCode, email, password } = req.body;

    // Validate required fields
    if (!companyCode || !email || !password) {
      return res.status(400).json({ 
        message: "Company code, email, and password are required" 
      });
    }

    // Validate company code
    if (companyCode !== DEMO_COMPANY_CODE) {
      return res.status(401).json({ 
        message: "Invalid demo credentials or company code" 
      });
    }

    // Validate email
    if (email !== DEMO_EMAIL) {
      return res.status(401).json({ 
        message: "Invalid demo credentials or company code" 
      });
    }

    // Get user from storage
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid demo credentials or company code" 
      });
    }

    // Validate password hash
    if (!user.passwordHash) {
      return res.status(401).json({ 
        message: "Invalid demo credentials or company code" 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: "Invalid demo credentials or company code" 
      });
    }

    // Create session - mimicking Replit Auth session structure
    const demoUser = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl,
      },
      access_token: "demo-access-token",
      refresh_token: "demo-refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
    };

    // Establish session using Passport's login method
    req.login(demoUser, (err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to create session" });
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
        }
      });
    });
  });
}

/**
 * Hash a password for demo user seeding
 * DEMO USE ONLY - Password: "itt1235*"
 */
export async function hashDemoPassword(): Promise<string> {
  return await bcrypt.hash(DEMO_PASSWORD, 10);
}
