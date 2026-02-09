"use client";

import { App } from "antd";
import { ReactNode } from "react";

export function AntdApp({ children }: { children: ReactNode }) {
  return <App>{children}</App>;
}
