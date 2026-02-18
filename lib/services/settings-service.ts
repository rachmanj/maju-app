import { prisma } from "@/lib/db/prisma";
import { AuditService } from "./audit-service";

export interface SavingsInterestRateItem {
  id: number;
  savings_type_id: number;
  savings_type_code: string;
  savings_type_name: string;
  rate_percentage: number;
  effective_date: string;
  expiry_date: string | null;
  calculation_method: string | null;
  is_active: boolean | null;
}

export interface LoanInterestRateItem {
  id: number;
  rate_percentage: number;
  effective_date: string;
  expiry_date: string | null;
  is_active: boolean | null;
}

export interface CooperativeConfig {
  id: number;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

export class SettingsService {
  static async getCooperativeConfig(): Promise<CooperativeConfig | null> {
    const config = await prisma.cooperative_config.findFirst({
      orderBy: { id: "asc" },
    });
    if (!config) return null;
    return {
      id: config.id,
      name: config.name,
      address: config.address,
      phone: config.phone,
      email: config.email,
      logo_url: config.logo_url,
    };
  }

  static async upsertCooperativeConfig(data: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  }): Promise<CooperativeConfig> {
    const existing = await prisma.cooperative_config.findFirst({
      orderBy: { id: "asc" },
    });

    if (existing) {
      const updated = await prisma.cooperative_config.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          address: data.address ?? existing.address,
          phone: data.phone ?? existing.phone,
          email: data.email ?? existing.email,
          logo_url: data.logo_url ?? existing.logo_url,
        },
      });
      await AuditService.log({
        action: "settings.cooperative_config",
        entity_type: "cooperative_config",
        entity_id: existing.id,
        old_values: { name: existing.name },
        new_values: { name: updated.name },
      });
      return {
        id: updated.id,
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
        email: updated.email,
        logo_url: updated.logo_url,
      };
    }

    const created = await prisma.cooperative_config.create({
      data: {
        name: data.name ?? "Koperasi Maju",
        address: data.address ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        logo_url: data.logo_url ?? null,
      },
    });
    await AuditService.log({
      action: "settings.cooperative_config",
      entity_type: "cooperative_config",
      entity_id: created.id,
      new_values: { name: created.name },
    });
    return {
      id: created.id,
      name: created.name,
      address: created.address,
      phone: created.phone,
      email: created.email,
      logo_url: created.logo_url,
    };
  }

  static async listSavingsInterestRates(): Promise<SavingsInterestRateItem[]> {
    const rows = await prisma.savings_interest_rates.findMany({
      include: { savings_type: { select: { code: true, name: true } } },
      orderBy: [{ savings_type_id: "asc" }, { effective_date: "desc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      savings_type_id: r.savings_type_id,
      savings_type_code: r.savings_type.code,
      savings_type_name: r.savings_type.name,
      rate_percentage: Number(r.rate_percentage),
      effective_date: r.effective_date.toISOString().split("T")[0],
      expiry_date: r.expiry_date ? r.expiry_date.toISOString().split("T")[0] : null,
      calculation_method: r.calculation_method,
      is_active: r.is_active,
    }));
  }

  static async createSavingsInterestRate(data: {
    savings_type_id: number;
    rate_percentage: number;
    effective_date: Date;
    expiry_date?: Date;
    calculation_method?: string;
  }): Promise<SavingsInterestRateItem> {
    const created = await prisma.savings_interest_rates.create({
      data: {
        savings_type_id: data.savings_type_id,
        rate_percentage: data.rate_percentage,
        effective_date: data.effective_date,
        expiry_date: data.expiry_date ?? null,
        calculation_method: data.calculation_method ?? "monthly",
      },
      include: { savings_type: { select: { code: true, name: true } } },
    });
    return {
      id: created.id,
      savings_type_id: created.savings_type_id,
      savings_type_code: created.savings_type.code,
      savings_type_name: created.savings_type.name,
      rate_percentage: Number(created.rate_percentage),
      effective_date: created.effective_date.toISOString().split("T")[0],
      expiry_date: created.expiry_date ? created.expiry_date.toISOString().split("T")[0] : null,
      calculation_method: created.calculation_method,
      is_active: created.is_active,
    };
  }

  static async updateSavingsInterestRate(
    id: number,
    data: { rate_percentage?: number; effective_date?: Date; expiry_date?: Date; calculation_method?: string; is_active?: boolean }
  ): Promise<SavingsInterestRateItem | null> {
    const updated = await prisma.savings_interest_rates.update({
      where: { id },
      data: {
        ...(data.rate_percentage !== undefined && { rate_percentage: data.rate_percentage }),
        ...(data.effective_date !== undefined && { effective_date: data.effective_date }),
        ...(data.expiry_date !== undefined && { expiry_date: data.expiry_date }),
        ...(data.calculation_method !== undefined && { calculation_method: data.calculation_method }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      },
      include: { savings_type: { select: { code: true, name: true } } },
    });
    return {
      id: updated.id,
      savings_type_id: updated.savings_type_id,
      savings_type_code: updated.savings_type.code,
      savings_type_name: updated.savings_type.name,
      rate_percentage: Number(updated.rate_percentage),
      effective_date: updated.effective_date.toISOString().split("T")[0],
      expiry_date: updated.expiry_date ? updated.expiry_date.toISOString().split("T")[0] : null,
      calculation_method: updated.calculation_method,
      is_active: updated.is_active,
    };
  }

  static async deleteSavingsInterestRate(id: number): Promise<void> {
    await prisma.savings_interest_rates.delete({ where: { id } });
  }

  static async listLoanInterestRates(): Promise<LoanInterestRateItem[]> {
    const rows = await prisma.loan_interest_rates.findMany({
      orderBy: { effective_date: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      rate_percentage: Number(r.rate_percentage),
      effective_date: r.effective_date.toISOString().split("T")[0],
      expiry_date: r.expiry_date ? r.expiry_date.toISOString().split("T")[0] : null,
      is_active: r.is_active,
    }));
  }

  static async createLoanInterestRate(data: {
    rate_percentage: number;
    effective_date: Date;
    expiry_date?: Date;
  }): Promise<LoanInterestRateItem> {
    const created = await prisma.loan_interest_rates.create({
      data: {
        rate_percentage: data.rate_percentage,
        effective_date: data.effective_date,
        expiry_date: data.expiry_date ?? null,
      },
    });
    return {
      id: created.id,
      rate_percentage: Number(created.rate_percentage),
      effective_date: created.effective_date.toISOString().split("T")[0],
      expiry_date: created.expiry_date ? created.expiry_date.toISOString().split("T")[0] : null,
      is_active: created.is_active,
    };
  }

  static async updateLoanInterestRate(
    id: number,
    data: { rate_percentage?: number; effective_date?: Date; expiry_date?: Date; is_active?: boolean }
  ): Promise<LoanInterestRateItem | null> {
    const updated = await prisma.loan_interest_rates.update({
      where: { id },
      data: {
        ...(data.rate_percentage !== undefined && { rate_percentage: data.rate_percentage }),
        ...(data.effective_date !== undefined && { effective_date: data.effective_date }),
        ...(data.expiry_date !== undefined && { expiry_date: data.expiry_date }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      },
    });
    return {
      id: updated.id,
      rate_percentage: Number(updated.rate_percentage),
      effective_date: updated.effective_date.toISOString().split("T")[0],
      expiry_date: updated.expiry_date ? updated.expiry_date.toISOString().split("T")[0] : null,
      is_active: updated.is_active,
    };
  }

  static async deleteLoanInterestRate(id: number): Promise<void> {
    await prisma.loan_interest_rates.delete({ where: { id } });
  }

  static async getUserPreferences(userId: number): Promise<{
    theme: string;
    language: string;
    sidebar_collapsed: boolean;
  } | null> {
    const prefs = await prisma.user_preferences.findUnique({
      where: { user_id: BigInt(userId) },
    });
    if (!prefs) return null;
    return {
      theme: prefs.theme ?? "light",
      language: prefs.language ?? "id",
      sidebar_collapsed: prefs.sidebar_collapsed ?? false,
    };
  }

  static async upsertUserPreferences(
    userId: number,
    data: { theme?: string; language?: string; sidebar_collapsed?: boolean }
  ): Promise<{ theme: string; language: string; sidebar_collapsed: boolean }> {
    const existing = await prisma.user_preferences.findUnique({
      where: { user_id: BigInt(userId) },
    });

    const theme = data.theme ?? existing?.theme ?? "light";
    const language = data.language ?? existing?.language ?? "id";
    const sidebar_collapsed = data.sidebar_collapsed ?? existing?.sidebar_collapsed ?? false;

    if (existing) {
      await prisma.user_preferences.update({
        where: { user_id: BigInt(userId) },
        data: { theme, language, sidebar_collapsed },
      });
    } else {
      await prisma.user_preferences.create({
        data: {
          user_id: BigInt(userId),
          theme,
          language,
          sidebar_collapsed,
        },
      });
    }
    return { theme, language, sidebar_collapsed };
  }

  static async getNotificationPreferences(userId: number): Promise<{
    loan_reminder: boolean;
    savings_reminder: boolean;
    stock_alert: boolean;
  } | null> {
    const prefs = await prisma.notification_preferences.findUnique({
      where: { user_id: BigInt(userId) },
    });
    if (!prefs) return null;
    return {
      loan_reminder: prefs.loan_reminder ?? true,
      savings_reminder: prefs.savings_reminder ?? true,
      stock_alert: prefs.stock_alert ?? true,
    };
  }

  static async upsertNotificationPreferences(
    userId: number,
    data: { loan_reminder?: boolean; savings_reminder?: boolean; stock_alert?: boolean }
  ): Promise<{ loan_reminder: boolean; savings_reminder: boolean; stock_alert: boolean }> {
    const existing = await prisma.notification_preferences.findUnique({
      where: { user_id: BigInt(userId) },
    });

    const loan_reminder = data.loan_reminder ?? existing?.loan_reminder ?? true;
    const savings_reminder = data.savings_reminder ?? existing?.savings_reminder ?? true;
    const stock_alert = data.stock_alert ?? existing?.stock_alert ?? true;

    if (existing) {
      await prisma.notification_preferences.update({
        where: { user_id: BigInt(userId) },
        data: { loan_reminder, savings_reminder, stock_alert },
      });
    } else {
      await prisma.notification_preferences.create({
        data: {
          user_id: BigInt(userId),
          loan_reminder,
          savings_reminder,
          stock_alert,
        },
      });
    }
    return { loan_reminder, savings_reminder, stock_alert };
  }
}
