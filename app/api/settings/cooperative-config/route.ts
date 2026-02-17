import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { SettingsService } from "@/lib/services/settings-service";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await SettingsService.getCooperativeConfig();
    return NextResponse.json(config ?? {});
  } catch (error: unknown) {
    console.error("Error fetching cooperative config:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, phone, email, logo_url } = body;

    const config = await SettingsService.upsertCooperativeConfig({
      name,
      address,
      phone,
      email,
      logo_url,
    });
    return NextResponse.json(config);
  } catch (error: unknown) {
    console.error("Error updating cooperative config:", error);
    const message = error instanceof Error ? error.message : "Failed to update config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
