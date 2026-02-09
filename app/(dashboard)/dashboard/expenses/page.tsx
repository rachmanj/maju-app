"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, Form, Input, Select, InputNumber, Checkbox, App, Modal, Tabs } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { format } from "date-fns";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtCur = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface ExpenseCategory {
  id: number;
  code: string;
  name: string;
  account_id: number | null;
}

interface COAAccount {
  id: number;
  code: string;
  name: string;
  account_type: string;
}

export default function ExpensesPage() {
  const { message } = App.useApp();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<COAAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const loadCategories = () => {
    fetch("/api/finance/expense-categories")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setCategories(d) : []))
      .catch(() => message.error("Gagal memuat kategori"));
  };

  const loadCoa = () => {
    fetch("/api/accounting/coa")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setCoaAccounts(d) : []))
      .catch(() => setCoaAccounts([]));
  };

  const loadExpenses = () => {
    setLoading(true);
    const from = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
    const to = format(new Date(), "yyyy-MM-dd");
    fetch(`/api/finance/expenses?from_date=${from}&to_date=${to}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setExpenses(d.expenses ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => message.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
    loadCoa();
    loadExpenses();
  }, []);

  const expenseAccounts = coaAccounts.filter((a) => a.account_type === "expense");

  const openCategoryEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    categoryForm.setFieldsValue({
      account_id: cat.account_id ?? undefined,
    });
    setCategoryEditOpen(true);
  };

  const onCategoryEditFinish = async (values: { account_id?: number }) => {
    if (!editingCategory) return;
    try {
      const res = await fetch(`/api/finance/expense-categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: values.account_id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui");
      message.success("Kategori berhasil diperbarui");
      setCategoryEditOpen(false);
      setEditingCategory(null);
      loadCategories();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Gagal memperbarui");
    }
  };

  const onFinish = async (values: any) => {
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: values.category_id,
          amount: values.amount,
          expense_date: values.expense_date?.format?.("YYYY-MM-DD") ?? values.expense_date,
          description: values.description,
          reference_number: values.reference_number,
          create_journal: values.create_journal ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      message.success("Pengeluaran berhasil dicatat");
      form.resetFields();
      setModalOpen(false);
      loadExpenses();
    } catch (e: any) {
      message.error(e.message || "Gagal menyimpan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Pengeluaran Kas</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Catat pengeluaran dan buat jurnal otomatis</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Tambah Pengeluaran
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: "expenses",
            label: "Daftar Pengeluaran",
            children: (
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={expenses}
          pagination={{ pageSize: 20, total }}
          columns={[
            { title: "No.", dataIndex: "expense_number", width: 130 },
            { title: "Tanggal", dataIndex: "expense_date", width: 110, render: (d: string) => (d ? format(new Date(d), "dd/MM/yyyy") : "-") },
            { title: "Kategori", dataIndex: "category_name" },
            { title: "Jumlah", dataIndex: "amount", align: "right", render: (v: number) => fmtCur(v) },
            { title: "Keterangan", dataIndex: "description", ellipsis: true },
            { title: "Jurnal", dataIndex: "journal_entry_id", width: 80, render: (v: number) => (v ? "Ya" : "-") },
          ]}
        />
      </Card>
            ),
          },
          {
            key: "categories",
            label: "Kategori Biaya",
            children: (
              <Card
                title="Kategori Biaya"
                extra={
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    Tautkan kategori ke akun COA untuk jurnal otomatis
                  </span>
                }
              >
                <Table
                  rowKey="id"
                  dataSource={categories}
                  pagination={false}
                  columns={[
                    { title: "Kode", dataIndex: "code", width: 100 },
                    { title: "Nama", dataIndex: "name" },
                    {
                      title: "Akun COA",
                      key: "account",
                      render: (_: unknown, r: ExpenseCategory) => {
                        const acc = coaAccounts.find((a) => a.id === r.account_id);
                        return acc ? `${acc.code} - ${acc.name}` : "-";
                      },
                    },
                    {
                      title: "",
                      key: "action",
                      width: 80,
                      render: (_: unknown, r: ExpenseCategory) => (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openCategoryEdit(r)}
                        >
                          Edit
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Tambah Pengeluaran"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="category_id" label="Kategori" rules={[{ required: true }]}>
            <Select
              placeholder="Pilih kategori"
              options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="Jumlah" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="expense_date" label="Tanggal" initialValue={format(new Date(), "yyyy-MM-dd")} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="description" label="Keterangan">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="reference_number" label="No. Referensi">
            <Input />
          </Form.Item>
          <Form.Item name="create_journal" valuePropName="checked" initialValue={true}>
            <Checkbox>Buat jurnal otomatis (debit beban, kredit kas)</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Simpan
            </Button>
            <Button className="ml-2" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCategory ? `Edit Kategori: ${editingCategory.code} - ${editingCategory.name}` : "Edit Kategori"}
        open={categoryEditOpen}
        onCancel={() => {
          setCategoryEditOpen(false);
          setEditingCategory(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical" onFinish={onCategoryEditFinish}>
          <Form.Item
            name="account_id"
            label="Akun COA (untuk jurnal otomatis)"
            extra="Pilih akun beban untuk auto-journal saat mencatat pengeluaran"
          >
            <Select
              placeholder="Pilih akun beban"
              allowClear
              showSearch
              optionFilterProp="label"
              options={expenseAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Simpan
            </Button>
            <Button className="ml-2" onClick={() => setCategoryEditOpen(false)}>
              Batal
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
