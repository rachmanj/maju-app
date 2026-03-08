**Purpose**: AI's persistent knowledge base for project context and learnings
**Last Updated**: 2026-02-11

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

### [031] Simpanan Sukarela SHU vs Reguler Split (2026-02-11) ✅ COMPLETE

**Challenge**: Members need to see which part of Simpanan Sukarela is from SHU (profit sharing) vs Reguler (voluntary deposits).

**Solution**:
- Added two new savings_types: SUKARELA_SHU, SUKARELA_REGULER (both withdrawable, earn interest).
- Kept SUKARELA for legacy data; new transactions use SHU or Reguler.
- COA: 2112 (Simpanan Sukarela SHU), 2113 (Simpanan Sukarela Reguler).
- Account numbers: SAVH (SHU), SAVR (Reguler).
- New members get 5 accounts (POKOK, WAJIB, SUKARELA, SUKARELA_SHU, SUKARELA_REGULER).
- Excel upload accepts SHU, REGULER in jenis simpanan; withdraw API allows both.
- Run ensure-member-savings-accounts to create SHU/Reguler accounts for existing members.

**Key Learning**: No data migration for existing SUKARELA; ensure script adds new account types. Journal service maps SUKARELA_SHU/SUKARELA_REGULER to their COA codes.

**Files**: prisma/seed.ts, lib/db/migrate.ts, lib/config/coa-codes.ts, lib/data/coa-seed.ts, lib/services/journal-service.ts, lib/utils/savings-account-number.ts, lib/services/member-service.ts, scripts/ensure-member-savings-accounts.ts, app/api/savings/upload/route.ts, app/api/savings/withdraw/route.ts, components/savings/savings-upload-excel.tsx, components/savings/savings-accounts-list.tsx, app/(member)/member/savings/page.tsx, scripts/validate-migration.ts

---

### [028] Product Excel Upload - Chrome DevTools MCP Test (2026-03-03) ✅ COMPLETE

**Test**: Product Excel upload feature via Chrome DevTools MCP; login pengurus/password.

**Results**:
- **Login**: OK — pengurus/password → dashboard
- **Navigation**: OK — Inventory → Produk → /dashboard/inventory/products
- **Upload Excel modal**: OK — opens; shows Unduh Template, format instructions, drag area
- **Unduh Template**: OK — link clicked (download triggered)
- **File upload**: Not automated — MCP browser has no programmatic file input; user must drag/drop or use file picker manually

**Key Learning**: Chrome DevTools MCP can test login, navigation, modal UI; file upload requires native file picker or Playwright/Cypress with file input support.

---

### [027] Product Excel Upload with Batch (2026-03-03) ✅ COMPLETE

**Challenge**: Import produk bulk via Excel; allow user to cancel/delete batch yang baru diupload.

**Solution**:
- **Schema**: `product_upload_batches` table; `products.upload_batch_id` (nullable, FK onDelete SetNull).
- **API**: POST /api/inventory/products/upload (create batch, parse Excel, ProductService.create with upload_batch_id); GET template; GET/DELETE batches.
- **Delete batch**: Soft-delete products (deleted_at) where upload_batch_id = batch.id, then delete batch record.
- **UI**: ProductsUploadExcel component (modal, batch table with Hapus, template download, dragger); products-refresh event.

**Key Learning**: Batch pattern mirrors savings_upload_batches. For products, soft delete is safer than hard delete (no cascade to stock, prices). ProductService.create extended with optional upload_batch_id.

**Files**: prisma/schema.prisma, lib/db/schema.sql, lib/services/product-service.ts, app/api/inventory/products/upload/*, components/inventory/products-upload-excel.tsx, app/(dashboard)/dashboard/inventory/products/page.tsx, components/inventory/products-table.tsx

---

### [026] Product Categories CRUD & Sidebar Konsinyasi (2026-03-03) ✅ COMPLETE

**Challenge**: Product categories had no UI; users could not add/edit categories for product form dropdown. Konsinyasi was only reachable via Inventory hub card.

**Solution**:
- **ProductCategoryService**: list (pagination, search, include_inactive), create, getById, update, deactivate; product_categories table with parent_id for hierarchy.
- **API**: GET/POST /api/settings/categories; GET/PATCH/DELETE /api/settings/categories/[id]; ADMIN_SETTINGS permission.
- **CategoriesTable**: Tab "Kategori Produk" in Pengaturan; CRUD modal (kode, nama, kategori induk opsional); ubah/nonaktifkan.
- **Sidebar**: Added "Konsinyasi" menu item (TruckOutlined) linking to /dashboard/inventory/consignment; selectedKey logic uses longest prefix match so sub-routes (suppliers, receipts, etc.) highlight Konsinyasi not Inventory.
- **Ant Design**: Modal destroyOnClose → destroyOnHidden in categories-table.

**Key Learning**: Settings master data (categories, units) follow same pattern: service, /api/settings/*, table component, tab in Pengaturan. Sidebar menu selection for nested routes needs longest-prefix match when both parent and child paths exist as menu items.

**Files**: lib/services/product-category-service.ts, app/api/settings/categories/*, components/settings/categories-table.tsx, app/(dashboard)/dashboard/settings/page.tsx, components/layout/sidebar.tsx, docs/user/manual-inventory.md

---

### [030] POS Self-Service IP Check Improvements & Build Fixes (2026-03-03) ✅ COMPLETE

**Challenge**: User accessing /pos via `http://10.10.110.34:3000/pos` saw "IP tidak terdaftar" despite registering that IP; x-forwarded-for/x-real-ip often missing in dev. Production build failed with TypeScript errors.

**Solution**:
- **IP detection**: `getClientIp()` in check-access: (1) request.ip, (2) x-forwarded-for, (3) x-real-ip, (4) cf-connecting-ip, (5) Host header: localhost→127.0.0.1; else Host IPv4 regex (e.g. `10.10.110.34:3000`→`10.10.110.34`), (6) unknown.
- **Localhost fallback**: When IP is ::1, 127.0.0.1, or unknown, try lookup in DB for 127.0.0.1 and ::1.
- **Error message**: Always return `detectedIp` in response; UI shows "IP terdeteksi: <strong>{detectedIp}</strong>" so user can register the correct IP.
- **Build fixes**: `order_limit` type (remove `!== ''`); InputNumber `parser` `as any`; `requireAnggotaSession` explicit `AnggotaSession` return type (fixes NextMiddleware/session.user); pos-service `where` object built inline (Prisma `Parameters` type changed).

**Key Learning**: When accessing via machine IP (e.g. 10.10.110.34:3000), Host header may be the only IP source; extract IPv4 from Host as fallback. NextAuth `auth()` return type can resolve to NextMiddleware in some contexts; explicit session type in require-anggota fixes consumers.

**Files**: app/api/pos-public/check-access/route.ts, app/(pos)/pos/page.tsx, lib/auth/require-anggota.ts, app/(dashboard)/dashboard/members/[id]/edit/page.tsx, lib/services/pos-service.ts

---

### [029] POS Self-Service: IP Whitelist + Login di /pos (2026-03-03) ✅ COMPLETE

**Challenge**: POS self-service harus di luar member area, akses langsung di /pos dengan login di halaman; hanya PC terdaftar (IP); gudang otomatis dari mapping IP.

**Solution**:
- **Route /pos**: Public, tidak di member area. Cek IP via `GET /api/pos-public/check-access` → jika tidak terdaftar tampil "Akses ditolak".
- **Login**: Form login di /pos (kredensial sama dengan main app); setelah login tampil POS interface.
- **Tabel**: `pos_self_service_devices` (ip_address, warehouse_id, name, is_active).
- **Pengaturan**: Tab "POS Self-Service" di Pengaturan; CRUD IP + gudang.
- **Gudang**: Auto dari mapping IP; tidak ada dropdown.
- **Hapus**: Link POS dari member portal nav.

**Key Learning**: IP dari `x-forwarded-for` or `x-real-ip`. 127.0.0.1 dapat didaftarkan untuk development. See [030] for Host header fallback and error message improvements.

**Files**: `pos_self_service_devices` (schema), lib/services/pos-self-service-device-service.ts, app/api/pos-public/check-access, app/api/settings/pos-self-service-devices/*, components/settings/pos-self-service-devices-table.tsx, app/(pos)/pos/*

---

### [028] POS Self-Service Route /pos (2026-03-03) ✅ COMPLETE

**Challenge**: Anggota perlu halaman POS self-service terpisah dari POS kasir (dashboard) dan member portal, dengan pemilihan item via modal (search nama, filter kategori).

**Solution**:
- **Route**: `/pos` — layout `(pos)` dengan POSSelfServiceGuard (anggota + memberId only).
- **API**: `/api/pos-public/*` (warehouses, categories, products, session, checkout) — auth via `requireAnggotaSession()`.
- **ProductSelectionModal**: Search by name, filter by category; klik baris → modal qty → tambah ke keranjang.
- **Session**: Device "POS-SELF" auto-created; `getOrCreateSelfServiceSession(userId)` — reuse existing or create.
- **POSService.searchProducts**: Added optional `categoryId` param.
- **Nav**: Link "POS" di member portal nav (later removed per [029]).

**Key Learning**: Self-service POS reuses POSService.checkout; memberId from session (no barcode lookup). Device POS-SELF created on first use.

**Files**: app/(pos)/pos/*, components/pos/product-selection-modal.tsx, app/api/pos-public/*, lib/auth/require-anggota.ts, lib/services/pos-service.ts, components/member/member-portal-nav.tsx

---

### [027] POS Module Test & Seed Warehouse Fix (2026-03-03) ✅ COMPLETE

**Challenge**: POS E2E test via Chrome DevTools MCP; checkout failed "Stok tidak mencukupi" despite seed adding stock to warehouse 1.

**Solution**:
- **POS workflow**: Device → Session (Buka Sesi) → Member lookup (barcode/email) → Product search → Cart → Checkout (Cash/Potong Gaji/Simpanan).
- **Seed fix**: `seed-pos-test-data.ts` used warehouse_id 1, but warehouses API orders by code asc; first warehouse is "002" (id 3). Updated seed to use first warehouse by code for product_prices and warehouse_stock.
- **Test**: Login (pengurus/password), member MBR00000001, product Ultra Cokelat, Cash checkout — Transaksi POS-xxx berhasil.

**Key Learning**: POS seed must align with default warehouse selection (first by code). Product_prices and warehouse_stock must exist for the warehouse the POS dropdown defaults to.

**Files**: scripts/seed-pos-test-data.ts, docs/user/manual-pos.md

---

### [024] Multi-UOM: Satuan di Pengaturan & Default Base (2026-03-02) ✅ COMPLETE

**Challenge**: User-defined UOMs; default base unit for new products; base unit per product needs no conversion; other UOMs convert to base.

**Solution**:
- **Schema**: `product_units.is_default_base` (boolean); migration + seed set PCS as default.
- **Pengaturan**: Tab "Satuan (UOM)" dengan CRUD (tambah, ubah, nonaktifkan); checkbox "Jadikan satuan dasar default"; hanya satu default.
- **API**: `GET/POST /api/settings/units`, `GET/PATCH/DELETE /api/settings/units/[id]`; `GET /api/inventory/units/default-base` untuk default base unit id.
- **Product form**: New product pre-selects base_unit_id from default base UOM.
- **ProductUnitService**: create, update, deactivate; enforce single default; deactivate moves default to fallback.

**Key Learning**: Base unit is per product; default base in Pengaturan is UX pre-selection for new products. Other UOMs require conversion to product's base unit.

**Files**: prisma/schema.prisma, lib/db/schema.sql, lib/db/migrate.ts, lib/services/product-unit-service.ts, app/api/settings/units/*, app/api/inventory/units/default-base/route.ts, components/settings/units-table.tsx, app/(dashboard)/dashboard/settings/page.tsx, app/(dashboard)/dashboard/inventory/products/new/page.tsx

---

### [025] Warehouse CRUD Test & List API BigInt Fix (2026-03-03) ✅ COMPLETE

**Challenge**: CRUD test for Warehouse (Gudang) via Chrome DevTools MCP; list API returned 500 due to BigInt serialization.

**Solution**:
- **CRUD test**: Login (pengurus/password), Create (WHCRUD01, Gudang CRUD Test), Read (list + edit form loads detail), Update (name → Gudang CRUD Test (Updated)) — all passed. Delete not in UI (warehouses use soft delete via deleted_at; no delete button).
- **Fix**: Warehouses list API (`GET /api/inventory/warehouses` without `?all=true`) did not serialize BigInt; added same serialization as `all` branch so `warehouses` array returns Number for id and other BigInt fields.

**Key Learning**: Paginated list responses must serialize BigInt same as `?all=true`; MEMORY [006] fix applied only to `all` branch, not the default list.

**Files**: app/api/inventory/warehouses/route.ts

---

### [023] Inventory Module: sales_price & CRUD Test (2026-03-02) ✅ COMPLETE

**Challenge**: Add sales price to inventory products; validate CRUD via Chrome DevTools MCP.

**Solution**:
- **Schema**: Added `sales_price` DECIMAL(15,2) NULL to products (Prisma + lib/db/schema.sql + ALTER for existing DB).
- **UI**: Harga jual field on create/edit forms; Harga Jual column in products table; Harga jual in product detail.
- **API**: ProductService create/update accept sales_price; products list and product GET serialize BigInt/Decimal for JSON (same pattern as MEMORY [006], [010]).
- **CRUD test**: Login (pengurus/password), Create (TEST001, 25.000), Read (list + detail), Update (name + 30.000) — all passed. Delete not in UI (products use soft delete via deleted_at).

**Key Learning**: After Prisma schema change, restart dev server or clear .next so Node picks up regenerated client. Products API must serialize BigInt and Prisma Decimal for JSON responses.

**Files**: prisma/schema.prisma, lib/db/schema.sql, lib/services/product-service.ts, app/api/inventory/products/route.ts, app/api/inventory/products/[id]/route.ts, app/(dashboard)/dashboard/inventory/products/*, components/inventory/products-table.tsx

---

### [022] Loan Payment Upload via Excel & Debit Account Selection (2026-02-26) ✅ COMPLETE

**Challenge**: Bulk record loan installment payments via Excel; allow staff to choose Kas vs Bank for debit (manual and batch).

**Solution**:
- **JournalService/LoanService**: `createLoanPaymentJournal(debitAccountId?)`, `recordPayment(debitAccountId?)` — default Kas (1010) when not set.
- **APIs**: `GET /api/loans/payments/debit-accounts` (codes 1010–1032); `POST /api/loans/payments/upload` (FormData: file, debit_account_id); `GET /api/loans/payments/upload/template`.
- **Excel format**: no pinjaman, angsuran ke, tanggal pembayaran (required); jumlah, metode, referensi, catatan (optional); blank rows skipped.
- **UI**: `LoanPaymentsUploadExcel` on loans page ("Upload Pembayaran"); manual payment modal in loan detail has debit account Select (default 1010 Kas di Kasir).

**Key Learning**: Reuse Simpanan debit-accounts pattern (same COA codes) for consistency. Chrome DevTools MCP validated upload and manual payment flows.

**Files**: lib/services/journal-service.ts, lib/services/loan-service.ts, app/api/loans/payments/debit-accounts/route.ts, app/api/loans/payments/upload/route.ts, components/loans/loan-payments-upload-excel.tsx, app/(dashboard)/dashboard/loans/[id]/page.tsx

---

### [021] Loan Excel Upload - Opening Balance / Migrasi (2026-02-26) ✅ COMPLETE

**Challenge**: Import pinjaman opening balance atau migrasi dari sistem lama via Excel.

**Solution**:
- **Mode A**: Pokok penuh, semua angsuran pending. Kolom: nomor anggota, pokok, tenor, bunga persen, metode bunga, tanggal cair.
- **Mode B**: Sisa pokok + jadwal sisa. Kolom tambahan: sisa pokok, angsuran terakhir dibayar.
- **Jurnal**: `createLoanOpeningBalanceJournal` — Debit Piutang (1211), Kredit Saldo Awal (3900). Akun 3900 di `lib/config/coa-codes.ts`.
- **API**: `POST /api/loans/upload`, `GET /api/loans/upload/template`. Permission: LOAN_CREATE.
- **UI**: `LoansUploadExcel` component di halaman Pinjaman; tombol "Upload Excel" + modal.

**Key Learning**: Nomor pinjaman auto-generate. Riwayat pembayaran tidak diimpor. LoanCalculator mendukung `startDate` opsional untuk Mode B (jadwal sisa dari tanggal yang benar).

**Files**: `lib/services/loan-service.ts` (importLoanFromExcelRow), `lib/services/journal-service.ts` (createLoanOpeningBalanceJournal), `lib/config/coa-codes.ts` (SALDO_AWAL 3900), `app/api/loans/upload/route.ts`, `components/loans/loans-upload-excel.tsx`

---

### [020] CoA Full Renumber (2026-02-26) ✅ COMPLETE

**Challenge**: Restructure Chart of Accounts to new first-digit grouping (1=Aset, 2=Hutang, 3=Equity, 4=Pendapatan, 5=HPP, 6=Beban Op, 7=Non-Op, 8=Lain-lain).

**Solution**:
- **Migration**: `scripts/migrate-coa-codes.ts` updates `chart_of_accounts.code` only (keep IDs); two-phase temp codes to avoid unique constraint.
- **Config**: `lib/config/coa-codes.ts` centralizes COA_CODES (KAS 1010, SIMPANAN_POKOK 3110, SIMPANAN_WAJIB 3111, SIMPANAN_SUKARELA 2110, PENDAPATAN_BUNGA 4110, PENDAPATAN_PENJUALAN 4210).
- **Services**: JournalService, POS service use COA_CODES; debit accounts API filter `code in ['1010','1020','1030','1031','1032']`.
- **Seed**: `lib/data/coa-seed.ts` rewritten with new codes; expense categories mapped to 6226 (ATK), 6227 (UMUM/OPERASIONAL).

**Key Learning**: Code renumber only—no FK updates. `journal_entry_lines.account_id` references `id`; codes are display/sort only. Two-phase migration (old→TMP→new) avoids cyclic unique constraint violations.

**Files**: `scripts/migrate-coa-codes.ts`, `lib/config/coa-codes.ts`, `lib/data/coa-seed.ts`, `lib/services/journal-service.ts`, `lib/services/pos-service.ts`, `app/api/savings/debit-accounts/route.ts`, `docs/coa-restructure-recommendations.md`

---

### [019] Navbar Display & Auth Session Accuracy (2026-02-23) ✅ COMPLETE

**Challenge**: Ensure user name and role displayed in top-right navbar accurately reflect logged-in user; session.user.name could be missing or stale when JWT did not explicitly persist name/email.

**Solution**:
- **Header**: Display `session.user.name` and role(s) (ROLE_NAMES mapping) top-right; responsive (hidden on sm).
- **Auth config**: Explicitly persist `token.name` and `token.email` in jwt callback; pass to `session.user` in session callback.
- **Display name source**: For users with `member_id` (anggota), use `member.name` (source of truth per module review); for staff, use `users.name`. Auth authorize includes `member: { select: { id, name } }` and returns `displayName = u.member?.name ?? u.name`.

**Key Learning**: Auth.js JWT callback must explicitly persist all session-needed fields; default merge may not reliably include name/email for credentials provider. Member as source of truth for anggota profile ensures consistency with member portal.

**Files**: `components/layout/header.tsx`, `lib/auth/config.ts`

---

### [018] Pinjaman Module Test & Missing Routes (2026-02-22) ✅ COMPLETE

**Challenge**: Test Pinjaman module via Chrome DevTools MCP; identify and resolve gaps.

**Solution**:
- Test: Login (pengurus), loans list, API 200; `/dashboard/loans/new` and `/dashboard/loans/[id]` returned 404
- **Resolved**: Created `/dashboard/loans/new` (application form with member select, amount, tenor, purpose); `/dashboard/loans/[id]` (loan detail, schedules table, Catat Pembayaran modal)
- APIs: `GET /api/loans/[id]` (loan + schedules), `POST /api/loans/[id]/payments` (record payment)

**Key Learning**: Member select pattern from savings-accounts-list (fetchMembers, onSearch, status=active). Payment form: payment_amount, principal_amount, interest_amount, payment_date, payment_method.

**Files**: app/(dashboard)/dashboard/loans/new/page.tsx, app/(dashboard)/dashboard/loans/[id]/page.tsx, app/api/loans/[id]/route.ts, app/api/loans/[id]/payments/route.ts, docs/pinjaman-module-test-report.md

---

### [017] Vitest Testing & Single .env (2026-02-22) ✅ COMPLETE

**Challenge**: Add tests for Simpanan improvements; simplify env to single .env file.

**Solution**:
- **Vitest**: Added vitest, vitest.config.ts; unit tests for `generateAccountNumber` (SAV{letter}{member_id_6}{urutan_2}) and `getDatabaseConfig` (DATABASE_URL parsing, DB_* fallback)
- **Extracted modules**: `lib/utils/savings-account-number.ts`, `lib/db/get-database-config.ts` for testability
- **Single .env**: Scripts load only `.env`; removed .env.local; .gitignore allows .env.example
- **Bug fixes**: upload route batch null check; journal-service kasId→debitAccountId

**Key Learning**: Extract pure logic to separate modules for unit testing; getDatabaseConfig config object bypasses mariadb URL parsing issues.

**Files**: `vitest.config.ts`, `lib/utils/savings-account-number.ts`, `lib/db/get-database-config.ts`, `lib/utils/__tests__/*`, `lib/db/__tests__/*`, `scripts/*`, `.gitignore`, `package.json` (test script)

---

### [016] Scripts: Prisma config object for DATABASE_URL (2026-02-21) ✅ COMPLETE

**Challenge**: `ensure-savings-accounts` script failed with "Access denied (using password: NO)" and "error parsing connection string" despite correct credentials.

**Solution**: Parse DATABASE_URL into config object (host, port, user, password, database) for PrismaMariaDb adapter; bypasses mariadb driver URL parsing. Fallback to DB_PASSWORD when URL has no password. Single .env used by all scripts.

**Key Learning**: PrismaMariaDb accepts config object; mariadb driver URL parsing can fail with certain formats. lib/db/get-database-config.ts parses mysql:// URL via URL constructor.

**Files**: `lib/db/get-database-config.ts`, `lib/db/prisma.ts`, `scripts/ensure-member-savings-accounts.ts`

---

### [015] Simpanan Account Format & Debit Selection (2026-02-21) ✅ COMPLETE

**Challenge**: Standardize savings account numbers, auto-create 3 accounts per member, allow debit account selection on Excel upload.

**Solution**:
- **Account format**: `SAV{letter}{member_id_6}{urutan_2}` (e.g. SAVP00000401 for POKOK, member 4). Letter: P=POKOK, W=WAJIB, S=SUKARELA.
- **Member creation**: Auto-create POKOK, WAJIB, SUKARELA accounts when member is approved (member-service.ts).
- **Upload modal**: Debit account Select fetches COA accounts with code 10xx (Kas/Bank); passed to createSavingsJournal; default KAS (1010) if not set.
- **Existing members**: Run `npm run ensure-savings-accounts` to create missing accounts.

**Key Learning**: JournalService.createSavingsJournal accepts optional debitAccountId; COA cash/bank accounts use 10xx codes.

**Files**: `lib/services/savings-service.ts`, `lib/services/member-service.ts`, `lib/services/journal-service.ts`, `app/api/savings/debit-accounts/route.ts`, `app/api/savings/upload/route.ts`, `components/savings/savings-upload-excel.tsx`, `scripts/ensure-member-savings-accounts.ts`, `docs/user/manual-simpanan.md`

---

### [014] Simpanan Batch Deletion (2026-02-21) ✅ COMPLETE

**Challenge**: Allow deleting specific upload batches when Excel upload was mistaken, instead of only "delete all".

**Solution**:
- **savings_upload_batches** table: id, filename, transaction_count, success_count, failed_count, uploaded_at, uploaded_by
- **savings_transactions.upload_batch_id**: nullable FK to batch; set when created via Excel upload
- **journal_entries.reference_type/reference_id**: 'savings_upload_batch' + batch_id for upload-created journals
- **APIs**: GET /api/savings/batches (list), DELETE /api/savings/batches/[id] (delete batch: reverse balances, delete journals, delete transactions, delete batch)
- **UI**: Batch list in upload modal with "Hapus" per batch; "Hapus Semua Transaksi" remains for full clear

**Key Learning**: Use reference_type/reference_id on journal_entries for batch linkage; recalc account balances by summing batch transaction amounts before delete.

**Files**: `prisma/schema.prisma`, `lib/services/savings-service.ts`, `lib/services/journal-service.ts`, `app/api/savings/upload/route.ts`, `app/api/savings/batches/route.ts`, `app/api/savings/batches/[id]/route.ts`, `components/savings/savings-upload-excel.tsx`

---

### [013] Audit Log & Monitoring Feature (2026-02-18) ✅ COMPLETE

**Challenge**: Implement full audit log feature and monitoring (who's online, member activity stats) per plan.

**Solution**:
- **Permissions**: ADMIN_AUDIT (superadmin, manager, pengawas), ADMIN_MONITORING (superadmin, manager, pengurus, pengawas)
- **AuditService**: Extended log() with ip_address, user_agent; added listLogs() with filters; getRequestContext() helper
- **Audit coverage**: user (create/update/delete), member (create/update/approve), loan (approve, payment), savings (deposit/withdraw/account_create), journal.post, cash_expense.create, stock movements, settings (cooperative_config)
- **Audit UI**: GET /api/audit-logs, /dashboard/audit-logs page with filters
- **Monitoring**: user_activity table; heartbeat (POST /api/monitoring/heartbeat) from useHeartbeat hook every 2 min; GET /api/monitoring/online-users, /api/monitoring/member-activity; /dashboard/monitoring page (Who's Online + Member Activity stats)

**Key Learning**: Prisma.membersWhereInput type assertion for dynamic OR conditions; useHeartbeat in both dashboard and member layouts for activity tracking.

**Files**: `lib/auth/permissions.ts`, `lib/services/audit-service.ts`, `lib/services/monitoring-service.ts`, `lib/services/user-service.ts`, `lib/services/member-service.ts`, `lib/services/loan-service.ts`, `lib/services/savings-service.ts`, `lib/services/stock-service.ts`, `lib/services/settings-service.ts`, `app/api/audit-logs/route.ts`, `app/api/monitoring/*`, `app/(dashboard)/dashboard/audit-logs/page.tsx`, `app/(dashboard)/dashboard/monitoring/page.tsx`, `components/audit/audit-logs-table.tsx`, `components/monitoring/*`, `lib/hooks/use-heartbeat.ts`, `prisma/schema.prisma` (user_activity, audit_logs relation)

---

### [012] Member Module: Nomor Anggota, Projects & Departments, Ant Design Fixes (2026-02-18) ✅ COMPLETE

**Challenge**: Extend member module with Nomor Anggota (unique, nullable), project and department selections; fix Ant Design deprecations; production build TypeScript error.

**Solution**:
- **Nomor Anggota**: Added `member_number` (unique, nullable) to members; list, detail, new, edit forms; search; P2002 handling for duplicate
- **Projects & Departments**: New `departments` table (code, name); Projects CRUD already had schema; both in Pengaturan tabs (Proyek, Departemen) with full CRUD; member forms get project_id/department_id Select from GET /api/projects, /api/departments (MEMBER_VIEW)
- **Ant Design**: Modal `destroyOnClose` → `destroyOnHidden` (deprecation); member orders new page `message` → `App.useApp()`; order detail Table `rowKey` index → `rowKey="id"` (item id from API)
- **Build fix**: Added `department_id` to `MemberFormData` interface in members/new/page.tsx

**Key Learning**: When adding form fields that POST to API, ensure the form values interface includes all fields used in the request body to avoid production build TypeScript errors.

**Files**: `prisma/schema.prisma`, `lib/services/member-service.ts`, `lib/services/project-service.ts`, `lib/services/department-service.ts`, `app/api/settings/projects/*`, `app/api/settings/departments/*`, `app/api/projects/route.ts`, `app/api/departments/route.ts`, `components/settings/projects-table.tsx`, `components/settings/departments-table.tsx`, `app/(dashboard)/dashboard/settings/page.tsx`, `app/(dashboard)/dashboard/members/*`, `components/members/members-table.tsx`, `app/(member)/member/orders/new/page.tsx`, `app/(member)/member/orders/[id]/page.tsx`, `lib/services/order-service.ts`

---

### [011] Pengaturan Module Implementation & Production Build Fix (2026-02-17) ✅ COMPLETE

**Challenge**: Replace "Modul dalam pengembangan" placeholder with functional Settings; production build failed with "Property 'cooperative_config' does not exist on PrismaClient".

**Solution**:
- Implemented Pengaturan per plan: user preferences (theme, language, notifications), savings/loan interest rates CRUD, cooperative config (cooperative_config table); ADMIN_SETTINGS for sidebar and page access
- Fixed production build: add `prisma generate` before `next build` in package.json so Prisma client is regenerated from current schema before TypeScript compile

**Key Learning**: On production, Prisma client may be stale if schema changed but generate wasn't run (e.g. cached node_modules, different deploy flow). Build script should explicitly run `prisma generate` before build to ensure types match schema.

**Files**: `package.json` (build script), `lib/services/settings-service.ts`, `app/api/settings/*`, `components/settings/*`, `prisma/schema.prisma`, `components/layout/sidebar.tsx`

---

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
- Sidebar uses useMenuItems() with useSession + hasPermission to show "Pengguna" for Superadmin, Manager, Pengurus
- Page-level redirect when user lacks ADMIN_USERS; Chrome DevTools MCP test validated full CRUD and self-delete protection

**Key Learning**: Permission-based sidebar visibility (`hasPermission(roles, PERMISSIONS.ADMIN_USERS)`) provides consistent UX—users see only menus they can access. Self-delete guard in API (not just UI) prevents accidental lockout even if client is bypassed.

**Files**: `lib/services/user-service.ts`, `app/api/users/*`, `app/api/roles/route.ts`, `components/users/*`, `components/layout/sidebar.tsx`

---

### [007b] Pengurus Users Module Access (2026-02-11) ✅ COMPLETE

**Challenge**: Allow pengurus role to manage users module (CRUD, role assignment).

**Solution**: Added `PERMISSIONS.ADMIN_USERS` to `pengurus` in `ROLE_PERMISSIONS` (`lib/auth/permissions.ts`). All guards (sidebar, pages, API) use `hasPermission(roles, PERMISSIONS.ADMIN_USERS)`—no other changes needed.

**Key Learning**: RBAC is centralized in permissions.ts; adding a permission to a role grants access everywhere that permission is checked.

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
