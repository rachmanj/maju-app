import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { SettingsService } from "@/lib/services/settings-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const prefs = await SettingsService.getNotificationPreferences(userId);
    return NextResponse.json(prefs ?? { loan_reminder: true, savings_reminder: true, stock_alert: true });
  } catch (error: unknown) {
    console.error("Error fetching notification preferences:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { loan_reminder, savings_reminder, stock_alert } = body;

    const userId = Number(session.user.id);
    const prefs = await SettingsService.upsertNotificationPreferences(userId, {
      ...(loan_reminder !== undefined && { loan_reminder }),
      ...(savings_reminder !== undefined && { savings_reminder }),
      ...(stock_alert !== undefined && { stock_alert }),
    });
    return NextResponse.json(prefs);
  } catch (error: unknown) {
    console.error("Error updating notification preferences:", error);
    const message = error instanceof Error ? error.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
