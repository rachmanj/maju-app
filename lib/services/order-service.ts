import { prisma } from '@/lib/db/prisma';
import { ProductService } from './product-service';
import { StockService } from './stock-service';
import { MemberService } from './member-service';

export class OrderService {
  static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.member_orders.count({
      where: {
        created_at: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
    });
    return `ORD${year}${(count + 1).toString().padStart(6, '0')}`;
  }

  static async createOrder(params: {
    memberId: number;
    warehouseId: number;
    items: { product_id: number; quantity: number; unit_id: number; unit_price: number }[];
    notes?: string;
  }): Promise<{ order_number: string; order_id: number }> {
    if (params.items.length === 0) throw new Error('Order must have at least one item');

    const member = await MemberService.getMemberById(params.memberId);
    if (!member || member.status !== 'active') throw new Error('Member not found or inactive');

    const total = params.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

    for (const item of params.items) {
      const qty = await StockService.getQuantity(params.warehouseId, item.product_id);
      if (qty < item.quantity) {
        const prod = await ProductService.getById(item.product_id);
        throw new Error(`Stok tidak mencukupi untuk ${prod?.name ?? 'produk'}. Tersedia: ${qty}`);
      }
    }

    const orderNumber = await this.generateOrderNumber();
    const orderDate = new Date();

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.member_orders.create({
        data: {
          order_number: orderNumber,
          member_id: params.memberId,
          warehouse_id: params.warehouseId,
          total_amount: total,
          status: 'pending',
          order_date: orderDate,
          notes: params.notes ?? null,
        },
      });

      for (const item of params.items) {
        await tx.member_order_items.create({
          data: {
            member_order_id: o.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            unit_price: item.unit_price,
            total_amount: item.quantity * item.unit_price,
          },
        });
      }

      return o;
    });

    return { order_number: orderNumber, order_id: Number(order.id) };
  }

  static async listOrders(params: {
    memberId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    orders: {
      id: number;
      order_number: string;
      member_name: string;
      total_amount: number;
      status: string;
      order_date: Date;
      confirmed_at: Date | null;
      delivered_at: Date | null;
    }[];
    total: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.memberId) where.member_id = params.memberId;
    if (params.status) where.status = params.status;
    if (params.fromDate || params.toDate) {
      where.order_date = {
        ...(params.fromDate && { gte: new Date(params.fromDate) }),
        ...(params.toDate && { lte: new Date(params.toDate + 'T23:59:59') }),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.member_orders.findMany({
        where,
        include: { member: { select: { name: true } } },
        orderBy: { order_date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.member_orders.count({ where }),
    ]);

    const orders = rows.map((r) => ({
      id: Number(r.id),
      order_number: r.order_number,
      member_name: r.member.name,
      total_amount: Number(r.total_amount),
      status: r.status ?? 'pending',
      order_date: r.order_date,
      confirmed_at: r.confirmed_at,
      delivered_at: r.delivered_at,
    }));

    return { orders, total };
  }

  static async getOrder(id: number): Promise<{
    id: number;
    order_number: string;
    member_id: number;
    member_name: string;
    warehouse_id: number;
    warehouse_name: string;
    total_amount: number;
    status: string;
    order_date: Date;
    confirmed_at: Date | null;
    delivered_at: Date | null;
    notes: string | null;
    items: { product_id: number; product_name: string; quantity: number; unit_code: string; unit_price: number; total_amount: number }[];
  } | null> {
    const order = await prisma.member_orders.findUnique({
      where: { id },
      include: {
        member: { select: { name: true } },
        warehouse: { select: { name: true } },
        member_order_items: {
          include: {
            product: { select: { name: true } },
            unit: { select: { code: true } },
          },
        },
      },
    });
    if (!order) return null;

    return {
      id: Number(order.id),
      order_number: order.order_number,
      member_id: Number(order.member_id),
      member_name: order.member.name,
      warehouse_id: Number(order.warehouse_id),
      warehouse_name: order.warehouse.name,
      total_amount: Number(order.total_amount),
      status: order.status ?? 'pending',
      order_date: order.order_date,
      confirmed_at: order.confirmed_at,
      delivered_at: order.delivered_at,
      notes: order.notes,
      items: order.member_order_items.map((i) => ({
        product_id: Number(i.product_id),
        product_name: i.product.name,
        quantity: Number(i.quantity),
        unit_code: i.unit.code,
        unit_price: Number(i.unit_price),
        total_amount: Number(i.total_amount),
      })),
    };
  }

  static async confirmOrder(orderId: number): Promise<void> {
    const order = await prisma.member_orders.findFirst({
      where: { id: orderId, status: 'pending' },
    });
    if (!order) throw new Error('Order not found or not pending');

    await prisma.member_orders.update({
      where: { id: orderId },
      data: { status: 'confirmed', confirmed_at: new Date() },
    });
  }

  static async deliverOrder(orderId: number): Promise<void> {
    const order = await prisma.member_orders.findFirst({
      where: { id: orderId, status: 'confirmed' },
    });
    if (!order) throw new Error('Order not found or not confirmed');

    const items = await prisma.member_order_items.findMany({
      where: { member_order_id: orderId },
    });

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.warehouse_stock.upsert({
          where: {
            warehouse_id_product_id: { warehouse_id: order.warehouse_id, product_id: item.product_id },
          },
          create: {
            warehouse_id: order.warehouse_id,
            product_id: item.product_id,
            quantity: -item.quantity,
          },
          update: { quantity: { decrement: item.quantity } },
        });
        await tx.stock_movements.create({
          data: {
            movement_number: `ORD-OUT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            movement_type: 'out',
            warehouse_id: order.warehouse_id,
            product_id: item.product_id,
            quantity: -item.quantity,
            unit_id: item.unit_id,
            reference_type: 'member_order',
            reference_id: BigInt(orderId),
            movement_date: new Date(),
            notes: `Order ${order.order_number}`,
          },
        });
      }
      await tx.member_orders.update({
        where: { id: orderId },
        data: { status: 'delivered', delivered_at: new Date() },
      });
    });
  }

  static async cancelOrder(orderId: number): Promise<void> {
    const order = await prisma.member_orders.findFirst({
      where: { id: orderId, status: 'pending' },
    });
    if (!order) throw new Error('Order not found or cannot be cancelled (only pending orders)');

    await prisma.member_orders.update({
      where: { id: orderId },
      data: { status: 'cancelled', cancelled_at: new Date() },
    });
  }
}
