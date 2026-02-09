"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function DashboardRedirect({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const roles = (session?.user as { roles?: string[] })?.roles ?? [];
    const isAnggotaOnly = roles.length === 1 && roles[0] === "anggota";
    if (isAnggotaOnly) {
      router.replace("/member");
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-muted-foreground">Memuat...</div>
      </div>
    );
  }
  if (status === "unauthenticated") return null;
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  if (roles.length === 1 && roles[0] === "anggota") return null;
  return <>{children}</>;
}
