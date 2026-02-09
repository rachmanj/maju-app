"use client";

import { Button } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useAntdTheme } from "@/components/providers/use-antd-theme";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useAntdTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button icon={<SunOutlined />} disabled />;
  }

  return (
    <Button
      type="text"
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="!text-[hsl(var(--muted-foreground))] hover:!text-teal-500 hover:!bg-teal-500/10"
    />
  );
}
