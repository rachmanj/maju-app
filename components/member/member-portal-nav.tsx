"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button, Avatar, Dropdown } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import Link from "next/link";

const navItems = [
  { href: "/member/dashboard", label: "Dashboard" },
  { href: "/member/savings", label: "Simpanan" },
  { href: "/member/loans", label: "Pinjaman" },
  { href: "/member/transactions", label: "Transaksi" },
  { href: "/member/orders", label: "Pesanan" },
];

export function MemberPortalNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems: MenuProps["items"] = [
    {
      key: "user",
      label: (
        <div className="min-w-[160px] py-1">
          <div className="truncate font-medium">{session?.user?.name}</div>
          <div className="truncate text-xs text-gray-500">{session?.user?.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: () => signOut({ callbackUrl: "/login" }),
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/member/dashboard" className="text-lg font-semibold text-teal-600">
          Koperasi Maju
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-teal-500/15 text-teal-600"
                  : "text-[hsl(var(--foreground))]/80 hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
          <Button type="text" className="!flex !h-9 !w-9 !items-center !justify-center !rounded-full !p-0">
            <Avatar icon={<UserOutlined />} size="small" className="!bg-teal-500 !text-white" />
          </Button>
        </Dropdown>
      </div>
    </header>
  );
}
