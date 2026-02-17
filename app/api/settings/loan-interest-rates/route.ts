import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { SettingsService } from "@/lib/services/settings-service";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rates = await SettingsService.listLoanInterestRates();
    return NextResponse.json(rates);
  } catch (error: unknown) {
    console.error("Error fetching loan interest rates:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch rates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { rate_percentage, effective_date, expiry_date } = body;

    if (rate_percentage === undefined || !effective_date) {
      return NextResponse.json(
        { error: "rate_percentage dan effective_date wajib diisi" },
        { status: 400 }
      );
    }

    const rate = await SettingsService.createLoanInterestRate({
      rate_percentage: Number(rate_percentage),
      effective_date: new Date(effective_date),
      expiry_date: expiry_date ? new Date(expiry_date) : undefined,
    });
    return NextResponse.json(rate);
  } catch (error: unknown) {
    console.error("Error creating loan interest rate:", error);
    const message = error instanceof Error ? error.message : "Failed to create rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
