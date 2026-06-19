"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { PosSelfServiceHeader } from "@/components/pos/pos-self-service-header";
import { PosSelfServiceProvider } from "@/components/pos/pos-self-service-context";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PosSelfServiceProvider>
        <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
          <PosSelfServiceHeader />
          {children}
        </div>
      </PosSelfServiceProvider>
    </SessionProvider>
  );
}
