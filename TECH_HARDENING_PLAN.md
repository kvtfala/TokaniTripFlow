# Technical Hardening Plan
**Tokani TripFlow - Security & Code Quality Roadmap**

---

## Phase 1: Completed ✅

### Security Hardening
- **Removed hardcoded credentials** - Migrated demo credentials (company code, email, password) to environment variables with `.env.example` documentation
- **Fixed XSS vulnerability** - Replaced `dangerouslySetInnerHTML` in chart component with safe JSX string children
- **Upgraded vulnerable dependencies** - Reduced npm audit findings from 10 → 5 vulnerabilities (50% reduction):
  - `vite`: 5.4.20 → 6.4.1 (fixed Windows file system bypass)
  - `esbuild`: 0.25.0 → 0.27.0 (fixed dev server vulnerability)
  - `drizzle-kit`: 0.31.4 → 0.31.7 (security patches)
  - `express-session`: 1.18.1 → 1.18.2 (fixed HTTP header manipulation)
  - Auto-fixed: `glob`, `brace-expansion`, `on-headers`

### Code Quality Improvements
- **Implemented asyncHandler pattern** - Refactored all 46 async Express routes to use centralized error handling, eliminating 200+ lines of repetitive try-catch blocks
- **Centralized error middleware** - Added global Express error handler with structured JSON responses and development stack traces
- **Resolved ESLint warnings** - Fixed all `no-misused-promises` violations across route handlers
- **Type safety** - Improved TypeScript coverage in error handling flow

### Data Integrity
- **Expanded airport database** - Grew from 27 to 106 global airports with strong Pacific region coverage for realistic demo scenarios
- **PostgreSQL configured** - Database ready for migration from in-memory storage

---

## Phase 2: Roadmap 📋

### High Priority
1. **Replace xlsx library** - Migrate to `exceljs@^4.4.0` to eliminate HIGH severity prototype pollution and ReDoS vulnerabilities (currently no fix available for OSS SheetJS)
2. **Type safety audit** - Replace remaining `any` types with proper TypeScript interfaces/types (estimated ~30-50 instances)
3. **Production database migration** - Move from `MemStorage` to PostgreSQL using existing Drizzle ORM setup
4. **Comprehensive test coverage** - Add unit and integration tests for:
   - Multi-level approval workflows
   - RFQ vendor quote submission
   - Per-diem calculations
   - Role-based access control
   - Audit logging integrity

### Medium Priority
5. **ESLint strict configuration** - Enable stricter rules and resolve all warnings
6. **Security headers** - Add `helmet.js` for production security headers (CSP, HSTS, etc.)
7. **Rate limiting** - Implement rate limiting on API endpoints to prevent abuse
8. **CORS hardening** - Configure strict CORS policies for production deployment
9. **Input sanitization** - Add validation/sanitization layer for all user inputs
10. **Session security** - Configure secure session settings (httpOnly, secure, sameSite)

### Low Priority
11. **Monitoring & observability** - Integrate logging solution (Winston/Pino) and error tracking (Sentry)
12. **API documentation** - Generate OpenAPI/Swagger docs for external integrations
13. **Performance optimization** - Add caching layer for frequently accessed data
14. **Dependency pruning** - Audit and remove unused dependencies

---

## Quality Gates & Continuous Improvement

### Automated Quality Tools
- **Codacy / SonarCloud** - Code quality, security hotspots, code smells, technical debt tracking
  - Fail PR if code quality grade drops below B
  - Block merge on new security vulnerabilities
  - Track code coverage trends (target: 70%+)

- **ESLint** - Enforce consistent code style and catch common errors
  - Enabled in pre-commit hooks via Husky
  - Zero warnings policy for production branches
  - TypeScript strict mode enabled

- **npm audit** - Weekly automated security scans
  - Block deployment if HIGH/CRITICAL vulnerabilities exist
  - Monthly dependency update review
  - Document accepted risks in `SECURITY.md`

### Development Workflow
1. **Pre-commit** - ESLint, TypeScript compilation checks
2. **PR checks** - Automated tests, code coverage, Codacy analysis
3. **Weekly** - Dependency updates review, npm audit scan
4. **Monthly** - Security review, technical debt assessment

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation | Timeline |
|------|----------|------------|----------|
| xlsx prototype pollution | HIGH | Replace with ExcelJS | Phase 2, Q1 2026 |
| In-memory storage data loss | MEDIUM | Migrate to PostgreSQL | Phase 2, Q1 2026 |
| Missing rate limiting | MEDIUM | Implement express-rate-limit | Phase 2, Q2 2026 |
| esbuild in drizzle-kit deps | MODERATE | Monitor upstream fix | Ongoing |

---

## Success Metrics
- ✅ Zero HIGH/CRITICAL vulnerabilities in production
- ✅ >90% TypeScript strict compliance
- ✅ ESLint warnings: 0
- 🎯 Test coverage: >70% (Phase 2)
- 🎯 Code quality grade: A (Codacy/SonarCloud)
- 🎯 Security hotspots: 0

---

**Last Updated:** November 19, 2025  
**Document Owner:** Engineering Team  
**Review Cycle:** Quarterly
