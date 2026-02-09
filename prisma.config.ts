import "dotenv/config";
import { defineConfig } from "prisma/config";

function getDatabaseUrl(): string {
  let url = process.env["DATABASE_URL"];
  if (!url || !url.startsWith("mysql://")) {
    const host = process.env["DB_HOST"] ?? "localhost";
    const port = process.env["DB_PORT"] ?? "3306";
    const user = process.env["DB_USER"] ?? "root";
    const password = process.env["DB_PASSWORD"] ?? "";
    const database = process.env["DB_NAME"] ?? "maju_app";
    const encoded = encodeURIComponent(password);
    url = `mysql://${user}:${encoded}@${host}:${port}/${database}`;
  }
  const param = "allowPublicKeyRetrieval=true";
  return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
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
