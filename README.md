# Maju App

A modern Next.js boilerplate with TypeScript, MySQL, and shadcn-ui.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **MySQL** - Relational database
- **shadcn-ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your database connection in `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=maju_app
```

3. Create your MySQL database:
```sql
CREATE DATABASE maju_app;
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
maju-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ui/               # shadcn-ui components
├── lib/                   # Utility functions
│   ├── db.ts             # MySQL connection pool
│   └── utils.ts          # Utility functions
└── .env.local            # Environment variables (not committed)
```

## Database Connection

The MySQL connection is configured in `lib/db.ts` using a connection pool. You can use it in your API routes:

```typescript
import db from '@/lib/db';

export async function GET() {
  const [rows] = await db.query('SELECT * FROM your_table');
  return Response.json(rows);
}
```

## Adding shadcn-ui Components

To add new shadcn-ui components:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add input
```

## Database Migration

After configuring your database in `.env.local`, run the migration:

```bash
npm run migrate
```

This will:
- Create all database tables
- Seed default roles, savings types, and Chart of Accounts
- Create default admin user

**Default Admin Credentials** (change after first login):
- Email: `admin@koperasimaju.com`
- Password: `admin123`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run migrate` - Run database migration
- `npm run create-admin` - Create additional admin user

## Environment Variables

Copy `.env.example` to `.env.local` and update with your configuration:

- `DB_HOST` - MySQL host (default: localhost)
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - MySQL database name
- `NEXT_PUBLIC_APP_URL` - Application URL (default: http://localhost:3000)

## License

MIT
