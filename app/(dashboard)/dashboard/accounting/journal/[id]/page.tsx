"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, Badge } from "antd";
import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import { App } from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";

interface Line {
  id: number;
  account_id: number;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  description?: string;
  status: string;
  posted_at?: string;
  created_at: string;
  lines: Line[];
}

export default function JournalDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { message } = App.useApp();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/journal/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then(setEntry)
      .catch(() => message.error("Jurnal tidak ditemukan"))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePost = async () => {
    try {
      setPosting(true);
      const res = await fetch(`/api/journal/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      message.success("Jurnal berhasil diposting");
      if (entry) setEntry({ ...entry, status: "posted", posted_at: new Date().toISOString() });
    } catch (e: any) {
      message.error(e.message || "Gagal posting");
    } finally {
      setPosting(false);
    }
  };

  const columns: ColumnsType<Line> = [
    { title: "Kode", dataIndex: "account_code", key: "account_code", width: 100 },
    { title: "Nama Akun", dataIndex: "account_name", key: "account_name" },
    {
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      align: "right",
      render: (v: number) =>
        v > 0 ? new Intl.NumberFormat("id-ID").format(v) : "-",
    },
    {
      title: "Kredit",
      dataIndex: "credit",
      key: "credit",
      align: "right",
      render: (v: number) =>
        v > 0 ? new Intl.NumberFormat("id-ID").format(v) : "-",
    },
    { title: "Keterangan", dataIndex: "description", key: "description", ellipsis: true },
  ];

  if (loading || !entry) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/accounting/journal">
          <Button icon={<ArrowLeftOutlined />}>Kembali</Button>
        </Link>
        <Card loading={loading} />
      </div>
    );
  }

  const totalDebit = entry.lines?.reduce((s, l) => s + Number(l.debit), 0) || 0;
  const totalCredit = entry.lines?.reduce((s, l) => s + Number(l.credit), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/accounting/journal">
            <Button icon={<ArrowLeftOutlined />}>Kembali</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {entry.entry_number}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {entry.entry_date ? format(new Date(entry.entry_date), "dd MMMM yyyy") : "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            status={entry.status === "posted" ? "success" : "warning"}
            text={entry.status === "posted" ? "Posted" : "Draft"}
          />
          {entry.status === "draft" && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handlePost}
              loading={posting}
            >
              Post
            </Button>
          )}
        </div>
      </div>

      <Card title={entry.description || "Deskripsi"}>
        <Table
          columns={columns}
          dataSource={entry.lines || []}
          rowKey="id"
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2} align="right">
                  <strong>Total</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  {new Intl.NumberFormat("id-ID").format(totalDebit)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {new Intl.NumberFormat("id-ID").format(totalCredit)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
}
