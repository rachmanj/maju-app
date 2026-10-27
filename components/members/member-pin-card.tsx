"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { App, Button, Card, Modal, Space, Spin, Typography } from "antd";
import { CopyOutlined, SafetyOutlined, UnlockOutlined } from "@ant-design/icons";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

interface PinStatus {
  has_pin: boolean;
  is_active: boolean;
  must_change_pin: boolean;
  locked_until: string | null;
  failed_attempts: number;
  last_reset_at: string | null;
  last_reset_by: number | null;
}

interface MemberPinCardProps {
  memberId: number;
}

type ResetModalStep = "confirm" | "result";

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function isLockedInFuture(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

function renderStatusLabel(status: PinStatus | null): string {
  if (!status || !status.has_pin) {
    return "Belum diatur";
  }
  if (isLockedInFuture(status.locked_until)) {
    const until = new Date(status.locked_until!).toLocaleString("id-ID");
    return `Terkunci sampai ${until}`;
  }
  if (status.must_change_pin) {
    return "PIN sementara wajib diganti";
  }
  return "Aktif";
}

export function MemberPinCard({ memberId }: MemberPinCardProps) {
  const { data: session } = useSession();
  const { message } = App.useApp();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const canResetPin = hasPermission(roles, PERMISSIONS.MEMBER_RESET_PIN);

  const [loading, setLoading] = useState(true);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<ResetModalStep>("confirm");
  const [resetLoading, setResetLoading] = useState(false);
  const [tempPin, setTempPin] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  const loadPinStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/members/${memberId}/pin`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat status PIN");
      }
      setPinStatus(data as PinStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat status PIN";
      message.error(msg);
      setPinStatus(null);
    } finally {
      setLoading(false);
    }
  }, [memberId, message]);

  useEffect(() => {
    loadPinStatus();
  }, [loadPinStatus]);

  const closeResetModal = () => {
    setResetModalOpen(false);
    setResetStep("confirm");
    setTempPin(null);
  };

  const handleResetConfirm = async () => {
    try {
      setResetLoading(true);
      const res = await fetch(`/api/members/${memberId}/pin/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mereset PIN");
      }
      setTempPin(data.temp_pin as string);
      setResetStep("result");
      message.success("PIN berhasil direset");
      await loadPinStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mereset PIN";
      message.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPin = async () => {
    if (!tempPin) return;
    const ok = await copyTextToClipboard(tempPin);
    if (ok) {
      message.success("PIN disalin ke clipboard");
    } else {
      message.error("Gagal menyalin PIN");
    }
  };

  const handleUnlock = async () => {
    try {
      setUnlockLoading(true);
      const res = await fetch(`/api/members/${memberId}/pin/unlock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuka blokir PIN");
      }
      message.success(data.message || "Blokir PIN berhasil dibuka");
      await loadPinStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuka blokir PIN";
      message.error(msg);
    } finally {
      setUnlockLoading(false);
    }
  };

  const locked = pinStatus ? isLockedInFuture(pinStatus.locked_until) : false;

  return (
    <>
      <Card
        title={
          <span>
            <SafetyOutlined className="mr-2" />
            PIN POS
          </span>
        }
        extra={
          canResetPin ? (
            <Space wrap>
              {locked && (
                <Button
                  icon={<UnlockOutlined />}
                  loading={unlockLoading}
                  onClick={handleUnlock}
                >
                  Buka Blokir
                </Button>
              )}
              <Button type="primary" onClick={() => setResetModalOpen(true)}>
                Reset PIN
              </Button>
            </Space>
          ) : null
        }
      >
        {loading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : (
          <div className="space-y-2">
            <Typography.Text>
              <strong>Status:</strong> {renderStatusLabel(pinStatus)}
            </Typography.Text>
            {pinStatus?.last_reset_at && (
              <Typography.Text type="secondary" className="block">
                Terakhir direset{" "}
                {new Date(pinStatus.last_reset_at).toLocaleString("id-ID")}
                {pinStatus.last_reset_by != null ? ` oleh user ${pinStatus.last_reset_by}` : ""}
              </Typography.Text>
            )}
          </div>
        )}
      </Card>

      <Modal
        title={resetStep === "confirm" ? "Reset PIN POS" : "PIN Sementara"}
        open={resetModalOpen}
        onCancel={() => {
          if (resetLoading) return;
          closeResetModal();
        }}
        footer={
          resetStep === "confirm"
            ? [
                <Button key="cancel" onClick={closeResetModal} disabled={resetLoading}>
                  Batal
                </Button>,
                <Button key="reset" type="primary" danger loading={resetLoading} onClick={handleResetConfirm}>
                  Reset PIN
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={closeResetModal}>
                  Tutup
                </Button>,
              ]
        }
        destroyOnHidden
      >
        {resetStep === "confirm" ? (
          <Typography.Paragraph>
            PIN lama anggota tidak akan berlaku lagi setelah reset. PIN sementara yang diberikan hanya dapat
            digunakan untuk <strong>satu transaksi</strong> di POS self-service, lalu anggota wajib mengganti PIN
            sendiri.
          </Typography.Paragraph>
        ) : (
          <div className="space-y-4">
            <Typography.Paragraph type="warning" className="mb-0">
              PIN ini hanya ditampilkan sekali. Berlaku 7 hari dan hanya untuk satu transaksi. Sampaikan PIN ini
              kepada anggota secara aman.
            </Typography.Paragraph>
            <div className="text-center py-4 rounded border bg-muted/30">
              <Typography.Text className="text-3xl font-mono tracking-widest uppercase select-all">
                {tempPin}
              </Typography.Text>
            </div>
            <Button icon={<CopyOutlined />} onClick={handleCopyPin} block>
              Salin
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
