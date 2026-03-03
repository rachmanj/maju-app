"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Tabs } from "antd";
import { SettingOutlined, UserOutlined, DollarOutlined, BankOutlined, ProjectOutlined, ApartmentOutlined, AppstoreOutlined, TagsOutlined, DesktopOutlined } from "@ant-design/icons";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UserPreferencesForm } from "@/components/settings/user-preferences-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { SavingsInterestRatesTable } from "@/components/settings/savings-interest-rates-table";
import { LoanInterestRatesTable } from "@/components/settings/loan-interest-rates-table";
import { CooperativeConfigForm } from "@/components/settings/cooperative-config-form";
import { ProjectsTable } from "@/components/settings/projects-table";
import { DepartmentsTable } from "@/components/settings/departments-table";
import { UnitsTable } from "@/components/settings/units-table";
import { CategoriesTable } from "@/components/settings/categories-table";
import { POSSelfServiceDevicesTable } from "@/components/settings/pos-self-service-devices-table";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    const roles = (session.user as { roles?: string[] })?.roles ?? [];
    if (!hasPermission(roles, PERMISSIONS.ADMIN_SETTINGS)) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-6">Memuat...</div>;
  }

  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  if (!hasPermission(roles, PERMISSIONS.ADMIN_SETTINGS)) {
    return null;
  }

  const tabItems = [
    {
      key: "preferences",
      label: (
        <span>
          <UserOutlined className="mr-2" />
          Preferensi Pengguna
        </span>
      ),
      children: (
        <div className="space-y-6">
          <UserPreferencesForm />
          <NotificationPreferencesForm />
        </div>
      ),
    },
    {
      key: "interest-rates",
      label: (
        <span>
          <DollarOutlined className="mr-2" />
          Tarif Bunga
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="Bunga Simpanan">
            <SavingsInterestRatesTable />
          </Card>
          <Card title="Bunga Pinjaman">
            <LoanInterestRatesTable />
          </Card>
        </div>
      ),
    },
    {
      key: "cooperative",
      label: (
        <span>
          <BankOutlined className="mr-2" />
          Konfigurasi Koperasi
        </span>
      ),
      children: (
        <Card>
          <CooperativeConfigForm />
        </Card>
      ),
    },
    {
      key: "projects",
      label: (
        <span>
          <ProjectOutlined className="mr-2" />
          Proyek
        </span>
      ),
      children: (
        <Card title="Data Proyek">
          <ProjectsTable />
        </Card>
      ),
    },
    {
      key: "departments",
      label: (
        <span>
          <ApartmentOutlined className="mr-2" />
          Departemen
        </span>
      ),
      children: (
        <Card title="Data Departemen">
          <DepartmentsTable />
        </Card>
      ),
    },
    {
      key: "units",
      label: (
        <span>
          <AppstoreOutlined className="mr-2" />
          Satuan (UOM)
        </span>
      ),
      children: (
        <Card title="Satuan Produk">
          <UnitsTable />
        </Card>
      ),
    },
    {
      key: "categories",
      label: (
        <span>
          <TagsOutlined className="mr-2" />
          Kategori Produk
        </span>
      ),
      children: (
        <Card title="Kategori Produk">
          <CategoriesTable />
        </Card>
      ),
    },
    {
      key: "pos-self-service",
      label: (
        <span>
          <DesktopOutlined className="mr-2" />
          POS Self-Service
        </span>
      ),
      children: (
        <Card title="Device POS Self-Service (IP + Gudang)">
          <POSSelfServiceDevicesTable />
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">Konfigurasi sistem dan preferensi</p>
      </div>
      <Card>
        <Tabs defaultActiveKey="preferences" items={tabItems} />
      </Card>
    </div>
  );
}
