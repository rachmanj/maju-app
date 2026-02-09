"use client";

import { ConfigProvider, theme } from "antd";
import { ReactNode, useEffect, useState } from "react";

export function AntdProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check system preference or localStorage
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored === "dark" || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    
    // Update HTML class for Tailwind dark mode compatibility
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for theme changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("theme");
      const shouldBeDark = stored === "dark";
      setIsDark(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  if (!mounted) {
    return <ConfigProvider>{children}</ConfigProvider>;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? "#2dd4bf" : "#0d9488",
          borderRadius: 8,
          colorSuccess: "#10b981",
          colorWarning: "#f59e0b",
          colorError: "#ef4444",
          colorInfo: "#0ea5e9",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
