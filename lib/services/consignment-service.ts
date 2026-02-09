import { prisma } from '@/lib/db/prisma';
import type { ConsignmentSupplier, ConsignmentReceipt, ConsignmentReceiptItem, ConsignmentSettlement, ConsignmentSale } from '@/types/database';

export class ConsignmentService {
  static async listSuppliers(params: { page?: number; limit?: number; search?: string; is_active?: boolean }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };
    if (params.search) {
      where.OR = [
        { code: { contains: params.search } },
        { name: { contains: params.search } },
        { contact_person: { contains: params.search } },
      ];
    }
    if (params.is_active !== undefined) where.is_active = params.is_active;
    const [suppliers, total] = await Promise.all([
      prisma.consignment_suppliers.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.consignment_suppliers.count({ where }),
    ]);
    return { suppliers: suppliers as unknown as ConsignmentSupplier[], total };
  }

  static async getSupplierById(id: number): Promise<ConsignmentSupplier | null> {
    const row = await prisma.consignment_suppliers.findFirst({
      where: { id, deleted_at: null },
    });
    return row ? (row as unknown as ConsignmentSupplier) : null;
  }

  static async createSupplier(data: {
    code: string;
    name: string;
    contact_person?: string;
    phone?: string;
    address?: string;
    commission_type?: 'percentage' | 'fixed';
    commission_value?: number;
    created_by?: number;
  }): Promise<number> {
    const r = await prisma.consignment_suppliers.create({
      data: {
        code: data.code,
        name: data.name,
        contact_person: data.contact_person ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        commission_type: data.commission_type ?? 'percentage',
        commission_value: data.commission_value ?? 0,
        created_by: data.created_by ?? null,
      },
    });
    return Number(r.id);
  }

  static async updateSupplier(id: number, data: Partial<ConsignmentSupplier>, updatedBy?: number): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    if (updatedBy != null) update.updated_by = updatedBy;
    await prisma.consignment_suppliers.update({
      where: { id },
      data: update as Parameters<typeof prisma.consignment_suppliers.update>[0]['data'],
    });
  }

  static async listReceipts(params: { page?: number; limit?: number; supplier_id?: number; warehouse_id?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.supplier_id != null) where.supplier_id = params.supplier_id;
    if (params.warehouse_id != null) where.warehouse_id = params.warehouse_id;
    const [receipts, total] = await Promise.all([
      prisma.consignment_receipts.findMany({
        where,
        include: {
          supplier: { select: { name: true, code: true } },
          warehouse: { select: { name: true, code: true } },
        },
        orderBy: [{ receipt_date: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.consignment_receipts.count({ where }),
    ]);
    const list = receipts.map((r) => ({
      ...r,
      supplier_name: r.supplier.name,
      supplier_code: r.supplier.code,
      warehouse_name: r.warehouse.name,
      warehouse_code: r.warehouse.code,
    }));
    return { receipts: list, total };
  }

  static async getReceiptById(id: number): Promise<(ConsignmentReceipt & { supplier_name?: string; warehouse_name?: string }) | null> {
    const r = await prisma.consignment_receipts.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true, code: true } },
        warehouse: { select: { name: true, code: true } },
      },
    });
    if (!r) return null;
    return {
      ...r,
      id: Number(r.id),
      supplier_name: r.supplier.name,
      supplier_code: r.supplier.code,
      warehouse_name: r.warehouse.name,
      warehouse_code: r.warehouse.code,
    } as unknown as ConsignmentReceipt & { supplier_name?: string; warehouse_name?: string };
  }

  static async getReceiptItems(receiptId: number): Promise<(ConsignmentReceiptItem & { product_code?: string; product_name?: string; unit_code?: string })[]> {
    const rows = await prisma.consignment_receipt_items.findMany({
      where: { consignment_receipt_id: receiptId },
      include: {
        product: { select: { code: true, name: true } },
        unit: { select: { code: true } },
      },
      orderBy: { id: 'asc' },
    });
    return rows.map((i) => ({
      ...i,
      id: Number(i.id),
      product_code: i.product.code,
      product_name: i.product.name,
      unit_code: i.unit.code,
    })) as unknown as (ConsignmentReceiptItem & { product_code?: string; product_name?: string; unit_code?: string })[];
  }

  static async createReceipt(data: {
    supplier_id: number;
    warehouse_id: number;
    receipt_date: Date;
    notes?: string;
    items: { product_id: number; quantity: number; unit_id: number; notes?: string }[];
    created_by?: number;
  }): Promise<number> {
    const receiptNumber = `CR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const receipt = await prisma.$transaction(async (tx) => {
      const r = await tx.consignment_receipts.create({
        data: {
          receipt_number: receiptNumber,
          supplier_id: data.supplier_id,
          warehouse_id: data.warehouse_id,
          receipt_date: data.receipt_date,
          notes: data.notes ?? null,
          status: 'posted',
          created_by: data.created_by ?? null,
        },
      });
      for (const item of data.items) {
        await tx.consignment_receipt_items.create({
          data: {
            consignment_receipt_id: Number(r.id),
            product_id: item.product_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            notes: item.notes ?? null,
          },
        });
        await tx.consignment_stock.upsert({
          where: {
            supplier_id_warehouse_id_product_id: {
              supplier_id: data.supplier_id,
              warehouse_id: data.warehouse_id,
              product_id: item.product_id,
            },
          },
          create: {
            supplier_id: data.supplier_id,
            warehouse_id: data.warehouse_id,
            product_id: item.product_id,
            quantity: item.quantity,
          },
          update: { quantity: { increment: item.quantity } },
        });
      }
      await tx.consignment_receipts.update({
        where: { id: r.id },
        data: { posted_at: new Date() },
      });
      return r;
    });
    return Number(receipt.id);
  }

  static async getConsignmentStock(params: { supplier_id?: number; warehouse_id?: number }): Promise<
    { supplier_id: number; supplier_code: string; supplier_name: string; warehouse_id: number; warehouse_code: string; warehouse_name: string; product_id: number; product_code: string; product_name: string; unit_code: string; quantity: number }[]
  > {
    const where: Record<string, unknown> = {};
    if (params.supplier_id != null) where.supplier_id = params.supplier_id;
    if (params.warehouse_id != null) where.warehouse_id = params.warehouse_id;
    const rows = await prisma.consignment_stock.findMany({
      where,
      include: {
        supplier: { select: { code: true, name: true } },
        warehouse: { select: { code: true, name: true } },
        product: { include: { base_unit: { select: { code: true } } } },
      },
      orderBy: [{ supplier: { code: 'asc' } }, { warehouse: { code: 'asc' } }, { product: { code: 'asc' } }],
    });
    return rows.map((r) => ({
      supplier_id: Number(r.supplier_id),
      supplier_code: r.supplier.code,
      supplier_name: r.supplier.name,
      warehouse_id: Number(r.warehouse_id),
      warehouse_code: r.warehouse.code,
      warehouse_name: r.warehouse.name,
      product_id: Number(r.product_id),
      product_code: r.product.code,
      product_name: r.product.name,
      unit_code: r.product.base_unit.code,
      quantity: Number(r.quantity),
    }));
  }

  static async listSettlements(params: { page?: number; limit?: number; supplier_id?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.supplier_id != null) where.supplier_id = params.supplier_id;
    const [settlements, total] = await Promise.all([
      prisma.consignment_settlements.findMany({
        where,
        include: { supplier: { select: { name: true, code: true } } },
        orderBy: [{ settlement_date: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.consignment_settlements.count({ where }),
    ]);
    const list = settlements.map((s) => ({ ...s, supplier_name: s.supplier.name, supplier_code: s.supplier.code }));
    return { settlements: list, total };
  }

  static async getSettlementById(id: number): Promise<(ConsignmentSettlement & { supplier_name?: string; supplier_code?: string }) | null> {
    const s = await prisma.consignment_settlements.findUnique({
      where: { id },
      include: { supplier: { select: { name: true, code: true } } },
    });
    if (!s) return null;
    return { ...s, id: Number(s.id), supplier_name: s.supplier.name, supplier_code: s.supplier.code } as unknown as ConsignmentSettlement & { supplier_name?: string; supplier_code?: string };
  }

  static async getSettlementSales(settlementId: number): Promise<(ConsignmentSale & { product_code?: string; product_name?: string; unit_code?: string })[]> {
    const rows = await prisma.consignment_sales.findMany({
      where: { settlement_id: settlementId },
      include: {
        product: { select: { code: true, name: true } },
        unit: { select: { code: true } },
      },
      orderBy: [{ sale_date: 'asc' }, { id: 'asc' }],
    });
    return rows.map((s) => ({
      ...s,
      id: Number(s.id),
      product_code: s.product.code,
      product_name: s.product.name,
      unit_code: s.unit.code,
    })) as unknown as (ConsignmentSale & { product_code?: string; product_name?: string; unit_code?: string })[];
  }

  static async createSettlement(data: {
    supplier_id: number;
    settlement_date: Date;
    sale_ids: number[];
    notes?: string;
    created_by?: number;
  }): Promise<number> {
    const settlementNumber = `STL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const settlement = await prisma.$transaction(async (tx) => {
      let totalSales = 0;
      let totalCommission = 0;
      if (data.sale_ids.length > 0) {
        const agg = await tx.consignment_sales.aggregate({
          where: { id: { in: data.sale_ids }, settlement_id: null },
          _sum: { total_amount: true, commission_amount: true },
        });
        totalSales = Number(agg._sum.total_amount ?? 0);
        totalCommission = Number(agg._sum.commission_amount ?? 0);
      }
      const netPayable = totalSales - totalCommission;
      const s = await tx.consignment_settlements.create({
        data: {
          settlement_number: settlementNumber,
          supplier_id: data.supplier_id,
          settlement_date: data.settlement_date,
          total_sales_amount: totalSales,
          total_commission: totalCommission,
          net_payable: netPayable,
          status: 'draft',
          notes: data.notes ?? null,
          created_by: data.created_by ?? null,
        },
      });
      if (data.sale_ids.length > 0) {
        await tx.consignment_sales.updateMany({
          where: { id: { in: data.sale_ids } },
          data: { settlement_id: s.id },
        });
      }
      return s;
    });
    return Number(settlement.id);
  }

  static async listUnsettledSales(supplierId: number): Promise<(ConsignmentSale & { product_code?: string; product_name?: string })[]> {
    const rows = await prisma.consignment_sales.findMany({
      where: { supplier_id: supplierId, settlement_id: null },
      include: { product: { select: { code: true, name: true } } },
      orderBy: [{ sale_date: 'asc' }, { id: 'asc' }],
    });
    return rows.map((s) => ({ ...s, id: Number(s.id), product_code: s.product.code, product_name: s.product.name })) as unknown as (ConsignmentSale & { product_code?: string; product_name?: string })[];
  }

  static async addManualSale(data: {
    supplier_id: number;
    product_id: number;
    warehouse_id: number;
    quantity: number;
    unit_id: number;
    unit_price: number;
    sale_date: Date;
  }): Promise<number> {
    const sale = await prisma.$transaction(async (tx) => {
      const supplier = await tx.consignment_suppliers.findUnique({
        where: { id: data.supplier_id },
        select: { commission_type: true, commission_value: true },
      });
      const totalAmount = data.quantity * data.unit_price;
      let commissionRate = 0;
      let commissionAmount = 0;
      if (supplier) {
        commissionRate = Number(supplier.commission_value ?? 0);
        if (supplier.commission_type === 'percentage') {
          commissionAmount = (totalAmount * commissionRate) / 100;
        } else {
          commissionAmount = commissionRate * data.quantity;
          commissionRate = totalAmount > 0 ? (commissionAmount / totalAmount) * 100 : 0;
        }
      }
      const saleRow = await tx.consignment_sales.create({
        data: {
          supplier_id: data.supplier_id,
          product_id: data.product_id,
          warehouse_id: data.warehouse_id,
          quantity: data.quantity,
          unit_id: data.unit_id,
          unit_price: data.unit_price,
          total_amount: totalAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          sale_date: data.sale_date,
        },
      });
      await tx.consignment_stock.update({
        where: {
          supplier_id_warehouse_id_product_id: {
            supplier_id: data.supplier_id,
            warehouse_id: data.warehouse_id,
            product_id: data.product_id,
          },
        },
        data: { quantity: { decrement: data.quantity } },
      });
      return saleRow;
    });
    return Number(sale.id);
  }

  static async listSales(params: { page?: number; limit?: number; supplier_id?: number; settlement_id?: number; date_from?: string; date_to?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.supplier_id != null) where.supplier_id = params.supplier_id;
    if (params.settlement_id !== undefined) where.settlement_id = params.settlement_id;
    if (params.date_from || params.date_to) {
      where.sale_date = {
        ...(params.date_from && { gte: new Date(params.date_from) }),
        ...(params.date_to && { lte: new Date(params.date_to) }),
      };
    }
    const [sales, total] = await Promise.all([
      prisma.consignment_sales.findMany({
        where,
        include: {
          product: { select: { code: true, name: true } },
          unit: { select: { code: true } },
        },
        orderBy: [{ sale_date: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.consignment_sales.count({ where }),
    ]);
    const list = sales.map((s) => ({ ...s, product_code: s.product.code, product_name: s.product.name, unit_code: s.unit.code }));
    return { sales: list, total };
  }
}
