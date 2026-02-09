"use client";

import { useSession, signOut } from "next-auth/react";
import { Button, Dropdown, Avatar } from "antd";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

export function Header() {
  const { data: session } = useSession();

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
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
            <Button
              type="text"
              className="!flex !h-9 !w-9 !items-center !justify-center !rounded-full !border-0 !p-0 hover:!bg-teal-500/10"
            >
              <Avatar
                icon={<UserOutlined />}
                size="small"
                className="!bg-teal-500 !text-white"
              />
            </Button>
          </Dropdown>
        )}
      </div>
    </header>
  );
}
