"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  App,
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

interface SavingsInterestRate {
  id: number;
  savings_type_id: number;
  savings_type_code: string;
  savings_type_name: string;
  rate_percentage: number;
  effective_date: string;
  expiry_date: string | null;
  calculation_method: string | null;
  is_active: boolean | null;
}

interface SavingsType {
  id: number;
  code: string;
  name: string;
  earns_interest?: boolean;
}

export function SavingsInterestRatesTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [rates, setRates] = useState<SavingsInterestRate[]>([]);
  const [savingsTypes, setSavingsTypes] = useState<SavingsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/savings-interest-rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data);
      }
    } catch {
      message.error("Gagal memuat tarif bunga simpanan");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchSavingsTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/savings");
      if (res.ok) {
        const data = await res.json();
        setSavingsTypes(Array.isArray(data) ? data : []);
      }
    } catch {
      setSavingsTypes([]);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    fetchSavingsTypes();
  }, [fetchRates, fetchSavingsTypes]);

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: SavingsInterestRate) => {
    setEditingId(record.id);
    form.setFieldsValue({
      savings_type_id: record.savings_type_id,
      rate_percentage: record.rate_percentage,
      effective_date: record.effective_date ? dayjs(record.effective_date) : null,
      expiry_date: record.expiry_date ? dayjs(record.expiry_date) : null,
      calculation_method: record.calculation_method ?? "monthly",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingId) {
        const res = await fetch(`/api/settings/savings-interest-rates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rate_percentage: values.rate_percentage,
            effective_date: values.effective_date?.format("YYYY-MM-DD"),
            expiry_date: values.expiry_date?.format("YYYY-MM-DD") || undefined,
            calculation_method: values.calculation_method,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal memperbarui");
        }
        message.success("Tarif bunga berhasil diperbarui");
      } else {
        const res = await fetch("/api/settings/savings-interest-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            savings_type_id: values.savings_type_id,
            rate_percentage: values.rate_percentage,
            effective_date: values.effective_date?.format("YYYY-MM-DD"),
            expiry_date: values.expiry_date?.format("YYYY-MM-DD") || undefined,
            calculation_method: values.calculation_method ?? "monthly",
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menambah");
        }
        message.success("Tarif bunga berhasil ditambah");
      }

      setModalOpen(false);
      fetchRates();
    } catch (error: unknown) {
      if (error instanceof Error && error.message !== "Validation failed") {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/savings-interest-rates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus");
      }
      message.success("Tarif bunga berhasil dihapus");
      fetchRates();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      message.error(msg);
    }
  };

  const columns: ColumnsType<SavingsInterestRate> = [
    { title: "Jenis Simpanan", dataIndex: "savings_type_name", key: "savings_type_name" },
    {
      title: "Tarif (%)",
      dataIndex: "rate_percentage",
      key: "rate_percentage",
      render: (v: number) => `${v}%`,
    },
    { title: "Tanggal Berlaku", dataIndex: "effective_date", key: "effective_date" },
    { title: "Tanggal Berakhir", dataIndex: "expiry_date", key: "expiry_date", render: (v) => v || "-" },
    {
      title: "Aksi",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm
            title="Hapus tarif ini?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Tambah Tarif
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={rates}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingId ? "Ubah Tarif Bunga Simpanan" : "Tambah Tarif Bunga Simpanan"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Jenis Simpanan"
            name="savings_type_id"
            rules={[{ required: true, message: "Pilih jenis simpanan" }]}
          >
            <Select
              placeholder="Pilih jenis simpanan"
              options={savingsTypes
                .filter((t) => t.earns_interest)
                .map((t) => ({ label: t.name, value: t.id }))}
              disabled={!!editingId}
            />
          </Form.Item>
          <Form.Item
            label="Tarif (%)"
            name="rate_percentage"
            rules={[{ required: true, message: "Tarif wajib diisi" }]}
          >
            <InputNumber min={0} max={100} step={0.01} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Tanggal Berlaku"
            name="effective_date"
            rules={[{ required: true, message: "Tanggal berlaku wajib diisi" }]}
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="Tanggal Berakhir" name="expiry_date">
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="Metode Perhitungan" name="calculation_method">
            <Select
              options={[
                { label: "Bulanan", value: "monthly" },
                { label: "Harian", value: "daily" },
                { label: "Tahunan", value: "yearly" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
