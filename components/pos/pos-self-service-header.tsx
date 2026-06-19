"use client";

import { useSession } from "next-auth/react";
import { Button } from "antd";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePosSelfService } from "@/components/pos/pos-self-service-context";

export function PosSelfServiceHeader() {
  const { data: session, status: sessionStatus } = useSession();
  const { access, handleSignOut } = usePosSelfService();

  const memberId = (session?.user as { memberId?: number | null })?.memberId ?? null;
  const memberName = session?.user?.name ?? "Anggota";
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const isAnggota = roles.includes("anggota");

  const showSessionInfo =
    access.status === "allowed" &&
    sessionStatus === "authenticated" &&
    isAnggota &&
    !!memberId;

  const warehouseName = access.status === "allowed" ? access.warehouseName : "";

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-teal-600">POS Self-Service</div>
          {showSessionInfo && (
            <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
              {memberName} • {warehouseName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {showSessionInfo && (
            <Button type="text" size="small" onClick={handleSignOut}>
              Keluar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
