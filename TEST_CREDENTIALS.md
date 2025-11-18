# Tokani TripFlow - Test Credentials

## Overview
Test users have been created in the PostgreSQL database with different roles. The authentication system automatically assigns roles based on email addresses.

## How to Use Test Credentials

### Authentication Method
Tokani TripFlow uses **Replit Auth** with OpenID Connect (OIDC). You can sign in using:
- Google account
- GitHub account  
- Email/Password (via Replit)

### Test User Accounts

To test different roles, create Replit Auth accounts using these **exact email addresses**:

| Role | Email Address | First Name | Last Name | Access Level |
|------|--------------|------------|-----------|--------------|
| **Employee** | `employee@pacificfoods.fj` | Mereani | Tukana | Submit travel requests, view own trips |
| **Coordinator** | `coordinator@pacificfoods.fj` | Jone | Navuso | View team requests, coordinate travel |
| **Manager** | `manager@pacificfoods.fj` | Litiana | Ravouvou | Approve/reject travel requests |
| **Finance Admin** | `finance@pacificfoods.fj` | Ratu | Cakobau | Approve high-value travel, export finance data |
| **Travel Desk** | `traveldesk@pacificfoods.fj` | Setareki | Tukana | Process approved requests, book flights/hotels |

## How to Sign In with Test Accounts

### Option 1: Using Email/Password (Recommended for Testing)
1. Click "Sign In with Replit" on the landing page
2. On the Replit Auth screen, choose "Continue with Email"
3. **Use one of the exact email addresses above** (e.g., `manager@pacificfoods.fj`)
4. Complete the email verification process
5. The system will automatically assign you the correct role

### Option 2: Using Google Account
1. Create a Google account with one of the test email addresses
2. Sign in using "Continue with Google"
3. The system will auto-assign your role based on email

### Option 3: Using GitHub Account
1. Set your GitHub primary email to one of the test addresses
2. Sign in using "Continue with GitHub"  
3. The system will auto-assign your role based on email

## Role-Based Features

### Employee Role
- **Dashboard**: View own travel requests and statistics
- **New Request**: Submit new travel requests
- **My Trips**: View and track personal travel history
- **No approval permissions**

### Coordinator Role  
- All Employee features, plus:
- **Coordinator Dashboard**: View team travel requests
- Coordinate travel logistics for department

### Manager Role
- All Employee features, plus:
- **Manager Dashboard**: Approve/reject pending travel requests
- **Approvals**: Multi-level approval workflow
- Can delegate approval authority

### Finance Admin Role
- All Employee features, plus:
- **Finance Dashboard**: Approve high-value travel (≥ FJD 3,000)
- **Finance Export**: Export travel data for accounting
- **Analytics**: View financial reports and spending trends
- Budget tracking and cost center management

### Travel Desk Role
- All Employee features, plus:
- **Travel Desk Dashboard**: Process approved requests
- Book flights, accommodation, visas
- Track service fulfillment
- Manage travel vendor relationships

## Technical Details

### Auto-Role Assignment
The system automatically assigns roles when users log in based on email matching:

```typescript
// server/replitAuth.ts
if (email === "manager@pacificfoods.fj") {
  role = "manager";
} else if (email === "finance@pacificfoods.fj") {
  role = "finance_admin";
}
// ... etc
```

### Database Schema
Users are stored in PostgreSQL `users` table:

```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Session Management
- Sessions stored in PostgreSQL `sessions` table
- 1-week session TTL (Time To Live)
- Secure httpOnly cookies
- Auto-refresh for expired tokens

## Testing Workflows

### Test Manager Approval Flow
1. Sign in as `employee@pacificfoods.fj`
2. Submit a new travel request
3. Sign out
4. Sign in as `manager@pacificfoods.fj`
5. Go to Manager Dashboard → Approve the request
6. Verify status changes and notifications

### Test Finance Approval Flow  
1. Sign in as `employee@pacificfoods.fj`
2. Submit high-value request (≥ FJD 3,000)
3. Sign out
4. Sign in as `manager@pacificfoods.fj` → Approve
5. Sign out
6. Sign in as `finance@pacificfoods.fj` → Final approval

### Test Travel Desk Processing
1. Sign in as `traveldesk@pacificfoods.fj`
2. Go to Travel Desk Dashboard
3. View approved requests queue
4. Click "Process Request" to book services

## Notes

- **First-time setup**: You'll need to create Replit accounts with these email addresses
- **Role persistence**: Roles are stored in the database and persist across sessions
- **Production**: In production, implement proper role assignment via admin panel
- **Email verification**: Some auth providers may require email verification

## Security Considerations

⚠️ **These are test credentials for development only**

- Do NOT use these in production
- Implement proper role-based access control (RBAC) middleware
- Add admin interface for role management
- Consider using environment-based role overrides for testing

## Support

For issues with test credentials:
1. Check the PostgreSQL `users` table: `SELECT * FROM users ORDER BY role;`
2. Verify email matches exactly (case-sensitive)
3. Clear session: Sign out and sign in again
4. Check server logs for role assignment confirmation

---

**Last Updated**: November 18, 2025  
**Database**: PostgreSQL (Neon-backed)  
**Auth Provider**: Replit Auth (OpenID Connect)
