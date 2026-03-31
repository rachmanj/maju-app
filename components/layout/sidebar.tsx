"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  AuditOutlined,
  LineChartOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

function flattenMenuKeys(items: MenuProps["items"]): string[] {
  const keys: string[] = [];
  function walk(nodes: MenuProps["items"]) {
    for (const node of nodes ?? []) {
      if (!node) continue;
      if ("children" in node && node.children) {
        for (const ch of node.children) {
          if (!ch) continue;
          if ("children" in ch && ch.children) {
            walk(ch.children as MenuProps["items"]);
          } else if ("key" in ch && typeof ch.key === "string") {
            keys.push(ch.key);
          }
        }
      } else if ("key" in node && typeof node.key === "string") {
        keys.push(node.key);
      }
    }
  }
  walk(items);
  return keys;
}

function useMenuItems(): MenuProps["items"] {
  const { data: session } = useSession();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const showUsers = hasPermission(roles, PERMISSIONS.ADMIN_USERS);
  const showSettings = hasPermission(roles, PERMISSIONS.ADMIN_SETTINGS);
  const showAudit = hasPermission(roles, PERMISSIONS.ADMIN_AUDIT);
  const showMonitoring = hasPermission(roles, PERMISSIONS.ADMIN_MONITORING);

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
    { key: "/dashboard/inventory/consignment", label: "Konsinyasi", icon: <TruckOutlined /> },
    {
      key: "sub-pos",
      label: "POS",
      icon: <ShoppingCartOutlined />,
      children: [
        { key: "/dashboard/pos", label: "Kasir" },
        { key: "/dashboard/pos/laporan-transaksi", label: "Laporan Transaksi" },
      ],
    },
    { key: "/dashboard/receivables", label: "Piutang", icon: <DollarOutlined /> },
    { key: "/dashboard/expenses", label: "Pengeluaran", icon: <DollarOutlined /> },
    { key: "/dashboard/orders", label: "Pesanan", icon: <ShoppingOutlined /> },
    {
      key: "sub-laporan",
      label: "Laporan",
      icon: <FileTextOutlined />,
      children: [
        { key: "/dashboard/accounting/reports?tab=trial-balance", label: "Trial Balance" },
        { key: "/dashboard/accounting/reports?tab=general-ledger", label: "Buku Besar" },
        { key: "/dashboard/accounting/reports?tab=payroll-deduction", label: "Potongan Gaji" },
        { key: "/dashboard/accounting/reports?tab=balance-sheet", label: "Neraca" },
        { key: "/dashboard/accounting/reports?tab=profit-loss", label: "Laba Rugi" },
        { key: "/dashboard/reports/daily?tab=pos", label: "Penjualan POS" },
        { key: "/dashboard/reports/daily?tab=cash", label: "Kas Harian" },
        { key: "/dashboard/reports/daily?tab=stock", label: "Mutasi Stok" },
      ],
    },
    ...(showAudit
      ? [{ key: "/dashboard/audit-logs", label: "Audit Log", icon: <AuditOutlined /> }]
      : []),
    ...(showMonitoring
      ? [{ key: "/dashboard/monitoring", label: "Monitoring", icon: <LineChartOutlined /> }]
      : []),
    ...(showSettings
      ? [{ key: "/dashboard/settings", label: "Pengaturan", icon: <SettingOutlined /> }]
      : []),
  ];
  return items;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const fullPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const selectedKey = (() => {
    const flatKeys = flattenMenuKeys(menuItems);
    if (flatKeys.includes(fullPath)) return fullPath;
    if (flatKeys.includes(pathname)) return pathname;
    const prefixMatches = flatKeys
      .filter((k) => {
        const base = k.split("?")[0];
        return pathname === base || pathname.startsWith(base + "/");
      })
      .sort((a, b) => b.length - a.length);
    return (prefixMatches[0] ?? fullPath) as string;
  })();

  const laporanOpenKeys = useMemo(() => {
    if (
      pathname.startsWith("/dashboard/accounting/reports") ||
      pathname.startsWith("/dashboard/reports/daily")
    ) {
      return ["sub-laporan"];
    }
    return [];
  }, [pathname]);

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
          className="text-[hsl(var(--sidebar-foreground))]/80! hover:text-white! shrink-0"
          aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
        />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={
            pathname.startsWith("/dashboard/pos")
              ? ["sub-pos"]
              : laporanOpenKeys.length > 0
                ? laporanOpenKeys
                : []
          }
          items={menuItems}
          onClick={handleMenuClick}
          inlineCollapsed={isCollapsed}
          className="border-0! bg-transparent! [&_.ant-menu-item]:mx-2! [&_.ant-menu-item]:rounded-lg! [&_.ant-menu-item-selected]:bg-teal-500/20! [&_.ant-menu-item-selected]:text-teal-400! [&_.ant-menu-item]:text-[hsl(var(--sidebar-foreground))]/80! [&_.ant-menu-item:hover]:text-white! [&_.ant-menu-item]:h-11! [&_.ant-menu-submenu-title]:mx-2! [&_.ant-menu-submenu-title]:rounded-lg! [&_.ant-menu-submenu-selected>.ant-menu-submenu-title]:text-teal-400!"
          style={{ background: "transparent" }}
        />
      </div>
    </aside>
  );
}
