import "dotenv/config";
import { defineConfig } from "prisma/config";

function getDatabaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (url && url.startsWith("mysql://")) return url;
  const host = process.env["DB_HOST"] ?? "localhost";
  const port = process.env["DB_PORT"] ?? "3306";
  const user = process.env["DB_USER"] ?? "root";
  const password = process.env["DB_PASSWORD"] ?? "";
  const database = process.env["DB_NAME"] ?? "maju_app";
  const encoded = encodeURIComponent(password);
  return `mysql://${user}:${encoded}@${host}:${port}/${database}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
