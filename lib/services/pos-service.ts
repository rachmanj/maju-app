import { prisma } from '@/lib/db/prisma';
import { MemberService } from './member-service';
import { ProductService } from './product-service';
import { StockService } from './stock-service';
import { SavingsService } from './savings-service';
import { JournalService } from './journal-service';

const PAYMENT_CASH = 'cash';
const PAYMENT_POTONG_GAJI = 'potong_gaji';
const PAYMENT_SIMPANAN = 'simpanan';

export class POSService {
  static async listDevices(): Promise<{ id: number; code: string; name: string; is_active: boolean }[]> {
    const rows = await prisma.pos_devices.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true, is_active: true },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      code: r.code,
      name: r.name,
      is_active: r.is_active ?? true,
    }));
  }

  static async registerDevice(data: { code: string; name: string; device_fingerprint?: string }): Promise<number> {
    const row = await prisma.pos_devices.create({
      data: {
        code: data.code,
        name: data.name,
        device_fingerprint: data.device_fingerprint ?? null,
      },
    });
    return Number(row.id);
  }

  static async validateDevice(deviceId: number): Promise<boolean> {
    const device = await prisma.pos_devices.findFirst({
      where: { id: deviceId, is_active: true },
    });
    return !!device;
  }

  static async openSession(deviceId: number, userId: number, openingCash?: number): Promise<number> {
    const isValid = await this.validateDevice(deviceId);
    if (!isValid) throw new Error('Device not registered or inactive');

    const existing = await prisma.pos_sessions.findFirst({
      where: { device_id: deviceId, status: 'open' },
    });
    if (existing) throw new Error('Session already open for this device');

    const session = await prisma.pos_sessions.create({
      data: {
        device_id: deviceId,
        user_id: userId,
        opening_cash: openingCash ?? 0,
        status: 'open',
      },
    });
    return Number(session.id);
  }

  static async closeSession(sessionId: number, closingCash: number): Promise<void> {
    const session = await prisma.pos_sessions.findFirst({
      where: { id: sessionId, status: 'open' },
    });
    if (!session) throw new Error('Session not found or already closed');

    await prisma.pos_sessions.update({
      where: { id: sessionId },
      data: { closed_at: new Date(), closing_cash: closingCash, status: 'closed' },
    });
  }

  static async getActiveSession(deviceId: number): Promise<{ id: number; opened_at: Date } | null> {
    const session = await prisma.pos_sessions.findFirst({
      where: { device_id: deviceId, status: 'open' },
      select: { id: true, opened_at: true },
    });
    return session ? { id: Number(session.id), opened_at: session.opened_at } : null;
  }

  static async lookupMember(barcodeOrEmail: string): Promise<{ id: number; name: string; limit: number; has_pin: boolean } | null> {
    const trimmed = barcodeOrEmail.trim();
    if (!trimmed) return null;

    const barcodeMatch = await prisma.member_barcodes.findFirst({
      where: {
        barcode: trimmed,
        is_active: true,
        member: { status: 'active', deleted_at: null },
      },
      include: { member: true },
    });
    if (barcodeMatch?.member) {
      const limit = await MemberService.getPurchaseLimit(Number(barcodeMatch.member_id));
      const hasPin = !!(await prisma.member_pins.findUnique({ where: { member_id: barcodeMatch.member_id } }));
      return {
        id: Number(barcodeMatch.member_id),
        name: barcodeMatch.member.name,
        limit,
        has_pin: hasPin,
      };
    }

    const emailMatch = await prisma.members.findFirst({
      where: { email: trimmed, status: 'active', deleted_at: null },
    });
    if (emailMatch) {
      const limit = await MemberService.getPurchaseLimit(Number(emailMatch.id));
      const hasPin = !!(await prisma.member_pins.findUnique({ where: { member_id: emailMatch.id } }));
      return {
        id: Number(emailMatch.id),
        name: emailMatch.name,
        limit,
        has_pin: hasPin,
      };
    }
    return null;
  }

  static async getProductForPOS(productId: number, warehouseId: number): Promise<{
    id: number;
    code: string;
    name: string;
    barcode: string | null;
    base_unit_id: number;
    base_unit_code: string;
    quantity: number;
    prices: { unit_id: number; unit_code: string; price: number }[];
  } | null> {
    const product = await ProductService.getById(productId);
    if (!product || !product.is_active) return null;

    const stock = await StockService.getQuantity(warehouseId, productId);
    const prices = await ProductService.getPrices(productId, warehouseId);
    const basePrices = prices.length > 0 ? prices : await ProductService.getPrices(productId);

    const priceList = basePrices.slice(0, 10).map((p) => ({
      unit_id: p.unit_id,
      unit_code: p.unit_code ?? '',
      price: p.price,
    }));

    return {
      id: Number(product.id),
      code: product.code,
      name: product.name,
      barcode: product.barcode ?? null,
      base_unit_id: product.base_unit_id,
      base_unit_code: product.base_unit_code ?? '',
      quantity: stock,
      prices: priceList,
    };
  }

  static async lookupProductByBarcode(barcode: string, warehouseId: number): Promise<{
    id: number;
    code: string;
    name: string;
    base_unit_id: number;
    base_unit_code: string;
    quantity: number;
    unit_price: number;
    unit_id: number;
    unit_code: string;
  } | null> {
    const product = await prisma.products.findFirst({
      where: { barcode, deleted_at: null, is_active: true },
      include: { base_unit: { select: { id: true, code: true } } },
    });
    if (!product) return null;

    const stock = await StockService.getQuantity(warehouseId, Number(product.id));
    const prices = await ProductService.getPrices(Number(product.id), warehouseId);
    const price = prices.length > 0 ? prices[0] : (await ProductService.getPrices(Number(product.id)))[0];
    if (!price) return null;

    return {
      id: Number(product.id),
      code: product.code,
      name: product.name,
      base_unit_id: product.base_unit_id,
      base_unit_code: product.base_unit.code,
      quantity: stock,
      unit_price: price.price,
      unit_id: price.unit_id,
      unit_code: price.unit_code ?? '',
    };
  }

  static async searchProducts(warehouseId: number, query: string, limit = 20): Promise<
    { id: number; code: string; name: string; barcode: string | null; quantity: number; unit_price: number; unit_id: number; unit_code: string }[]
  > {
    const products = await prisma.products.findMany({
      where: {
        deleted_at: null,
        is_active: true,
        OR: [
          { name: { contains: query } },
          { code: { contains: query } },
          { barcode: { contains: query } },
        ],
      },
      take: limit,
      include: { base_unit: { select: { id: true, code: true } } },
    });

    const result: { id: number; code: string; name: string; barcode: string | null; quantity: number; unit_price: number; unit_id: number; unit_code: string }[] = [];
    for (const p of products) {
      const stock = await StockService.getQuantity(warehouseId, Number(p.id));
      const prices = await ProductService.getPrices(Number(p.id), warehouseId);
      const price = prices.length > 0 ? prices[0] : (await ProductService.getPrices(Number(p.id)))[0];
      if (price) {
        result.push({
          id: Number(p.id),
          code: p.code,
          name: p.name,
          barcode: p.barcode,
          quantity: stock,
          unit_price: price.price,
          unit_id: price.unit_id,
          unit_code: price.unit_code ?? p.base_unit.code,
        });
      }
    }
    return result;
  }

  static async checkout(params: {
    sessionId: number;
    memberId: number;
    warehouseId: number;
    items: { product_id: number; quantity: number; unit_id: number; unit_price: number }[];
    paymentMethod: typeof PAYMENT_CASH | typeof PAYMENT_POTONG_GAJI | typeof PAYMENT_SIMPANAN;
    pin?: string;
    discountAmount?: number;
    createdBy?: number;
  }): Promise<{ transaction_number: string; transaction_id: number }> {
    if (params.items.length === 0) throw new Error('Cart is empty');

    const member = await MemberService.getMemberById(params.memberId);
    if (!member || member.status !== 'active') throw new Error('Member not found or inactive');

    const subtotal = params.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const discount = params.discountAmount ?? 0;
    const total = Math.max(0, subtotal - discount);

    if (params.paymentMethod === PAYMENT_POTONG_GAJI) {
      const limit = await MemberService.getPurchaseLimit(params.memberId);
      const existingReceivables = await prisma.member_receivables.aggregate({
        where: { member_id: params.memberId, status: 'pending' },
        _sum: { amount: true },
      });
      const currentReceivable = Number(existingReceivables._sum.amount ?? 0);
      if (currentReceivable + total > limit) {
        throw new Error(`Limit pembelanjaan terlampaui. Limit: Rp ${limit.toLocaleString('id-ID')}, Piutang saat ini: Rp ${currentReceivable.toLocaleString('id-ID')}`);
      }
      if (!params.pin) throw new Error('PIN diperlukan untuk pembayaran Potong Gaji');
      const pinValid = await MemberService.verifyPin(params.memberId, params.pin);
      if (!pinValid) throw new Error('PIN salah');
    }

    if (params.paymentMethod === PAYMENT_SIMPANAN) {
      const sukarelaType = await prisma.savings_types.findUnique({ where: { code: 'SUKARELA' } });
      if (!sukarelaType) throw new Error('Tipe simpanan sukarela tidak ditemukan');
      const account = await SavingsService.getSavingsAccount(params.memberId, sukarelaType.id);
      if (!account) throw new Error('Rekening simpanan sukarela tidak ditemukan');
      const balance = account.balance ?? 0;
      if (balance < total) throw new Error(`Saldo simpanan sukarela tidak mencukupi. Saldo: Rp ${balance.toLocaleString('id-ID')}`);
    }

    for (const item of params.items) {
      const qty = await StockService.getQuantity(params.warehouseId, item.product_id);
      if (qty < item.quantity) {
        const prod = await ProductService.getById(item.product_id);
        throw new Error(`Stok tidak mencukupi untuk ${prod?.name ?? 'produk'}. Tersedia: ${qty}`);
      }
    }

    const session = await prisma.pos_sessions.findFirst({
      where: { id: params.sessionId, status: 'open' },
    });
    if (!session) throw new Error('Session POS tidak valid atau sudah ditutup');

    const transNum = `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const transactionDate = new Date();

    const transaction = await prisma.$transaction(async (tx) => {
      const t = await tx.pos_transactions.create({
        data: {
          transaction_number: transNum,
          session_id: params.sessionId,
          member_id: params.memberId,
          warehouse_id: params.warehouseId,
          subtotal,
          discount_amount: discount,
          total_amount: total,
          status: 'completed',
          transaction_date: transactionDate,
          created_by: params.createdBy != null ? BigInt(params.createdBy) : null,
        },
      });

      for (const item of params.items) {
        const itemTotal = item.quantity * item.unit_price;
        await tx.pos_transaction_items.create({
          data: {
            pos_transaction_id: t.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            unit_price: item.unit_price,
            total_amount: itemTotal,
          },
        });
      }

      await tx.pos_payments.create({
        data: {
          pos_transaction_id: t.id,
          payment_method: params.paymentMethod,
          amount: total,
        },
      });

      if (params.paymentMethod === PAYMENT_POTONG_GAJI) {
        const nextMonth = new Date(transactionDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        await tx.member_receivables.create({
          data: {
            member_id: params.memberId,
            pos_transaction_id: t.id,
            amount: total,
            due_month: nextMonth.getMonth() + 1,
            due_year: nextMonth.getFullYear(),
            status: 'pending',
          },
        });
      }

      for (const item of params.items) {
        await tx.warehouse_stock.upsert({
          where: {
            warehouse_id_product_id: { warehouse_id: params.warehouseId, product_id: item.product_id },
          },
          create: {
            warehouse_id: params.warehouseId,
            product_id: item.product_id,
            quantity: -item.quantity,
          },
          update: { quantity: { decrement: item.quantity } },
        });
        const movementNumber = `POS-OUT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await tx.stock_movements.create({
          data: {
            movement_number: movementNumber,
            movement_type: 'out',
            warehouse_id: params.warehouseId,
            product_id: item.product_id,
            quantity: -item.quantity,
            unit_id: item.unit_id,
            reference_type: 'pos_transaction',
            reference_id: t.id,
            movement_date: transactionDate,
            created_by: params.createdBy != null ? BigInt(params.createdBy) : null,
          },
        });
      }

      if (params.paymentMethod === PAYMENT_SIMPANAN) {
        const sukarelaType = await tx.savings_types.findUnique({ where: { code: 'SUKARELA' } });
        if (sukarelaType) {
          const acc = await tx.savings_accounts.findFirst({
            where: { member_id: params.memberId, savings_type_id: sukarelaType.id, closed_date: null },
          });
          if (acc) {
            const before = Number(acc.balance ?? 0);
            const after = before - total;
            await tx.savings_accounts.update({
              where: { id: acc.id },
              data: { balance: after },
            });
            await tx.savings_transactions.create({
              data: {
                savings_account_id: acc.id,
                transaction_type: 'withdrawal',
                amount: total,
                balance_before: before,
                balance_after: after,
                transaction_date: transactionDate,
                reference_number: transNum,
                notes: `Pembayaran POS - ${transNum}`,
                created_by: params.createdBy != null ? BigInt(params.createdBy) : null,
              },
            });
          }
        }
      }

      return t;
    });

    try {
      const kasId = await JournalService.getAccountIdByCode('1010');
      const piutangId = await JournalService.getAccountIdByCode('1220');
      const simpananId = await JournalService.getAccountIdByCode('3110');
      const pendapatanId = await JournalService.getAccountIdByCode('6210');
      if (kasId && pendapatanId) {
        const lines: { account_id: number; debit: number; credit: number; description?: string }[] = [];
        if (params.paymentMethod === PAYMENT_CASH) {
          lines.push({ account_id: kasId, debit: total, credit: 0, description: transNum });
        } else if (params.paymentMethod === PAYMENT_POTONG_GAJI && piutangId) {
          lines.push({ account_id: piutangId, debit: total, credit: 0, description: transNum });
        } else if (params.paymentMethod === PAYMENT_SIMPANAN && simpananId) {
          lines.push({ account_id: simpananId, debit: total, credit: 0, description: transNum });
        }
        if (lines.length > 0 && pendapatanId) {
          lines.push({ account_id: pendapatanId, debit: 0, credit: total, description: transNum });
          const journalId = await JournalService.createManualEntry({
            entry_date: transactionDate.toISOString().split('T')[0],
            description: `Penjualan POS - ${transNum}`,
            lines,
            created_by: params.createdBy,
          });
          await JournalService.postEntry(journalId);
        }
      }
    } catch (journalErr) {
      console.error('POS auto-journal failed:', journalErr);
    }

    return { transaction_number: transNum, transaction_id: Number(transaction.id) };
  }

  static async listTransactions(params: {
    sessionId?: number;
    memberId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: { id: number; transaction_number: string; member_name: string; total_amount: number; payment_method: string; transaction_date: Date }[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.sessionId) where.session_id = params.sessionId;
    if (params.memberId) where.member_id = params.memberId;
    if (params.fromDate || params.toDate) {
      where.transaction_date = {
        ...(params.fromDate && { gte: new Date(params.fromDate) }),
        ...(params.toDate && { lte: new Date(params.toDate + 'T23:59:59') }),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.pos_transactions.findMany({
        where,
        include: {
          member: { select: { name: true } },
          pos_payments: { take: 1, orderBy: { id: 'desc' } },
        },
        orderBy: { transaction_date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pos_transactions.count({ where }),
    ]);

    const transactions = rows.map((r) => ({
      id: Number(r.id),
      transaction_number: r.transaction_number,
      member_name: r.member.name,
      total_amount: Number(r.total_amount),
      payment_method: r.pos_payments[0]?.payment_method ?? 'cash',
      transaction_date: r.transaction_date,
    }));

    return { transactions, total };
  }
}
