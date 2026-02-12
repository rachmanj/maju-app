"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Button } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  WalletOutlined,
  CreditCardOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  AccountBookOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DollarOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

function useMenuItems(): MenuProps["items"] {
  const { data: session } = useSession();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const showUsers = hasPermission(roles, PERMISSIONS.ADMIN_USERS);

  const items: MenuProps["items"] = [
    { key: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { key: "/dashboard/members", label: "Anggota", icon: <UserOutlined /> },
    ...(showUsers
      ? [{ key: "/dashboard/users", label: "Pengguna", icon: <TeamOutlined /> }]
      : []),
    { key: "/dashboard/savings", label: "Simpanan", icon: <WalletOutlined /> },
    { key: "/dashboard/loans", label: "Pinjaman", icon: <CreditCardOutlined /> },
    { key: "/dashboard/accounting", label: "Akuntansi", icon: <AccountBookOutlined /> },
    { key: "/dashboard/inventory", label: "Inventory", icon: <InboxOutlined /> },
    { key: "/dashboard/pos", label: "POS", icon: <ShoppingCartOutlined /> },
    { key: "/dashboard/receivables", label: "Piutang", icon: <DollarOutlined /> },
    { key: "/dashboard/expenses", label: "Pengeluaran", icon: <DollarOutlined /> },
    { key: "/dashboard/orders", label: "Pesanan", icon: <ShoppingOutlined /> },
    { key: "/dashboard/accounting/reports", label: "Laporan", icon: <FileTextOutlined /> },
    { key: "/dashboard/reports/daily", label: "Laporan Harian", icon: <FileTextOutlined /> },
    { key: "/dashboard/settings", label: "Pengaturan", icon: <SettingOutlined /> },
  ];
  return items;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggle } = useSidebar();
  const menuItems = useMenuItems();
  
  useEffect(() => {
    // Auto-collapse on mobile
    const handleResize = () => {
      if (window.innerWidth < 768 && !isCollapsed) {
        toggle();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed, toggle]);

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    router.push(e.key);
  };

  const selectedKey = (() => {
    const exact = (menuItems ?? []).find(item => item?.key === pathname)?.key;
    if (exact) return exact as string;
    const prefix = (menuItems ?? []).find(item =>
      typeof item?.key === 'string' && pathname.startsWith(item.key + "/")
    )?.key;
    return (prefix ?? pathname) as string;
  })();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-[hsl(var(--sidebar-bg))] transition-all duration-300 ${
        isCollapsed ? "w-[80px]" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center shrink-0 justify-between gap-2 border-b border-white/10 px-4">
        {!isCollapsed ? (
          <span className="truncate text-base font-semibold text-[hsl(var(--sidebar-foreground))]">
            Koperasi Maju
          </span>
        ) : (
          <span className="text-lg font-bold text-teal-400">K</span>
        )}
        <Button
          type="text"
          icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggle}
          className="!text-[hsl(var(--sidebar-foreground))]/80 hover:!text-white shrink-0"
          aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
        />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          inlineCollapsed={isCollapsed}
          className="!border-0 !bg-transparent [&_.ant-menu-item]:!mx-2 [&_.ant-menu-item]:!rounded-lg [&_.ant-menu-item-selected]:!bg-teal-500/20 [&_.ant-menu-item-selected]:!text-teal-400 [&_.ant-menu-item]:!text-[hsl(var(--sidebar-foreground))]/80 [&_.ant-menu-item:hover]:!text-white [&_.ant-menu-item]:!h-11"
          style={{ background: "transparent" }}
        />
      </div>
    </aside>
  );
}
