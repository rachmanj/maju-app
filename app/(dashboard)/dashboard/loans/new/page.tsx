"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, App, Select, InputNumber } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";

interface Member {
  id: number;
  nik: string;
  name: string;
  status: string;
}

export default function NewLoanApplicationPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);

  const fetchMembers = useCallback(async (search?: string) => {
    setMemberSearching(true);
    try {
      const params = new URLSearchParams({ limit: "50", status: "active" });
      if (search) params.set("search", search);
      const r = await fetch(`/api/members?${params}`);
      if (!r.ok) throw new Error("Gagal memuat anggota");
      const data = await r.json();
      setMembers(data.members || []);
    } catch {
      setMembers([]);
    } finally {
      setMemberSearching(false);
    }
  }, []);

  const onSubmit = async (values: {
    member_id: number;
    requested_amount: number;
    requested_term_months: number;
    purpose?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: values.member_id,
          requested_amount: values.requested_amount,
          requested_term_months: values.requested_term_months,
          purpose: values.purpose || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal membuat pengajuan pinjaman");
      }

      message.success("Pengajuan pinjaman berhasil dibuat");
      router.push("/dashboard/loans");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/loans">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Pengajuan Pinjaman Baru</h1>
          <p className="text-muted-foreground">Buat pengajuan pinjaman untuk anggota</p>
        </div>
      </div>

      <Card title="Data Pengajuan">
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          className="max-w-xl"
        >
          <Form.Item
            name="member_id"
            label="Anggota"
            rules={[{ required: true, message: "Pilih anggota" }]}
          >
            <Select
              showSearch
              placeholder="Cari nama atau NIK..."
              filterOption={false}
              onSearch={(v) => fetchMembers(v || undefined)}
              onOpenChange={(open) => open && members.length === 0 && fetchMembers()}
              loading={memberSearching}
              notFoundContent={memberSearching ? "Memuat..." : "Ketik untuk mencari"}
              options={members.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.nik})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="requested_amount"
            label="Jumlah Pinjaman (Rp)"
            rules={[
              { required: true, message: "Jumlah pinjaman wajib diisi" },
              {
                validator: (_, v) => {
                  if (v != null && v <= 0) return Promise.reject(new Error("Jumlah harus lebih dari 0"));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              className="w-full"
              min={1}
              placeholder="0"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={((v: string | undefined) => Number(String(v ?? "").replace(/,/g, "")) || 0) as any}
            />
          </Form.Item>

          <Form.Item
            name="requested_term_months"
            label="Tenor (bulan)"
            rules={[
              { required: true, message: "Tenor wajib diisi" },
              {
                validator: (_, v) => {
                  if (v != null && (v < 1 || v > 120)) {
                    return Promise.reject(new Error("Tenor antara 1–120 bulan"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber className="w-full" min={1} max={120} placeholder="12" />
          </Form.Item>

          <Form.Item name="purpose" label="Tujuan Pinjaman">
            <Input.TextArea rows={3} placeholder="Opsional" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Buat Pengajuan
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
