"use client";

import { Card } from "antd";
import { WarningOutlined } from "@ant-design/icons";

export default function MemberUnlinkedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md" title={<span className="flex items-center gap-2"><WarningOutlined /> Akun belum terhubung</span>}>
        <p className="text-[hsl(var(--muted-foreground))]">
          Akun Anda belum terhubung dengan data anggota. Silakan hubungi pengurus koperasi untuk mengaktifkan akses portal anggota.
        </p>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Pastikan email Anda pada data anggota sama dengan email akun login.
        </p>
      </Card>
    </div>
  );
}
