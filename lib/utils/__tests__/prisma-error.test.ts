import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { mapPrismaError } from '../prisma-error';

function makeP2002(target: string | string[], extraMeta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '5.0.0',
    meta: { target, ...extraMeta },
  });
}

describe('mapPrismaError', () => {
  it('maps P2002 with meta.target [code] on products to 400 with Kode produk message', () => {
    const error = makeP2002(['code'], { modelName: 'products' });
    const result = mapPrismaError(error, 'Gagal membuat produk');
    expect(result.status).toBe(400);
    expect(result.message).toContain('Kode produk sudah digunakan');
  });

  it('maps P2002 with meta.target string members_member_number_key', () => {
    const error = makeP2002('members_member_number_key');
    const result = mapPrismaError(error, 'Gagal membuat anggota');
    expect(result.status).toBe(400);
    expect(result.message).toContain('Nomor anggota sudah digunakan');
  });

  it('maps P2025 to 404', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
    const result = mapPrismaError(error, 'Gagal mengambil data');
    expect(result.status).toBe(404);
    expect(result.message).toBe('Data yang diminta tidak ditemukan.');
  });

  it('preserves business error message with fallback status', () => {
    const error = new Error('Stok tidak cukup');
    const result = mapPrismaError(error, 'Gagal memproses');
    expect(result.status).toBe(500);
    expect(result.message).toBe('Stok tidak cukup');
  });

  it('uses fallbackMessage when error has no message', () => {
    const result = mapPrismaError({}, 'Gagal menyimpan data');
    expect(result.status).toBe(500);
    expect(result.message).toBe('Gagal menyimpan data');
  });
});
