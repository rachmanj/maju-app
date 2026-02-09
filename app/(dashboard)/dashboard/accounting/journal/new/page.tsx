"use client";

import { useEffect, useState } from "react";
import { Form, Input, Button, Card, DatePicker, InputNumber, Space, App, Select } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface COAAccount {
  id: number;
  code: string;
  name: string;
  account_type: string;
}

export default function NewJournalPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState<COAAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/accounting/coa")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => message.error("Gagal memuat chart of accounts"));
  }, []);

  const onFinish = async (values: any) => {
    let entryDate = format(new Date(), "yyyy-MM-dd");
    if (values.entry_date) {
      const d = values.entry_date.$d ?? values.entry_date;
      entryDate = d instanceof Date ? format(d, "yyyy-MM-dd") : format(new Date(d), "yyyy-MM-dd");
    }

    const lines = (values.lines || []).filter(
      (l: any) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0)
    );

    const totalDebit = lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      message.error("Total debit harus sama dengan total kredit");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: entryDate,
          description: values.description,
          lines: lines.map((l: any) => ({
            account_id: l.account_id,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      message.success("Jurnal berhasil dibuat");
      router.push("/dashboard/accounting/journal");
    } catch (e: any) {
      message.error(e.message || "Gagal membuat jurnal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          Entri Jurnal Baru
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Buat jurnal manual (draft)
        </p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            entry_date: undefined,
            lines: [{}, {}],
          }}
        >
          <Form.Item
            name="entry_date"
            label="Tanggal"
            rules={[{ required: true, message: "Tanggal wajib diisi" }]}
          >
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea rows={2} placeholder="Deskripsi jurnal" />
          </Form.Item>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">Detail Jurnal</span>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                    Tambah Baris
                  </Button>
                </div>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} className="mb-2 flex w-full" align="baseline">
                    <Form.Item
                      {...rest}
                      name={[name, "account_id"]}
                      rules={[{ required: true }]}
                      className="!mb-0 min-w-[200px]"
                    >
                      <Select
                        placeholder="Akun"
                        showSearch
                        optionFilterProp="label"
                        options={accounts.map((a) => ({
                          value: a.id,
                          label: `${a.code} - ${a.name}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, "debit"]} className="!mb-0 w-32">
                      <InputNumber placeholder="Debit" min={0} className="w-full" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, "credit"]} className="!mb-0 w-32">
                      <InputNumber placeholder="Kredit" min={0} className="w-full" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, "description"]} className="!mb-0 flex-1">
                      <Input placeholder="Keterangan" />
                    </Form.Item>
                    {fields.length > 2 && (
                      <MinusCircleOutlined
                        className="text-red-500"
                        onClick={() => remove(name)}
                      />
                    )}
                  </Space>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item className="mt-6">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Simpan Draft
              </Button>
              <Button onClick={() => router.back()}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
