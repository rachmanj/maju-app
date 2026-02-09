"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Table,
  Select,
  message,
  Modal,
  InputNumber,
  Tag,
  Space,
  Typography,
} from "antd";
import Link from "next/link";
import {
  ShoppingCartOutlined,
  UserOutlined,
  BarcodeOutlined,
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  DollarOutlined,
  BankOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

type CartItem = {
  product_id: number;
  product_name: string;
  unit_id: number;
  unit_code: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export default function POSPage() {
  const [devices, setDevices] = useState<{ id: number; code: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [memberInput, setMemberInput] = useState("");
  const [member, setMember] = useState<{ id: number; name: string; limit: number; has_pin: boolean } | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<
    { id: number; code: string; name: string; quantity: number; unit_price: number; unit_id: number; unit_code: string }[]
  >([]);
  const [productSearching, setProductSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "potong_gaji" | "simpanan">("cash");
  const [pin, setPin] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState(0);
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [sessionOpening, setSessionOpening] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        if (data.length > 0 && !deviceId) setDeviceId(data[0].id);
      }
    } catch {
      message.error("Gagal memuat device");
    }
  }, [deviceId]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/warehouses?all=true");
      if (res.ok) {
        const data = await res.json();
        setWarehouses(Array.isArray(data) ? data : data.warehouses || []);
        const list = Array.isArray(data) ? data : data.warehouses || [];
        if (list.length > 0 && !warehouseId) setWarehouseId(list[0].id);
      }
    } catch {
      message.error("Gagal memuat gudang");
    }
  }, [warehouseId]);

  const checkSession = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/pos/session?deviceId=${deviceId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionId(data?.id ?? null);
      }
    } catch {
      setSessionId(null);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchDevices();
    fetchWarehouses();
  }, [fetchDevices, fetchWarehouses]);

  useEffect(() => {
    checkSession();
  }, [checkSession, deviceId]);

  const handleOpenSession = async () => {
    if (!deviceId) {
      message.warning("Pilih device terlebih dahulu");
      return;
    }
    setSessionOpening(true);
    try {
      const res = await fetch("/api/pos/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          deviceId,
          openingCash: openingCash || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal buka session");
      setSessionId(data.sessionId);
      setOpenSessionModal(false);
      message.success("Session dibuka");
    } catch (e: any) {
      message.error(e.message || "Gagal buka session");
    } finally {
      setSessionOpening(false);
    }
  };

  const handleMemberLookup = async () => {
    if (!memberInput.trim()) return;
    setMemberLoading(true);
    setMember(null);
    try {
      const res = await fetch("/api/pos/member/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodeOrEmail: memberInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setMember(data);
        message.success(`Anggota: ${data.name}`);
      } else {
        message.warning("Anggota tidak ditemukan");
      }
    } catch {
      message.error("Gagal cari anggota");
    } finally {
      setMemberLoading(false);
    }
  };

  const handleProductSearch = async () => {
    if (!warehouseId || !productSearch.trim()) return;
    setProductSearching(true);
    try {
      const res = await fetch(
        `/api/pos/products/search?warehouseId=${warehouseId}&q=${encodeURIComponent(productSearch)}`
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      message.error("Gagal cari produk");
    } finally {
      setProductSearching(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!warehouseId || !barcode.trim()) return;
    setBarcodeInput("");
    try {
      const res = await fetch(
        `/api/pos/products/barcode?barcode=${encodeURIComponent(barcode)}&warehouseId=${warehouseId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data) {
          addToCart({
            product_id: data.id,
            product_name: data.name,
            unit_id: data.unit_id,
            unit_code: data.unit_code,
            quantity: 1,
            unit_price: data.unit_price,
            total: data.unit_price,
          });
        } else {
          message.warning("Produk tidak ditemukan");
        }
      }
    } catch {
      message.error("Gagal scan barcode");
    }
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (c) => c.product_id === item.product_id && c.unit_id === item.unit_id
      );
      if (existing) {
        return prev.map((c) =>
          c.product_id === item.product_id && c.unit_id === item.unit_id
            ? {
                ...c,
                quantity: c.quantity + item.quantity,
                total: (c.quantity + item.quantity) * c.unit_price,
              }
            : c
        );
      }
      return [...prev, item];
    });
  };

  const updateCartQty = (productId: number, unitId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product_id === productId && c.unit_id === unitId
            ? {
                ...c,
                quantity: Math.max(0, c.quantity + delta),
                total: Math.max(0, c.quantity + delta) * c.unit_price,
              }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((s, c) => s + c.total, 0);

  const handleCheckout = async () => {
    if (!sessionId || !member || cart.length === 0 || !warehouseId) {
      message.warning("Pastikan session aktif, anggota terpilih, dan keranjang tidak kosong");
      return;
    }
    if (paymentMethod === "potong_gaji" && (!member.has_pin || !pin)) {
      message.warning("PIN diperlukan untuk Potong Gaji");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          memberId: member.id,
          warehouseId,
          items: cart.map((c) => ({
            product_id: c.product_id,
            quantity: c.quantity,
            unit_id: c.unit_id,
            unit_price: c.unit_price,
          })),
          paymentMethod,
          pin: paymentMethod === "potong_gaji" ? pin : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout gagal");
      message.success(`Transaksi ${data.transaction_number} berhasil`);
      setCart([]);
      setCheckoutModal(false);
      setPin("");
    } catch (e: any) {
      message.error(e.message || "Checkout gagal");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const cartColumns: ColumnsType<CartItem> = [
    { title: "Produk", dataIndex: "product_name", key: "product_name", ellipsis: true },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<MinusOutlined />} onClick={() => updateCartQty(r.product_id, r.unit_id, -1)} />
          <span>{r.quantity} {r.unit_code}</span>
          <Button size="small" icon={<PlusOutlined />} onClick={() => updateCartQty(r.product_id, r.unit_id, 1)} />
        </Space>
      ),
    },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v) => `Rp ${Number(v).toLocaleString("id-ID")}`,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (v) => `Rp ${Number(v).toLocaleString("id-ID")}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">POS</h1>
        <p className="text-muted-foreground">Point of Sale untuk transaksi anggota</p>
      </div>

      {devices.length === 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <p>
            Belum ada device POS terdaftar.{" "}
            <Link href="/dashboard/pos/devices" className="text-teal-600 underline hover:no-underline">
              Daftar device terlebih dahulu
            </Link>
          </p>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Session & Anggota" className="border-[hsl(var(--border))]">
            <Space wrap className="w-full">
              <Select
                placeholder="Device"
                value={deviceId}
                onChange={setDeviceId}
                options={devices.map((d) => ({ label: `${d.code} - ${d.name}`, value: d.id }))}
                style={{ minWidth: 180 }}
              />
              <Select
                placeholder="Gudang"
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
                style={{ minWidth: 180 }}
              />
              {sessionId ? (
                <Tag color="green">Session Aktif</Tag>
              ) : (
                <Button type="primary" onClick={() => setOpenSessionModal(true)}>
                  Buka Session
                </Button>
              )}
            </Space>

            <div className="mt-4 flex flex-wrap gap-2">
              <Input
                placeholder="Barcode / Email anggota"
                prefix={<BarcodeOutlined />}
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onPressEnter={handleMemberLookup}
                style={{ maxWidth: 280 }}
              />
              <Button type="primary" loading={memberLoading} onClick={handleMemberLookup} icon={<UserOutlined />}>
                Cari Anggota
              </Button>
              {member && (
                <Tag color="blue">{member.name} (Limit: Rp {member.limit.toLocaleString("id-ID")})</Tag>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Input
                placeholder="Scan barcode produk"
                prefix={<BarcodeOutlined />}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onPressEnter={(e) => handleBarcodeScan((e.target as HTMLInputElement).value)}
                style={{ maxWidth: 280 }}
              />
              <Input
                placeholder="Cari produk..."
                prefix={<SearchOutlined />}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onPressEnter={handleProductSearch}
                style={{ maxWidth: 240 }}
              />
              <Button loading={productSearching} onClick={handleProductSearch}>
                Cari
              </Button>
            </div>

            {products.length > 0 && (
              <div className="mt-4 max-h-48 overflow-auto rounded border p-2">
                {products.map((p) => (
                  <div
                    key={`${p.id}-${p.unit_id}`}
                    className="flex cursor-pointer items-center justify-between rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() =>
                      addToCart({
                        product_id: p.id,
                        product_name: p.name,
                        unit_id: p.unit_id,
                        unit_code: p.unit_code,
                        quantity: 1,
                        unit_price: p.unit_price,
                        total: p.unit_price,
                      })
                    }
                  >
                    <span className="truncate">{p.name}</span>
                    <span>Rp {p.unit_price.toLocaleString("id-ID")} ({p.unit_code}) - Stok: {p.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                <ShoppingCartOutlined className="mr-2" />
                Keranjang
              </span>
            }
            className="border-[hsl(var(--border))]"
          >
            <Table
              columns={cartColumns}
              dataSource={cart}
              rowKey={(r) => `${r.product_id}-${r.unit_id}`}
              pagination={false}
              size="small"
            />
            <div className="mt-4 flex items-center justify-between">
              <Typography.Text strong>Subtotal: Rp {subtotal.toLocaleString("id-ID")}</Typography.Text>
              <Button
                type="primary"
                size="large"
                icon={<DollarOutlined />}
                disabled={!sessionId || !member || cart.length === 0}
                onClick={() => setCheckoutModal(true)}
              >
                Bayar
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Buka Session"
        open={openSessionModal}
        onOk={handleOpenSession}
        onCancel={() => setOpenSessionModal(false)}
        confirmLoading={sessionOpening}
      >
        <div className="py-2">
          <label>Kas Awal (Rp)</label>
          <InputNumber
            className="w-full"
            min={0}
            value={openingCash}
            onChange={(v) => setOpeningCash(v ?? 0)}
            formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          />
        </div>
      </Modal>

      <Modal
        title="Checkout"
        open={checkoutModal}
        onOk={handleCheckout}
        onCancel={() => setCheckoutModal(false)}
        confirmLoading={checkoutLoading}
        okText="Proses Pembayaran"
      >
        <div className="space-y-4">
          <p>
            Total: <strong>Rp {subtotal.toLocaleString("id-ID")}</strong>
          </p>
          <div>
            <label className="block mb-2">Metode Pembayaran</label>
            <Select
              className="w-full"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: "cash", label: "Cash" },
                { value: "potong_gaji", label: "Potong Gaji" },
                { value: "simpanan", label: "Simpanan Sukarela" },
              ]}
            />
          </div>
          {paymentMethod === "potong_gaji" && (
            <div>
              <label className="block mb-2">PIN Anggota</label>
              <Input.Password
                placeholder="Masukkan PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
