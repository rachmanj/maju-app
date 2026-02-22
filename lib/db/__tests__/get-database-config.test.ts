import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabaseConfig } from '../get-database-config';

const originalEnv = process.env;

describe('getDatabaseConfig', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses DATABASE_URL mysql:// into config object', () => {
    process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/maju_app';
    const config = getDatabaseConfig();
    expect(config).toEqual({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'maju_app',
    });
  });

  it('uses DB_PASSWORD when URL has no password', () => {
    process.env.DATABASE_URL = 'mysql://root@localhost:3306/maju_app';
    process.env.DB_PASSWORD = 'secret';
    const config = getDatabaseConfig();
    expect(config).toEqual({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'secret',
      database: 'maju_app',
    });
  });

  it('falls back to DB_* vars when DATABASE_URL not set', () => {
    delete process.env.DATABASE_URL;
    process.env.DB_HOST = 'db.example.com';
    process.env.DB_PORT = '3307';
    process.env.DB_USER = 'admin';
    process.env.DB_PASSWORD = 'adminpass';
    process.env.DB_NAME = 'testdb';
    const config = getDatabaseConfig();
    expect(config).toEqual({
      host: 'db.example.com',
      port: 3307,
      user: 'admin',
      password: 'adminpass',
      database: 'testdb',
    });
  });

  it('uses defaults when no env vars set', () => {
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    const config = getDatabaseConfig();
    expect(config).toEqual({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'maju_app',
    });
  });
});
