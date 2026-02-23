"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button, Dropdown, Avatar } from "antd";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { UserOutlined, LogoutOutlined, LockOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

const ROLE_NAMES: Record<string, string> = {
  superadmin: "Superadmin",
  manager: "Manager",
  pengurus: "Pengurus",
  kasir: "Kasir",
  pengawas: "Pengawas",
  anggota: "Anggota",
};

export function Header() {
  const { data: session } = useSession();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const roleLabel = roles.length > 0
    ? roles.map((r) => ROLE_NAMES[r] ?? r).join(", ")
    : "";

  const menuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div className="min-w-[180px] py-2">
          <div className="truncate font-medium text-[hsl(var(--foreground))]">{session?.user?.name}</div>
          <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{session?.user?.email}</div>
        </div>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "change-password",
      label: "Ubah Password",
      icon: <LockOutlined />,
      onClick: () => setChangePasswordOpen(true),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: () => signOut(),
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-1 w-1 rounded-full bg-teal-500" aria-hidden />
        <h2 className="truncate text-base font-medium text-[hsl(var(--foreground))]">
          ERP System
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {session?.user && <NotificationCenter />}
        {session?.user && (
          <>
            <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
              <Button
                type="text"
                className="!flex !h-9 !items-center !gap-2 !rounded-full !border-0 !px-2 !py-1 hover:!bg-teal-500/10"
              >
                <div className="hidden text-right sm:block">
                  <div className="truncate text-sm font-medium leading-tight text-[hsl(var(--foreground))]">
                    {session.user.name}
                  </div>
                  {roleLabel && (
                    <div className="truncate text-xs leading-tight text-[hsl(var(--muted-foreground))]">
                      {roleLabel}
                    </div>
                  )}
                </div>
                <Avatar
                  icon={<UserOutlined />}
                  size="small"
                  className="!bg-teal-500 !text-white shrink-0"
                />
              </Button>
            </Dropdown>
            <ChangePasswordModal
              open={changePasswordOpen}
              onClose={() => setChangePasswordOpen(false)}
            />
          </>
        )}
      </div>
    </header>
  );
}
