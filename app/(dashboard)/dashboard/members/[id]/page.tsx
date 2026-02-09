"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Descriptions, Button, Spin, App } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import Link from "next/link";
import { MemberApprovalButton } from "@/components/members/member-approval-button";

interface Member {
  id: number;
  nik: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string;
  status: string;
  joined_date?: string;
  project_name?: string;
  project_code?: string;
  created_at?: string;
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      const id = params.id as string;
      if (!id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/members/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            message.error("Anggota tidak ditemukan");
            router.push("/dashboard/members");
            return;
          }
          throw new Error("Failed to fetch member");
        }
        const data = await response.json();
        setMember(data);
      } catch (error: any) {
        message.error(error.message || "Gagal memuat data anggota");
        router.push("/dashboard/members");
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [params.id, message, router]);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: "Aktif",
      pending: "Menunggu",
      inactive: "Tidak Aktif",
      resigned: "Keluar",
    };
    return map[status] || status;
  };

  if (loading || !member) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/dashboard/members")}
          >
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{member.name}</h1>
            <p className="text-muted-foreground">
              Detail anggota • NIK {member.nik}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {member.status === "pending" && (
            <MemberApprovalButton
              memberId={member.id}
              onSuccess={() => setMember({ ...member, status: "active" })}
            />
          )}
          <Link href={`/dashboard/members/${member.id}/edit`}>
            <Button type="primary" icon={<EditOutlined />}>
              Ubah
            </Button>
          </Link>
        </div>
      </div>

      <Card title="Data Anggota">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="NIK">
            <span className="font-mono">{member.nik}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Nama Lengkap">{member.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{member.email || "-"}</Descriptions.Item>
          <Descriptions.Item label="Telepon">{member.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label="Jabatan">{member.job_title || "-"}</Descriptions.Item>
          <Descriptions.Item label="Status">{getStatusLabel(member.status)}</Descriptions.Item>
          <Descriptions.Item label="Project">
            {member.project_name
              ? `${member.project_code || ""} - ${member.project_name}`.trim()
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tanggal Bergabung">
            {member.joined_date
              ? new Date(member.joined_date).toLocaleDateString("id-ID")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Alamat" span={2}>
            {member.address || "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
