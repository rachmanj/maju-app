"use client";

import { Button } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useAntdTheme } from "@/components/providers/use-antd-theme";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useAntdTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const newDark = !isDark;
    toggleTheme();
    if (session?.user?.id) {
      fetch("/api/settings/user-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newDark ? "dark" : "light" }),
      }).catch(() => {});
    }
  };

  if (!mounted) {
    return <Button icon={<SunOutlined />} disabled />;
  }

  return (
    <Button
      type="text"
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      onClick={handleToggle}
      aria-label="Toggle theme"
      className="!text-[hsl(var(--muted-foreground))] hover:!text-teal-500 hover:!bg-teal-500/10"
    />
  );
}
