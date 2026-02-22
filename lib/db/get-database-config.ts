export function getDatabaseConfig():
  | string
  | { host: string; port: number; user: string; password: string; database: string } {
  const url = process.env.DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('mysql://')) {
    try {
      const parsed = new URL(url.replace(/^mysql:\/\//, 'http://'));
      const password = decodeURIComponent(parsed.password || '') || (process.env.DB_PASSWORD ?? '');
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? parseInt(parsed.port, 10) : 3306,
        user: decodeURIComponent(parsed.username || 'root'),
        password,
        database: (parsed.pathname || '/maju_app').replace(/^\//, '') || 'maju_app',
      };
    } catch {
      return url;
    }
  }
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'maju_app',
  };
}
