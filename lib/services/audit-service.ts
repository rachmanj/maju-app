import { prisma } from '@/lib/db/prisma';

export class AuditService {
  static async log(params: {
    user_id?: number | null;
    action: string;
    entity_type: string;
    entity_id?: number | null;
    old_values?: object | null;
    new_values?: object | null;
  }): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          user_id: params.user_id != null ? BigInt(params.user_id) : null,
          action: params.action.slice(0, 100),
          entity_type: params.entity_type.slice(0, 100),
          entity_id: params.entity_id != null ? BigInt(params.entity_id) : null,
          old_values: params.old_values ?? undefined,
          new_values: params.new_values ?? undefined,
        },
      });
    } catch (e) {
      console.error('Audit log failed:', e);
    }
  }
}
