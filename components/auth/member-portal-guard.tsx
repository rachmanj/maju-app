"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function MemberPortalGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isUnlinkedPage = pathname === "/member/unlinked";

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (status === "authenticated" && (memberId == null || memberId === 0)) {
      const roles = (session?.user as { roles?: string[] })?.roles ?? [];
      const isAnggota = roles.includes("anggota");
      if (isAnggota) {
        router.replace("/member/unlinked");
        return;
      }
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-muted-foreground">Memuat...</div>
      </div>
    );
  }
  if (status === "unauthenticated") return null;
  if (isUnlinkedPage) return <>{children}</>;
  const memberId = (session?.user as { memberId?: number | null })?.memberId;
  if (memberId == null || memberId === 0) return null;
  return <>{children}</>;
}
