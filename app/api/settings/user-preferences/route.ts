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
    const prefs = await SettingsService.getUserPreferences(userId);
    return NextResponse.json(prefs ?? { theme: "light", language: "id", sidebar_collapsed: false });
  } catch (error: unknown) {
    console.error("Error fetching user preferences:", error);
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
    const { theme, language, sidebar_collapsed } = body;

    const userId = Number(session.user.id);
    const prefs = await SettingsService.upsertUserPreferences(userId, {
      ...(theme !== undefined && { theme }),
      ...(language !== undefined && { language }),
      ...(sidebar_collapsed !== undefined && { sidebar_collapsed }),
    });
    return NextResponse.json(prefs);
  } catch (error: unknown) {
    console.error("Error updating user preferences:", error);
    const message = error instanceof Error ? error.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
