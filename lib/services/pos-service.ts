import { prisma } from '@/lib/db/prisma';
import { MemberService } from './member-service';
import { ProductService } from './product-service';
import { StockService } from './stock-service';
import { SavingsService } from './savings-service';
import { JournalService } from './journal-service';
import { COA_CODES } from '@/lib/config/coa-codes';

const PAYMENT_CASH = 'cash';
const PAYMENT_POTONG_GAJI = 'potong_gaji';
const PAYMENT_SIMPANAN = 'simpanan';

type SellPriceResult = { unit_price: number; unit_id: number; unit_code: string };

export class POSService {
  static async resolveSellPrice(
    productId: number,
    warehouseId: number,
    fallback?: { sales_price?: number | null; base_unit_id: number; base_unit_code: string }
  ): Promise<SellPriceResult | null> {
    const prices = await ProductService.getPrices(productId, warehouseId);
    const price = prices.length > 0 ? prices[0] : (await ProductService.getPrices(productId))[0];
    if (price) {
      return {
        unit_price: price.price,
        unit_id: price.unit_id,
        unit_code: price.unit_code ?? fallback?.base_unit_code ?? '',
      };
    }
    const sales = fallback?.sales_price;
    if (sales != null && Number(sales) > 0 && fallback) {
      return {
        unit_price: Number(sales),
        unit_id: fallback.base_unit_id,
        unit_code: fallback.base_unit_code,
      };
    }
    return null;
  }

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

  static async getOrCreateSelfServiceSession(userId: number): Promise<number> {
    const POS_SELF_CODE = 'POS-SELF';
    let device = await prisma.pos_devices.findFirst({
      where: { code: POS_SELF_CODE, is_active: true },
    });
    if (!device) {
      device = await prisma.pos_devices.create({
        data: { code: POS_SELF_CODE, name: 'POS Self-Service' },
      });
    }
    const existing = await prisma.pos_sessions.findFirst({
      where: { device_id: device.id, status: 'open' },
    });
    if (existing) return Number(existing.id);
    const session = await prisma.pos_sessions.create({
      data: {
        device_id: device.id,
        user_id: BigInt(userId),
        opening_cash: 0,
        status: 'open',
      },
    });
    return Number(session.id);
  }

  private static async formatMemberLookup(
    memberId: bigint,
    name: string,
    member_number?: string | null
  ): Promise<{ id: number; name: string; member_number: string | null; limit: number; has_pin: boolean }> {
    const limit = await MemberService.getPurchaseLimit(Number(memberId));
    const hasPin = !!(await prisma.member_pins.findUnique({ where: { member_id: memberId } }));
    return {
      id: Number(memberId),
      name,
      member_number: member_number ?? null,
      limit,
      has_pin: hasPin,
    };
  }

  static async lookupMembers(
    query: string,
    resultLimit = 20
  ): Promise<{ id: number; name: string; member_number: string | null; limit: number; has_pin: boolean }[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const activeMember = { status: 'active' as const, deleted_at: null };

    const barcodeMatch = await prisma.member_barcodes.findFirst({
      where: {
        barcode: trimmed,
        is_active: true,
        member: activeMember,
      },
      include: { member: { select: { id: true, name: true, member_number: true } } },
    });
    if (barcodeMatch?.member) {
      return [
        await this.formatMemberLookup(
          barcodeMatch.member_id,
          barcodeMatch.member.name,
          barcodeMatch.member.member_number
        ),
      ];
    }

    const exactMatch = await prisma.members.findFirst({
      where: {
        ...activeMember,
        OR: [{ email: trimmed }, { member_number: trimmed }, { nik: trimmed }],
      },
      select: { id: true, name: true, member_number: true },
    });
    if (exactMatch) {
      return [await this.formatMemberLookup(exactMatch.id, exactMatch.name, exactMatch.member_number)];
    }

    const nameMatches = await prisma.members.findMany({
      where: {
        ...activeMember,
        name: { contains: trimmed },
      },
      take: resultLimit,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, member_number: true },
    });

    const results: { id: number; name: string; member_number: string | null; limit: number; has_pin: boolean }[] = [];
    for (const m of nameMatches) {
      results.push(await this.formatMemberLookup(m.id, m.name, m.member_number));
    }
    return results;
  }

  /** @deprecated Use lookupMembers */
  static async lookupMember(barcodeOrEmail: string): Promise<{ id: number; name: string; limit: number; has_pin: boolean } | null> {
    const members = await this.lookupMembers(barcodeOrEmail, 1);
    if (members.length !== 1) return null;
    const { member_number: _memberNumber, ...member } = members[0];
    return member;
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

    if (priceList.length === 0 && product.sales_price != null && Number(product.sales_price) > 0) {
      priceList.push({
        unit_id: product.base_unit_id,
        unit_code: product.base_unit_code ?? '',
        price: Number(product.sales_price),
      });
    }

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
    const trimmed = barcode.trim();
    const product = await prisma.products.findFirst({
      where: {
        deleted_at: null,
        is_active: true,
        OR: [{ barcode: trimmed }, { code: trimmed }],
      },
      include: { base_unit: { select: { id: true, code: true } } },
    });
    if (!product) return null;

    const stock = await StockService.getQuantity(warehouseId, Number(product.id));
    const sellPrice = await POSService.resolveSellPrice(Number(product.id), warehouseId, {
      sales_price: product.sales_price != null ? Number(product.sales_price) : null,
      base_unit_id: product.base_unit_id,
      base_unit_code: product.base_unit.code,
    });
    if (!sellPrice) return null;

    return {
      id: Number(product.id),
      code: product.code,
      name: product.name,
      base_unit_id: product.base_unit_id,
      base_unit_code: product.base_unit.code,
      quantity: stock,
      unit_price: sellPrice.unit_price,
      unit_id: sellPrice.unit_id,
      unit_code: sellPrice.unit_code,
    };
  }

  static async searchProducts(
    warehouseId: number,
    query: string,
    limit = 20,
    categoryId?: number
  ): Promise<
    { id: number; code: string; name: string; barcode: string | null; quantity: number; unit_price: number; unit_id: number; unit_code: string; category_name?: string }[]
  > {
    const where = {
      deleted_at: null,
      is_active: true,
      ...(query.trim() && {
        OR: [
          { name: { contains: query } },
          { code: { contains: query } },
          { barcode: { contains: query } },
        ],
      }),
      ...(categoryId != null && { category_id: categoryId }),
      AND: [
        {
          OR: [
            { sales_price: { not: null } },
            {
              product_prices: {
                some: {
                  is_active: true,
                  OR: [{ warehouse_id: BigInt(warehouseId) }, { warehouse_id: null }],
                },
              },
            },
          ],
        },
      ],
    };

    const products = await prisma.products.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        base_unit: { select: { id: true, code: true } },
        category: { select: { name: true } },
      },
    });

    const result: { id: number; code: string; name: string; barcode: string | null; quantity: number; unit_price: number; unit_id: number; unit_code: string; category_name?: string }[] = [];
    for (const p of products) {
      const stock = await StockService.getQuantity(warehouseId, Number(p.id));
      const sellPrice = await POSService.resolveSellPrice(Number(p.id), warehouseId, {
        sales_price: p.sales_price != null ? Number(p.sales_price) : null,
        base_unit_id: p.base_unit_id,
        base_unit_code: p.base_unit.code,
      });
      if (!sellPrice) continue;

      result.push({
        id: Number(p.id),
        code: p.code,
        name: p.name,
        barcode: p.barcode,
        quantity: stock,
        unit_price: sellPrice.unit_price,
        unit_id: sellPrice.unit_id,
        unit_code: sellPrice.unit_code,
        category_name: (p as { category?: { name: string } }).category?.name,
      });
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
    skipPinVerification?: boolean;
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
      if (!params.skipPinVerification) {
        if (!params.pin) throw new Error('PIN diperlukan untuk pembayaran Potong Gaji');
        const pinValid = await MemberService.verifyPin(params.memberId, params.pin);
        if (!pinValid) throw new Error('PIN salah');
      }
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
      const kasId = await JournalService.getAccountIdByCode(COA_CODES.KAS);
      const piutangId = await JournalService.getAccountIdByCode(COA_CODES.PIUTANG_PEMBELIAN);
      const simpananId = await JournalService.getAccountIdByCode(COA_CODES.SIMPANAN_SUKARELA);
      const pendapatanId = await JournalService.getAccountIdByCode(COA_CODES.PENDAPATAN_PENJUALAN);
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

  static formatPaymentMethodsLabel(methods: string[]): string {
    const map: Record<string, string> = {
      cash: 'Tunai',
      potong_gaji: 'Potong Gaji',
      simpanan: 'Simpanan',
    };
    const uniq = [...new Set(methods)];
    return uniq.map((m) => map[m] ?? m).join(', ') || 'Tunai';
  }

  private static buildTransactionListWhere(params: {
    sessionId?: number;
    memberId?: number;
    fromDate?: string;
    toDate?: string;
  }): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (params.sessionId) where.session_id = params.sessionId;
    if (params.memberId) where.member_id = params.memberId;
    if (params.fromDate || params.toDate) {
      where.transaction_date = {
        ...(params.fromDate && { gte: new Date(params.fromDate) }),
        ...(params.toDate && { lte: new Date(params.toDate + 'T23:59:59') }),
      };
    }
    return where;
  }

  static mapRowToTransactionReport(r: {
    id: bigint;
    transaction_number: string;
    transaction_date: Date;
    subtotal: unknown;
    discount_amount: unknown | null;
    total_amount: unknown;
    member: { member_number?: string | null; name: string };
    warehouse: { code: string; name: string };
    pos_payments: { payment_method: string }[];
  }) {
    const payMethods = r.pos_payments.length
      ? r.pos_payments.map((p) => p.payment_method)
      : ['cash'];
    return {
      id: Number(r.id),
      transaction_number: r.transaction_number,
      transaction_date: r.transaction_date,
      member_id: 0,
      member_number: r.member.member_number ?? null,
      member_name: r.member.name,
      warehouse_code: r.warehouse.code,
      warehouse_name: r.warehouse.name,
      subtotal: Number(r.subtotal),
      discount_amount: Number(r.discount_amount ?? 0),
      total_amount: Number(r.total_amount),
      payment_methods: POSService.formatPaymentMethodsLabel(payMethods),
    };
  }

  static async listTransactions(params: {
    sessionId?: number;
    memberId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: {
      id: number;
      transaction_number: string;
      transaction_date: Date;
      member_id: number;
      member_number: string | null;
      member_name: string;
      warehouse_code: string;
      warehouse_name: string;
      subtotal: number;
      discount_amount: number;
      total_amount: number;
      payment_methods: string;
      payment_method: string;
    }[];
    total: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where = this.buildTransactionListWhere(params);

    const [rows, total] = await Promise.all([
      prisma.pos_transactions.findMany({
        where,
        include: {
          member: { select: { member_number: true, name: true } },
          warehouse: { select: { code: true, name: true } },
          pos_payments: { orderBy: { id: 'asc' } },
        },
        orderBy: { transaction_date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pos_transactions.count({ where }),
    ]);

    const transactions = rows.map((r) => {
      const base = this.mapRowToTransactionReport({
        ...r,
        member: r.member,
      });
      const payMethods = r.pos_payments.length
        ? r.pos_payments.map((p) => p.payment_method)
        : ['cash'];
      return {
        ...base,
        member_id: Number(r.member_id),
        payment_method: payMethods[0] ?? 'cash',
      };
    });

    return { transactions, total };
  }

  static readonly EXPORT_MAX_ROWS = 50_000;

  static async listTransactionsForExport(params: {
    memberId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    summary: {
      id: number;
      transaction_number: string;
      transaction_date: Date;
      member_id: number;
      member_number: string | null;
      member_name: string;
      warehouse_code: string;
      warehouse_name: string;
      subtotal: number;
      discount_amount: number;
      total_amount: number;
      payment_methods: string;
    }[];
    detailLines: {
      transaction_number: string;
      transaction_date: Date;
      member_name: string;
      product_code: string;
      product_name: string;
      quantity: number;
      unit_code: string;
      unit_price: number;
      line_total: number;
    }[];
  }> {
    const where = this.buildTransactionListWhere(params);
    const rows = await prisma.pos_transactions.findMany({
      where,
      include: {
        member: { select: { member_number: true, name: true } },
        warehouse: { select: { code: true, name: true } },
        pos_payments: { orderBy: { id: 'asc' } },
        pos_transaction_items: {
          include: {
            product: { select: { code: true, name: true } },
            unit: { select: { code: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { transaction_date: 'desc' },
      take: this.EXPORT_MAX_ROWS,
    });

    const summary = rows.map((r) => ({
      ...this.mapRowToTransactionReport({
        ...r,
        member: r.member,
      }),
      member_id: Number(r.member_id),
    }));

    const detailLines: {
      transaction_number: string;
      transaction_date: Date;
      member_name: string;
      product_code: string;
      product_name: string;
      quantity: number;
      unit_code: string;
      unit_price: number;
      line_total: number;
    }[] = [];

    for (const r of rows) {
      const memberName = r.member.name;
      for (const it of r.pos_transaction_items) {
        detailLines.push({
          transaction_number: r.transaction_number,
          transaction_date: r.transaction_date,
          member_name: memberName,
          product_code: it.product.code,
          product_name: it.product.name,
          quantity: Number(it.quantity),
          unit_code: it.unit.code,
          unit_price: Number(it.unit_price),
          line_total: Number(it.total_amount),
        });
      }
    }

    return { summary, detailLines };
  }

  static async getMemberTransactionDetail(
    memberId: number,
    transactionId: number
  ): Promise<{
    id: number;
    transaction_number: string;
    transaction_date: string;
    warehouse_name: string;
    warehouse_code: string;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    notes: string | null;
    payment_methods: string;
    items: {
      id: number;
      product_code: string;
      product_name: string;
      quantity: number;
      unit_code: string;
      unit_price: number;
      discount_amount: number;
      total_amount: number;
    }[];
    payments: { payment_method: string; amount: number }[];
  } | null> {
    const row = await prisma.pos_transactions.findFirst({
      where: {
        id: BigInt(transactionId),
        member_id: BigInt(memberId),
      },
      include: {
        warehouse: { select: { name: true, code: true } },
        pos_payments: { orderBy: { id: 'asc' } },
        pos_transaction_items: {
          include: {
            product: { select: { code: true, name: true } },
            unit: { select: { code: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!row) return null;

    const payMethods = row.pos_payments.length
      ? row.pos_payments.map((p) => p.payment_method)
      : ['cash'];
    const payment_methods = this.formatPaymentMethodsLabel(payMethods);

    return {
      id: Number(row.id),
      transaction_number: row.transaction_number,
      transaction_date: row.transaction_date.toISOString(),
      warehouse_name: row.warehouse.name,
      warehouse_code: row.warehouse.code,
      subtotal: Number(row.subtotal),
      discount_amount: Number(row.discount_amount ?? 0),
      total_amount: Number(row.total_amount),
      notes: row.notes ?? null,
      payment_methods,
      items: row.pos_transaction_items.map((it) => ({
        id: Number(it.id),
        product_code: it.product.code,
        product_name: it.product.name,
        quantity: Number(it.quantity),
        unit_code: it.unit.code,
        unit_price: Number(it.unit_price),
        discount_amount: Number(it.discount_amount ?? 0),
        total_amount: Number(it.total_amount),
      })),
      payments: row.pos_payments.map((p) => ({
        payment_method: p.payment_method,
        amount: Number(p.amount),
      })),
    };
  }
}
