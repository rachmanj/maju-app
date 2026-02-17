import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { SettingsService } from "@/lib/services/settings-service";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rate_percentage, effective_date, expiry_date, calculation_method, is_active } = body;

    const rate = await SettingsService.updateSavingsInterestRate(Number(id), {
      ...(rate_percentage !== undefined && { rate_percentage: Number(rate_percentage) }),
      ...(effective_date && { effective_date: new Date(effective_date) }),
      ...(expiry_date !== undefined && { expiry_date: expiry_date ? new Date(expiry_date) : undefined }),
      ...(calculation_method !== undefined && { calculation_method }),
      ...(is_active !== undefined && { is_active }),
    });
    return NextResponse.json(rate);
  } catch (error: unknown) {
    console.error("Error updating savings interest rate:", error);
    const message = error instanceof Error ? error.message : "Failed to update rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await SettingsService.deleteSavingsInterestRate(Number(id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting savings interest rate:", error);
    const message = error instanceof Error ? error.message : "Failed to delete rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
