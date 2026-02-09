import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdProvider } from "@/components/providers/antd-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { AntdApp } from "@/components/providers/antd-app";
import "./globals.css";
import "antd/dist/reset.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koperasi Maju ERP",
  description: "Enterprise Resource Planning System for Koperasi Maju",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <AntdProvider>
            <AntdApp>
              {children}
            </AntdApp>
          </AntdProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
