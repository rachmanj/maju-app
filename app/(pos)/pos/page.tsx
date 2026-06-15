"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  Card,
  Button,
  Table,
  Select,
  Modal,
  Input,
  Form,
  message,
  Space,
  Typography,
} from "antd";
import {
  ShoppingCartOutlined,
  PlusOutlined,
  MinusOutlined,
  DollarOutlined,
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { ProductSelectionModal, type ProductItem } from "@/components/pos/product-selection-modal";

type CartItem = {
  product_id: number;
  product_name: string;
  unit_id: number;
  unit_code: string;
  quantity: number;
  unit_price: number;
  total: number;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const POS_DEVICE_TOKEN_KEY = "pos_device_token";

type AccessState =
  | { status: "loading" }
  | { status: "unpaired" }
  | { status: "denied"; message?: string }
  | { status: "allowed"; warehouseId: number; warehouseName: string };

export default function POSSelfServicePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "potong_gaji" | "simpanan">("potong_gaji");
  const [pin, setPin] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [pairingForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);

  const memberId = (session?.user as { memberId?: number | null })?.memberId ?? null;
  const memberName = session?.user?.name ?? "Anggota";
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const isAnggota = roles.includes("anggota");

  const checkAccess = useCallback(async (token?: string | null) => {
    const activeToken = token ?? deviceToken ?? localStorage.getItem(POS_DEVICE_TOKEN_KEY);
    if (!activeToken) {
      setAccess({ status: "unpaired" });
      return;
    }

    try {
      const res = await fetch("/api/pos-public/check-access", {
        headers: { "X-Device-Token": activeToken },
      });
      const data = await res.json();
      if (data.allowed && data.warehouseId) {
        setAccess({
          status: "allowed",
          warehouseId: data.warehouseId,
          warehouseName: data.warehouseName || data.warehouseCode || "Gudang",
        });
        setWarehouseId(data.warehouseId);
      } else if (data.unpaired) {
        localStorage.removeItem(POS_DEVICE_TOKEN_KEY);
        setDeviceToken(null);
        setAccess({ status: "unpaired" });
      } else {
        setAccess({
          status: "denied",
          message: data.message || "Akses POS Self-Service ditolak",
        });
      }
    } catch {
      setAccess({ status: "denied", message: "Gagal memeriksa akses" });
    }
  }, [deviceToken]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/pos-public/session");
      if (res.ok) {
        const data = await res.json();
        setSessionId(data?.sessionId ?? null);
      }
    } catch {
      message.error("Gagal memuat session");
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(POS_DEVICE_TOKEN_KEY);
    setDeviceToken(storedToken);
    checkAccess(storedToken);
  }, [checkAccess]);

  const handlePair = async (values: { code: string }) => {
    setPairingLoading(true);
    try {
      const res = await fetch("/api/pos-public/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: values.code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memasangkan device");

      localStorage.setItem(POS_DEVICE_TOKEN_KEY, data.device_token);
      setDeviceToken(data.device_token);
      message.success("Device berhasil dipasangkan");
      await checkAccess(data.device_token);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Gagal memasangkan device");
    } finally {
      setPairingLoading(false);
    }
  };

  useEffect(() => {
    if (access.status === "allowed" && memberId) fetchSession();
  }, [access.status, memberId, fetchSession]);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoginLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email.trim(),
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        message.error("Email/username atau password salah");
      } else {
        message.success("Login berhasil");
        window.location.reload();
      }
    } catch {
      message.error("Terjadi kesalahan saat login");
    } finally {
      setLoginLoading(false);
    }
  };

  const addToCart = (product: ProductItem, quantity: number, unitId: number, unitCode: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id && c.unit_id === unitId);
      if (existing) {
        return prev.map((c) =>
          c.product_id === product.id && c.unit_id === unitId
            ? {
                ...c,
                quantity: c.quantity + quantity,
                total: (c.quantity + quantity) * c.unit_price,
              }
            : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_id: unitId,
          unit_code: unitCode,
          quantity,
          unit_price: product.unit_price,
          total: quantity * product.unit_price,
        },
      ];
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
    if (!sessionId || !memberId || cart.length === 0 || !warehouseId) {
      message.warning("Keranjang tidak boleh kosong");
      return;
    }
    if (paymentMethod === "potong_gaji" && !pin) {
      message.warning("PIN diperlukan untuk Potong Gaji");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/pos-public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          memberId,
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
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Checkout gagal");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout?callbackUrl=/pos";
  };

  const cartColumns: ColumnsType<CartItem> = [
    { title: "Produk", dataIndex: "product_name", key: "product_name", ellipsis: true },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 140,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() => updateCartQty(r.product_id, r.unit_id, -1)}
          />
          <span>
            {r.quantity} {r.unit_code}
          </span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => updateCartQty(r.product_id, r.unit_id, 1)}
          />
        </Space>
      ),
    },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v) => formatCurrency(Number(v)),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (v) => formatCurrency(Number(v)),
    },
  ];

  if (access.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Memuat...</div>
      </div>
    );
  }

  if (access.status === "unpaired") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md" title={<h1 className="mb-0 text-2xl font-bold">Pasangkan Device</h1>}>
          <p className="mb-6 text-muted-foreground">
            Masukkan kode pairing 6 digit dari Pengaturan → POS Self-Service.
          </p>
          <Form form={pairingForm} layout="vertical" onFinish={handlePair} size="large">
            <Form.Item
              name="code"
              label="Kode Pairing"
              rules={[
                { required: true, message: "Kode pairing wajib diisi" },
                { pattern: /^\d{6}$/, message: "Kode harus 6 digit angka" },
              ]}
            >
              <Input
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                className="text-center font-mono text-2xl tracking-widest"
                disabled={pairingLoading}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={pairingLoading}>
                Pasangkan
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (access.status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md" title="Akses Ditolak">
          <p className="text-muted-foreground">{access.message}</p>
          <Button
            className="mt-4"
            type="primary"
            block
            onClick={() => {
              localStorage.removeItem(POS_DEVICE_TOKEN_KEY);
              setDeviceToken(null);
              setAccess({ status: "unpaired" });
            }}
          >
            Pasangkan Ulang
          </Button>
        </Card>
      </div>
    );
  }

  if (access.status === "allowed" && sessionStatus === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md" title={<h1 className="mb-0 text-2xl font-bold">POS Self-Service</h1>}>
          <p className="mb-6 text-muted-foreground">Masuk dengan akun anggota</p>
          <Form form={loginForm} layout="vertical" onFinish={handleLogin} size="large">
            <Form.Item
              name="email"
              label="Email, Username, atau Nomor Anggota"
              rules={[{ required: true, message: "Harus diisi" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="email, username, atau nomor anggota" disabled={loginLoading} />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: "Harus diisi" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" disabled={loginLoading} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loginLoading}>
                Masuk
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (access.status === "allowed" && sessionStatus === "authenticated" && (!isAnggota || !memberId)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md" title={<h1 className="mb-0 text-2xl font-bold">POS Self-Service</h1>}>
          <p className="mb-4 text-amber-600">
            Hanya anggota yang dapat menggunakan POS Self-Service. Akun Anda bukan akun anggota.
          </p>
          <p className="mb-4 text-muted-foreground text-sm">
            Silakan logout dan login dengan akun anggota.
          </p>
          <Button type="primary" block onClick={handleSignOut}>
            Keluar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">POS Self-Service</h1>
            <p className="text-muted-foreground text-sm">
              {memberName} • {access.status === "allowed" ? access.warehouseName : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Typography.Text className="text-muted-foreground text-sm">
              Gudang: {access.status === "allowed" ? access.warehouseName : ""}
            </Typography.Text>
            <Button type="text" size="small" onClick={handleSignOut}>
              Keluar
            </Button>
          </div>
        </div>

        <Card
          title={
            <span>
              <ShoppingCartOutlined className="mr-2" />
              Keranjang
            </span>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setProductModalOpen(true)}
              disabled={!warehouseId}
            >
              Tambah Item
            </Button>
          }
        >
          <Table
            columns={cartColumns}
            dataSource={cart}
            rowKey={(r) => `${r.product_id}-${r.unit_id}`}
            pagination={false}
            size="small"
          />
          <div className="mt-4 flex items-center justify-between">
            <Typography.Text strong>Subtotal: {formatCurrency(subtotal)}</Typography.Text>
            <Button
              type="primary"
              size="large"
              icon={<DollarOutlined />}
              disabled={!sessionId || cart.length === 0 || !warehouseId}
              onClick={() => setCheckoutModal(true)}
            >
              Bayar
            </Button>
          </div>
        </Card>
      </div>

      <ProductSelectionModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        warehouseId={warehouseId}
        onAddItem={addToCart}
      />

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
            Total: <strong>{formatCurrency(subtotal)}</strong>
          </p>
          <div>
            <label className="mb-2 block">Metode Pembayaran</label>
            <Select
              className="w-full"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: "cash", label: "Tunai", disabled: true },
                { value: "potong_gaji", label: "Potong Gaji" },
                { value: "simpanan", label: "Simpanan Sukarela", disabled: true },
              ]}
            />
          </div>
          {paymentMethod === "potong_gaji" && (
            <div>
              <label className="mb-2 block">PIN Anggota</label>
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
