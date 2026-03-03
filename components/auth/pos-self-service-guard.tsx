"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function POSSelfServiceGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    const roles = (session?.user as { roles?: string[] })?.roles ?? [];
    const isAnggota = roles.includes("anggota");

    if (status === "authenticated" && (memberId == null || memberId === 0)) {
      if (isAnggota) {
        router.replace("/member/unlinked");
      } else {
        router.replace("/dashboard");
      }
      return;
    }
    if (status === "authenticated" && !isAnggota) {
      router.replace("/dashboard");
      return;
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
  const memberId = (session?.user as { memberId?: number | null })?.memberId;
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  if (memberId == null || memberId === 0 || !roles.includes("anggota")) return null;
  return <>{children}</>;
}
