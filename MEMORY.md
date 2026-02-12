**Purpose**: AI's persistent knowledge base for project context and learnings
**Last Updated**: 2026-02-12

## Memory Maintenance Guidelines

### Structure Standards

- Entry Format: ### [ID] [Title (YYYY-MM-DD)] ✅ STATUS
- Required Fields: Date, Challenge/Decision, Solution, Key Learning
- Length Limit: 3-6 lines per entry (excluding sub-bullets)
- Status Indicators: ✅ COMPLETE, ⚠️ PARTIAL, ❌ BLOCKED

### Content Guidelines

- Focus: Architecture decisions, critical bugs, security fixes, major technical challenges
- Exclude: Routine features, minor bug fixes, documentation updates
- Learning: Each entry must include actionable learning or decision rationale
- Redundancy: Remove duplicate information, consolidate similar issues

### File Management

- Archive Trigger: When file exceeds 500 lines or 6 months old
- Archive Format: `memory-YYYY-MM.md` (e.g., `memory-2025-01.md`)
- New File: Start fresh with current date and carry forward only active decisions

---

## Project Memory Entries

### [010] Modul Anggota - Chrome DevTools MCP Test & getMemberById BigInt Fix (2026-02-12) ✅ COMPLETE

**Challenge**: Test all Anggota module features via Chrome DevTools MCP; member detail page returned 500.

**Solution**:
- Admin Members: list, search, create, view detail, edit, approve—all passed. Fixed getMemberById BigInt serialization (same pattern as MEMORY [006]): map Prisma result to plain object with Number() for BigInt fields before JSON response.
- Member Portal (budi@example.com / NIK): dashboard, Simpanan, Pinjaman, Transaksi, Pesanan, Buat Pesanan—all passed. Anggota redirects to /member, sees member-scoped data.

**Key Learning**: Chrome DevTools MCP enables systematic E2E testing without Cypress/Playwright. Member API GET single-by-id must explicitly serialize BigInt like listMembers; spread of raw Prisma result fails JSON.stringify.

**Files**: `lib/services/member-service.ts` (getMemberById), MEMORY.md

---

### [009] Module Simpanan - Setor/Tarik & P2 Improvements (2026-02-11) ✅ COMPLETE

**Challenge**: Implement P1 Setor/Tarik flow and P2 improvements per test report.

**Solution**:
- P1: SavingsAccountsList modal—member Select (search), fetch accounts, show account or "Buat Rekening", amount/reference/notes form, call deposit/withdraw API
- P2 Lihat Rekening: toggle button per type → table of accounts via GET /api/savings?type_id=X (getAccountsByType)
- P2 Buat Rekening: POST /api/savings/accounts, "Buat Rekening" button in modal when member has no account for that type
- Fixed members API BigInt serialization (listMembers returns plain objects for JSON)

**Key Learning**: Member select with onSearch + fetchMembers(limit=50, status=active) provides sufficient UX. Create-account flow integrates naturally in deposit modal.

**Files**: `components/savings/savings-accounts-list.tsx`, `app/api/savings/accounts/route.ts`, `lib/services/savings-service.ts`, `lib/services/member-service.ts`

---

### [008] Users Management Module (2026-02-11) ✅ COMPLETE

**Challenge**: Implement CRUD for system users with role assignment, respecting RBAC and preventing self-lockout.

**Solution**:
- UserService with list/create/update/delete (soft delete via deleted_at); bcrypt for passwords; role assignment via user_roles
- API routes protected by ADMIN_USERS; DELETE blocks when target user id === current user id
- Sidebar uses useMenuItems() with useSession + hasPermission to show "Pengguna" only for Superadmin/Manager
- Page-level redirect when user lacks ADMIN_USERS; Chrome DevTools MCP test validated full CRUD and self-delete protection

**Key Learning**: Permission-based sidebar visibility (`hasPermission(roles, PERMISSIONS.ADMIN_USERS)`) provides consistent UX—users see only menus they can access. Self-delete guard in API (not just UI) prevents accidental lockout even if client is bypassed.

**Files**: `lib/services/user-service.ts`, `app/api/users/*`, `app/api/roles/route.ts`, `components/users/*`, `components/layout/sidebar.tsx`

---

### [004] Prisma 7 ORM Migration (2026-02-08) ✅ COMPLETE

**Challenge**: Migrate application data access from raw mysql2 to a type-safe ORM while keeping MariaDB/MySQL compatibility.

**Solution**:
- Adopted Prisma 7 with `@prisma/adapter-mariadb` and `mariadb` driver; singleton in `lib/db/prisma.ts` with `getDatabaseUrl()` and `PrismaMariaDb` adapter
- Full schema in `prisma/schema.prisma`; seed in `prisma/seed.ts` (roles, savings_types, product_units, COA, admin) using same PrismaClient config as app; seed command in `prisma.config.ts` under `migrations.seed`
- Migrated all services (product, warehouse, stock, consignment, member, savings, loan, journal, report), auth (`lib/auth/config.ts`), and routes to Prisma
- Retained `lib/db.ts` and `lib/db/migrate.ts` for POST `/api/migrate` until optional cutover to `prisma migrate deploy` + `prisma db seed`

**Key Learning**: Prisma seed script must instantiate PrismaClient with the same adapter and env (e.g. dotenv, getDatabaseUrl()) as the app; otherwise seed fails against MariaDB. Browser login test (admin@koperasimaju.com → dashboard) confirmed auth and seeded admin work with Prisma.

**Files**: `lib/db/prisma.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `prisma.config.ts`, `lib/services/*`, `lib/auth/config.ts`

---

### [001] UI Framework Migration to Ant Design (2026-02-08) ✅ COMPLETE

**Challenge**: Migrated entire UI framework from shadcn-ui to Ant Design to better support enterprise ERP requirements.

**Solution**: 
- Created Ant Design ConfigProvider with theme management (dark/light mode)
- Migrated all components: layout, pages, tables, forms, cards
- Replaced react-hot-toast with Ant Design message API
- Replaced next-themes with Ant Design ConfigProvider theme system
- Maintained Tailwind CSS for custom styling alongside Ant Design

**Key Learning**: 
- Ant Design provides better enterprise component coverage (tables, forms, validation)
- ConfigProvider theme system integrates well with Tailwind dark mode classes
- Form validation is simpler with Ant Design's built-in Form component
- All existing functionality preserved during migration

**Files**: `components/providers/antd-provider.tsx`, `app/layout.tsx`, all component files

---

### [002] Membership Route Structure and Module Completion (2026-02-08) ✅ COMPLETE

**Challenge**: Sidebar linked to `/dashboard/members` but actual routes were `/members` (Next.js route groups don't add to URL). Membership module lacked detail and edit pages.

**Solution**:
- Moved members under `app/(dashboard)/dashboard/members/` for correct `/dashboard/members` routes
- Created member detail page `[id]/page.tsx` with Descriptions display and approval button
- Created member edit page `[id]/edit/page.tsx` with pre-filled form and PATCH API
- Created `MemberApprovalButton` component for approve flow

**Key Learning**: In Next.js App Router, `(dashboard)` is a route group (no URL segment). For `/dashboard/members`, members must live under `dashboard/` folder: `app/(dashboard)/dashboard/members/page.tsx`.

---

### [003] Ant Design Form.useForm "Not Connected" Warning (2026-02-08) ✅ COMPLETE

**Challenge**: Member edit page triggered "Instance created by useForm is not connected to any Form element" when Next.js prefetched the page via Link.

**Solution**: Always render `<Form form={form}>` on mount. Moved loading conditional inside Form (show Spin while loading, form fields when ready) instead of early return that skipped Form entirely.

**Key Learning**: When using `Form.useForm()`, the Form component must be in the DOM from first render. Early returns that skip Form cause the warning during prefetch or navigation.

---

### [005] Phase 4 POS lookupMember Prisma Relation Filter (2026-02-08) ✅ COMPLETE

**Challenge**: POS member lookup by barcode/email returned empty when member existed. Prisma `include: { member: { where: ... } }` does not filter the relation; it can exclude the relation entirely when no match.

**Solution**: Move relation filter to top-level `where` clause. Use `where: { barcode_or_email: value, member: { status: 'active', deleted_at: null } }` instead of filtering inside `include`.

**Key Learning**: In Prisma, filtering on included relations via `include.member.where` filters the nested result, but when the relation filter excludes all rows, the parent query can behave unexpectedly. Filter at the top-level `where` when you need to ensure the relation exists and meets conditions.

**Files**: `lib/services/pos-service.ts` (lookupMember)

---

### [006] Warehouses API BigInt Serialization (2026-02-08) ✅ COMPLETE

**Challenge**: Warehouses API returned 500 when serializing response to JSON; BigInt values cannot be directly JSON.stringify'd.

**Solution**: Map BigInt fields to Number before returning from API handler. Use `Number(x)` for id and other BigInt columns in the warehouses list response.

**Key Learning**: MySQL/MariaDB returns BIGINT as JavaScript BigInt. JSON.stringify throws on BigInt. Either use Prisma's `Decimal`/`BigInt` serialization or explicitly convert to Number in API layer when safe (IDs under Number.MAX_SAFE_INTEGER).

**Files**: `app/api/inventory/warehouses/route.ts`

---

### [007] Phases 5–7 Accomplishments (2026-02-08) ✅ COMPLETE

**Accomplishment**: Delivered Phase 5 (Member Portal), Phase 6 (Reporting & Advanced), Phase 7 (Testing & Deployment).

**Phase 5**: Member portal for Anggota—session memberId from member email; user created on member approval (default password NIK); dashboard redirect for Anggota to /member; member-scoped APIs and pages (dashboard, savings, loans, transactions, orders). Unlinked page when member email doesn’t match.

**Phase 6**: Daily reports (POS sales, cash, stock movements); monthly reports (Neraca, Laba Rugi); cash expense module (categories, expenses, auto-journal when category has account_id); notifications table and in-app center in header; AuditService for expense create and journal post.

**Phase 7**: UAT checklist (docs/phase7-uat-checklist.md), security checklist (docs/phase7-security-checklist.md), API rate limiting (middleware, 120/min per IP), Excel migration script (Anggota sheet), validate-migration script, deployment guide (docs/deployment.md).

**Key Learning**: Documentation per .cursorrules (architecture, decisions, memory, backlog) keeps context for future AI and developers. Cross-link implementation-status with architecture, decisions, and deployment.
