"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Badge,
  Button,
  Row,
  Col,
  App,
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Table,
  Spin,
} from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, UnorderedListOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface SavingsType {
  id: number;
  code: string;
  name: string;
  is_mandatory: boolean;
  is_withdrawable: boolean;
  minimum_amount?: number;
  earns_interest: boolean;
}

interface Member {
  id: number;
  nik: string;
  name: string;
  status: string;
}

interface SavingsAccount {
  id: number;
  account_number: string;
  balance: number;
  savings_type_code: string;
  savings_type_name: string;
  member_name?: string;
  member_nik?: string;
}

export function SavingsAccountsList() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [types, setTypes] = useState<SavingsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw">("deposit");
  const [selectedType, setSelectedType] = useState<SavingsType | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountsByType, setAccountsByType] = useState<Record<number, SavingsAccount[]>>({});
  const [expandedTypes, setExpandedTypes] = useState<Record<number, boolean>>({});

  const fetchTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/savings");
      if (!response.ok) throw new Error("Failed to fetch savings types");
      const data = await response.json();
      setTypes(data);
    } catch (error: unknown) {
      message.error((error as Error).message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const fetchMembers = useCallback(
    async (search?: string) => {
      setMemberSearching(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (search) params.set("search", search);
        params.set("status", "active");
        const r = await fetch(`/api/members?${params}`);
        if (!r.ok) throw new Error("Gagal memuat anggota");
        const data = await r.json();
        setMembers(data.members || []);
      } catch {
        setMembers([]);
      } finally {
        setMemberSearching(false);
      }
    },
    []
  );

  const openModal = (type: SavingsType, mode: "deposit" | "withdraw") => {
    setSelectedType(type);
    setModalMode(mode);
    setSelectedMember(null);
    setAccounts([]);
    form.resetFields();
    setModalOpen(true);
    fetchMembers();
  };

  const handleMemberSelect = async (memberId: number) => {
    const mem = members.find((m) => m.id === memberId);
    setSelectedMember(mem || null);
    if (!memberId) {
      setAccounts([]);
      return;
    }
    try {
      const r = await fetch(`/api/savings?member_id=${memberId}`);
      if (!r.ok) throw new Error("Gagal memuat rekening");
      const data = await r.json();
      setAccounts(data);
    } catch {
      setAccounts([]);
    }
  };

  const handleCreateAccount = async () => {
    if (!selectedMember || !selectedType) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/savings/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedMember.id,
          savings_type_id: selectedType.id,
          initial_amount: 0,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal membuat rekening");
      message.success("Rekening berhasil dibuat");
      handleMemberSelect(selectedMember.id);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const account = accounts.find((a) => String(a.savings_type_code) === String(selectedType?.code));
    if (!account && modalMode === "withdraw") {
      message.error("Rekening tidak ditemukan untuk penarikan");
      return;
    }
    if (!account && modalMode === "deposit") {
      message.error("Pilih atau buat rekening terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = modalMode === "deposit" ? "/api/savings/deposit" : "/api/savings/withdraw";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: account?.id,
          amount: values.amount,
          reference_number: values.reference_number || undefined,
          notes: values.notes || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal memproses");
      message.success(modalMode === "deposit" ? "Setoran berhasil" : "Penarikan berhasil");
      setModalOpen(false);
      if (expandedTypes[selectedType!.id]) {
        fetchAccountsByType(selectedType!.id);
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAccountsByType = async (typeId: number) => {
    try {
      const r = await fetch(`/api/savings?type_id=${typeId}`);
      if (!r.ok) return;
      const data = await r.json();
      setAccountsByType((prev) => ({ ...prev, [typeId]: data }));
    } catch {
      setAccountsByType((prev) => ({ ...prev, [typeId]: [] }));
    }
  };

  const toggleExpandType = (typeId: number) => {
    const next = !expandedTypes[typeId];
    setExpandedTypes((prev) => ({ ...prev, [typeId]: next }));
    if (next && !accountsByType[typeId]) fetchAccountsByType(typeId);
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const typeAccount = selectedType
    ? accounts.find((a) => String(a.savings_type_code) === String(selectedType.code))
    : null;

  const accountColumns: ColumnsType<SavingsAccount> = [
    { title: "No. Rekening", dataIndex: "account_number", key: "account_number" },
    { title: "Nama Anggota", dataIndex: "member_name", key: "member_name", render: (v) => v || "-" },
    { title: "NIK", dataIndex: "member_nik", key: "member_nik", render: (v) => v || "-" },
    {
      title: "Saldo",
      dataIndex: "balance",
      key: "balance",
      align: "right",
      render: (v: number) => formatRupiah(v ?? 0),
    },
  ];

  return (
    <>
      <Row gutter={[16, 16]}>
        {types.map((type) => (
          <Col xs={24} sm={12} lg={8} key={type.id}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="text-lg">{type.name}</span>
                  <div className="flex gap-2">
                    {type.is_mandatory && <Badge status="success" text="Wajib" />}
                    {type.earns_interest && <Badge status="processing" text="Bunga" />}
                  </div>
                </div>
              }
              loading={loading}
              extra={
                <Button
                  type="link"
                  size="small"
                  icon={<UnorderedListOutlined />}
                  onClick={() => toggleExpandType(type.id)}
                >
                  {expandedTypes[type.id] ? "Sembunyikan" : "Lihat Rekening"}
                </Button>
              }
            >
              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  Kode: {type.code}
                  {type.minimum_amount != null && type.minimum_amount > 0 && (
                    <> • Min: Rp {Number(type.minimum_amount).toLocaleString("id-ID")}</>
                  )}
                </p>
              </div>
              {expandedTypes[type.id] && (
                <div className="mb-4">
                  {accountsByType[type.id] === undefined ? (
                    <Spin size="small" />
                  ) : (
                    <Table
                      size="small"
                      columns={accountColumns}
                      dataSource={accountsByType[type.id] || []}
                      rowKey="id"
                      pagination={false}
                      locale={{ emptyText: "Belum ada rekening" }}
                    />
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  icon={<ArrowDownOutlined />}
                  onClick={() => openModal(type, "deposit")}
                >
                  Setor
                </Button>
                {type.is_withdrawable && (
                  <Button
                    className="flex-1"
                    icon={<ArrowUpOutlined />}
                    onClick={() => openModal(type, "withdraw")}
                  >
                    Tarik
                  </Button>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={modalMode === "deposit" ? `Setor - ${selectedType?.name}` : `Tarik - ${selectedType?.name}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={modalMode === "deposit" ? "Setor" : "Tarik"}
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
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
              onSelect={handleMemberSelect}
              loading={memberSearching}
              notFoundContent={memberSearching ? "Memuat..." : "Ketik untuk mencari"}
              options={members.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.nik})`,
              }))}
            />
          </Form.Item>

          {selectedMember && (
            <>
              {typeAccount ? (
                <div className="mb-4 p-3 bg-muted/50 rounded text-sm">
                  <strong>Rekening:</strong> {typeAccount.account_number} • Saldo: {formatRupiah(typeAccount.balance)}
                </div>
              ) : (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded text-sm flex items-center justify-between gap-2">
                  <span>Rekening {selectedType?.name} belum ada untuk anggota ini.</span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleCreateAccount}
                    loading={submitting}
                  >
                    Buat Rekening
                  </Button>
                </div>
              )}
            </>
          )}

          {(typeAccount || (selectedMember && modalMode === "deposit")) && (
            <>
              <Form.Item
                name="amount"
                label="Jumlah (Rp)"
                rules={[
                  { required: true, message: "Masukkan jumlah" },
                  {
                    validator: (_, v) => {
                      if (v != null && v <= 0) return Promise.reject(new Error("Jumlah harus lebih dari 0"));
                      if (modalMode === "withdraw" && typeAccount && v > typeAccount.balance) {
                        return Promise.reject(new Error(`Saldo tidak mencukupi. Maks: ${formatRupiah(typeAccount.balance)}`));
                      }
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
                  parser={(v) => parseInt((v ?? "").replace(/\D/g, ""), 10) || 0}
                />
              </Form.Item>
              <Form.Item name="reference_number" label="No. Referensi">
                <Input placeholder="Opsional" />
              </Form.Item>
              <Form.Item name="notes" label="Keterangan">
                <Input.TextArea rows={2} placeholder="Opsional" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}
