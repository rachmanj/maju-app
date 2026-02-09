"use client";

import { useState } from "react";
import { Button, App } from "antd";
import { CheckOutlined } from "@ant-design/icons";

interface MemberApprovalButtonProps {
  memberId: number;
  onSuccess?: () => void;
}

export function MemberApprovalButton({ memberId, onSuccess }: MemberApprovalButtonProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/members/${memberId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menyetujui anggota");
      }

      message.success("Anggota berhasil disetujui");
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      icon={<CheckOutlined />}
      loading={loading}
      onClick={handleApprove}
    >
      Setujui Anggota
    </Button>
  );
}
