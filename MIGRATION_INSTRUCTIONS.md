# Database Migration Instructions

## Quick Start

1. **Ensure your `.env.local` file is configured** with database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=maju_app

NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

2. **Create the database** (if not exists):
```sql
CREATE DATABASE maju_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **Run the migration**:
```bash
npm run migrate
```

## What the Migration Does

The migration script (`npm run migrate`) will:

1. ✅ Create all database tables (users, roles, members, savings, loans, etc.)
2. ✅ Insert 6 default roles:
   - Superadmin
   - Manager
   - Pengurus
   - Kasir
   - Pengawas
   - Anggota
3. ✅ Insert 3 savings types:
   - Simpanan Pokok (Rp 200,000)
   - Simpanan Wajib (Rp 100,000/month)
   - Simpanan Sukarela (flexible)
4. ✅ Insert ~150+ Chart of Accounts
5. ✅ Create default admin user

## Default Admin User

After migration, you can login with:

- **Email**: `admin@koperasimaju.com` (or `ADMIN_EMAIL` from `.env.local`)
- **Password**: `admin123` (or `ADMIN_PASSWORD` from `.env.local`)

⚠️ **IMPORTANT**: Change the password immediately after first login!

## Alternative: Manual Migration via API

If your development server is running, you can also trigger migration via API:

```bash
# Using curl (Linux/Mac)
curl -X POST http://localhost:3000/api/migrate

# Using PowerShell (Windows)
Invoke-WebRequest -Uri http://localhost:3000/api/migrate -Method POST
```

## Troubleshooting

### Error: "Access denied for user"
- Check your database credentials in `.env.local`
- Verify MySQL is running
- Ensure the database user has proper permissions

### Error: "Database doesn't exist"
- Create the database first: `CREATE DATABASE maju_app;`

### Error: "Table already exists"
- The migration uses `CREATE TABLE IF NOT EXISTS`, so existing tables won't be overwritten
- If you need to reset, drop the database and recreate it

### Admin user not created
- Check migration logs for errors
- Verify roles table has 'superadmin' role
- Run `npm run create-admin` manually

## Next Steps

After successful migration:

1. Start the dev server: `npm run dev`
2. Navigate to: http://localhost:3000/login
3. Login with admin credentials
4. Change admin password
5. Start using the system!

For detailed setup instructions, see `docs/setup-guide.md`
