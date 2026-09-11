import { Prisma } from '@prisma/client';

const CONSTRAINT_LABELS: Record<string, string> = {
  products_code_key: 'Kode produk',
  products_barcode_key: 'Barcode produk',
  product_categories_code_key: 'Kode kategori',
  product_units_code_key: 'Kode satuan',
  warehouses_code_key: 'Kode gudang',
  consignment_suppliers_code_key: 'Kode supplier',
  members_member_number_key: 'Nomor anggota',
  users_email_key: 'Email',
  users_username_key: 'Username',
  loans_loan_number_key: 'Nomor pinjaman',
  journal_entries_entry_number_key: 'Nomor jurnal',
  savings_accounts_account_number_key: 'Nomor rekening simpanan',
};

const FIELD_LABELS: Record<string, string> = {
  code: 'Kode',
  barcode: 'Barcode',
  name: 'Nama',
  email: 'Email',
  username: 'Username',
  member_number: 'Nomor anggota',
  account_number: 'Nomor rekening',
  loan_number: 'Nomor pinjaman',
  entry_number: 'Nomor jurnal',
  device_code: 'Kode device',
  phone: 'Nomor telepon',
};

const MODEL_LABELS: Record<string, string> = {
  products: 'produk',
  product_categories: 'kategori',
  product_units: 'satuan',
  warehouses: 'gudang',
  consignment_suppliers: 'supplier',
  members: 'anggota',
  users: 'pengguna',
  loans: 'pinjaman',
  journal_entries: 'jurnal',
  savings_accounts: 'rekening simpanan',
};

function isPrismaKnownError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string')
  );
}

function getPrismaCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

function getPrismaMeta(error: unknown): Record<string, unknown> | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.meta as Record<string, unknown> | undefined;
  }
  if (typeof error === 'object' && error !== null && 'meta' in error) {
    const meta = (error as { meta: unknown }).meta;
    if (meta && typeof meta === 'object') return meta as Record<string, unknown>;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return undefined;
}

function extractConstraintFromMessage(message: string): string | undefined {
  const constraintMatch = message.match(/constraint:\s*[`']?([^`'\s]+)[`']?/i);
  if (constraintMatch?.[1]) return constraintMatch[1];

  const fieldsMatch = message.match(/fields:\s*\(`([^`]+)`\)/i);
  if (fieldsMatch?.[1]) return fieldsMatch[1];

  return undefined;
}

function inferModelFromMessage(message: string): string | undefined {
  const match = message.match(/prisma\.(\w+)\./i);
  return match?.[1];
}

function normalizeTargetValue(target: unknown): string | string[] | undefined {
  if (target == null) return undefined;
  if (Array.isArray(target)) {
    if (target.length === 0) return undefined;
    return target.map(String);
  }
  if (typeof target === 'string') return target;
  return String(target);
}

function resolveTargetFromMeta(
  meta: Record<string, unknown> | undefined,
  message?: string
): string | string[] | undefined {
  let target = normalizeTargetValue(meta?.target);

  if (!target && meta?.driverAdapterError) {
    const adapterError = meta.driverAdapterError as {
      cause?: { constraint?: { index?: string; fields?: string[] } };
    };
    const index = adapterError.cause?.constraint?.index;
    const fields = adapterError.cause?.constraint?.fields;
    if (fields?.length) target = fields;
    else if (index) target = index;
  }

  if (!target && message) {
    const fromMessage = extractConstraintFromMessage(message);
    if (fromMessage) target = fromMessage;
  }

  return target;
}

function parseConstraintName(name: string): string | null {
  let base = name.trim();
  if (!base) return null;

  if (base.endsWith('_key')) base = base.slice(0, -4);

  if (base.includes('.')) {
    const [table, field] = base.split('.', 2);
    const fieldLabel = FIELD_LABELS[field] || field;
    const modelLabel = MODEL_LABELS[table] || table.replace(/_/g, ' ');
    return `${fieldLabel} ${modelLabel}`;
  }

  const fieldKeys = Object.keys(FIELD_LABELS).sort((a, b) => b.length - a.length);
  for (const field of fieldKeys) {
    const suffix = `_${field}`;
    if (base.endsWith(suffix)) {
      const table = base.slice(0, -suffix.length);
      const fieldLabel = FIELD_LABELS[field];
      const modelLabel = MODEL_LABELS[table] || table.replace(/_/g, ' ');
      return `${fieldLabel} ${modelLabel}`;
    }
  }

  return null;
}

function labelFromFieldNames(fields: string[], meta?: Record<string, unknown>, message?: string): string {
  if (fields.length === 1) {
    const field = fields[0];
    const modelName =
      (typeof meta?.modelName === 'string' ? meta.modelName : undefined) ||
      (message ? inferModelFromMessage(message) : undefined);

    if (modelName) {
      const fieldLabel = FIELD_LABELS[field] || field;
      const modelLabel = MODEL_LABELS[modelName] || modelName.replace(/_/g, ' ');
      return `${fieldLabel} ${modelLabel}`;
    }

    if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  }

  const labels = fields.map((field) => FIELD_LABELS[field] || field);
  return labels.join(', ');
}

function resolveUniqueConstraintLabel(error: unknown): string {
  const meta = getPrismaMeta(error);
  const message = getErrorMessage(error);
  const target = resolveTargetFromMeta(meta, message);

  if (!target) {
    return 'Data dengan nilai tersebut';
  }

  if (typeof target === 'string') {
    if (CONSTRAINT_LABELS[target]) return CONSTRAINT_LABELS[target];

    const parsed = parseConstraintName(target);
    if (parsed) return parsed;

    return 'Data dengan nilai tersebut';
  }

  if (target.length === 1) {
    const single = target[0];
    if (CONSTRAINT_LABELS[single]) return CONSTRAINT_LABELS[single];

    const parsed = parseConstraintName(single);
    if (parsed) return parsed;

    return labelFromFieldNames([single], meta, message);
  }

  const constraintKey = target.join('_');
  if (CONSTRAINT_LABELS[constraintKey]) return CONSTRAINT_LABELS[constraintKey];

  return labelFromFieldNames(target, meta, message);
}

export function mapPrismaError(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 500
): { message: string; status: number } {
  if (isPrismaKnownError(error)) {
    const code = getPrismaCode(error);

    switch (code) {
      case 'P2002': {
        const label = resolveUniqueConstraintLabel(error);
        if (label === 'Data dengan nilai tersebut') {
          return {
            message: 'Data dengan nilai tersebut sudah ada. Gunakan nilai yang berbeda.',
            status: 400,
          };
        }
        return {
          message: `${label} sudah digunakan. Gunakan nilai lain.`,
          status: 400,
        };
      }
      case 'P2025':
        return { message: 'Data yang diminta tidak ditemukan.', status: 404 };
      case 'P2003':
        return { message: 'Data terkait tidak ditemukan atau tidak valid.', status: 400 };
      case 'P2000':
        return { message: 'Nilai yang dimasukkan terlalu panjang.', status: 400 };
      case 'P2011':
      case 'P2014':
        return { message: 'Data wajib belum lengkap. Periksa kembali isian Anda.', status: 400 };
      case 'P2005':
      case 'P2006':
        return { message: 'Nilai yang dimasukkan tidak valid.', status: 400 };
      default:
        break;
    }
  }

  const message = getErrorMessage(error);
  if (message) {
    return { message, status: fallbackStatus };
  }

  return { message: fallbackMessage, status: fallbackStatus };
}
