"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { MemberPortalGuard } from "@/components/auth/member-portal-guard";
import { MemberPortalNav } from "@/components/member/member-portal-nav";

export default function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <MemberPortalGuard>
        <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
          <MemberPortalNav />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </MemberPortalGuard>
    </SessionProvider>
  );
}
