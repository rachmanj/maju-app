"use client";

import { SessionProvider } from "@/components/providers/session-provider";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
        {children}
      </div>
    </SessionProvider>
  );
}
