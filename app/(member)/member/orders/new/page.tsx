"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Select, Input, Button, Table, Spin, App } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface WarehouseOption {
  id: number;
  code: string;
  name: string;
}

interface ProductOption {
  product_id: number;
  product_code: string;
  product_name: string;
  unit_id: number;
  unit_code: string;
  unit_price: number;
  stock: number;
}

interface CartItem {
  product_id: number;
  product_code: string;
  product_name: string;
  unit_id: number;
  unit_code: string;
  unit_price: number;
  quantity: number;
}

export default function MemberNewOrderPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/member-portal/warehouses")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setWarehouses(d ?? []);
      })
      .catch(() => setWarehouses([]));
  }, []);

  const loadProducts = useCallback(() => {
    if (!warehouseId) {
      setProducts([]);
      return;
    }
    setProductsLoading(true);
    const params = new URLSearchParams({ warehouse_id: String(warehouseId) });
    if (search) params.set("search", search);
    fetch(`/api/member-portal/order-products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProducts(d ?? []);
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [warehouseId, search]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  const addToCart = (p: ProductOption, qty: number) => {
    if (qty <= 0) return;
    const existing = cart.find(
      (c) => c.product_id === p.product_id && c.unit_id === p.unit_id
    );
    const newQty = (existing?.quantity ?? 0) + qty;
    if (newQty > p.stock) {
      message.warning(`Stok tersedia: ${p.stock}`);
      return;
    }
    const item: CartItem = {
      product_id: p.product_id,
      product_code: p.product_code,
      product_name: p.product_name,
      unit_id: p.unit_id,
      unit_code: p.unit_code,
      unit_price: p.unit_price,
      quantity: existing ? newQty : qty,
    };
    setCart((prev) =>
      existing
        ? prev.map((c) =>
            c.product_id === p.product_id && c.unit_id === p.unit_id ? item : c
          )
        : [...prev, item]
    );
  };

  const removeFromCart = (productId: number, unitId: number) => {
    setCart((prev) =>
      prev.filter((c) => !(c.product_id === productId && c.unit_id === unitId))
    );
  };

  const updateCartQty = (productId: number, unitId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId, unitId);
      return;
    }
    const p = products.find(
      (x) => x.product_id === productId && x.unit_id === unitId
    );
    const max = p?.stock ?? 0;
    if (qty > max) {
      message.warning(`Stok tersedia: ${max}`);
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId && c.unit_id === unitId
          ? { ...c, quantity: qty }
          : c
      )
    );
  };

  const submitOrder = async () => {
    if (!warehouseId) {
      message.error("Pilih gudang terlebih dahulu");
      return;
    }
    if (cart.length === 0) {
      message.error("Keranjang kosong");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/member-portal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          items: cart.map((c) => ({
            product_id: c.product_id,
            quantity: c.quantity,
            unit_id: c.unit_id,
            unit_price: c.unit_price,
          })),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      message.success("Pesanan berhasil dibuat");
      router.push(`/member/orders/${data.id}`);
    } catch (e: unknown) {
      message.error(
        e instanceof Error ? e.message : "Gagal membuat pesanan"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const totalAmount = cart.reduce(
    (sum, c) => sum + c.quantity * c.unit_price,
    0
  );

  const cartColumns = [
    {
      title: "Produk",
      key: "product",
      render: (_: unknown, r: CartItem) => `${r.product_name} (${r.unit_code})`,
    },
    {
      title: "Harga",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v: number) => formatRupiah(v),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (v: number, r: CartItem) => (
        <Input
          type="number"
          min={1}
          value={v}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) updateCartQty(r.product_id, r.unit_id, n);
          }}
        />
      ),
    },
    {
      title: "Subtotal",
      key: "subtotal",
      render: (_: unknown, r: CartItem) =>
        formatRupiah(r.quantity * r.unit_price),
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_: unknown, r: CartItem) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeFromCart(r.product_id, r.unit_id)}
          aria-label="Hapus"
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          Buat Pesanan Baru
        </h1>
        <Link href="/member/orders" className="text-teal-600 hover:underline">
          Kembali ke daftar pesanan
        </Link>
      </div>

      <Card title="Pilih Gudang & Produk" className="shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm text-[hsl(var(--muted-foreground))]">
              Gudang
            </label>
            <Select
              className="w-full"
              placeholder="Pilih gudang"
              allowClear
              value={warehouseId ?? undefined}
              onChange={(v) => setWarehouseId(v ?? null)}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.code} - ${w.name}`,
              }))}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm text-[hsl(var(--muted-foreground))]">
              Cari produk
            </label>
            <Input
              placeholder="Kode atau nama produk"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!warehouseId}
            />
          </div>
        </div>

        {warehouseId && (
          <div className="mt-4">
            {productsLoading ? (
              <Spin />
            ) : products.length === 0 ? (
              <p className="text-[hsl(var(--muted-foreground))]">
                Tidak ada produk tersedia.
              </p>
            ) : (
              <Table
                rowKey={(r) => `${r.product_id}-${r.unit_id}`}
                dataSource={products}
                size="small"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: "Produk",
                    key: "product",
                    render: (_: unknown, r: ProductOption) =>
                      `${r.product_name} (${r.unit_code})`,
                  },
                  {
                    title: "Harga",
                    dataIndex: "unit_price",
                    key: "unit_price",
                    render: (v: number) => formatRupiah(v),
                  },
                  {
                    title: "Stok",
                    dataIndex: "stock",
                    key: "stock",
                  },
                  {
                    title: "",
                    key: "add",
                    width: 100,
                    render: (_: unknown, r: ProductOption) => (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => addToCart(r, 1)}
                      >
                        Tambah
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Card>

      {cart.length > 0 && (
        <Card
          title={`Keranjang (${cart.length} item)`}
          className="shadow-sm"
          extra={
            <span className="font-medium text-[hsl(var(--foreground))]">
              Total: {formatRupiah(totalAmount)}
            </span>
          }
        >
          <Table
            rowKey={(r) => `${r.product_id}-${r.unit_id}`}
            dataSource={cart}
            columns={cartColumns}
            pagination={false}
          />
          <div className="mt-4">
            <label className="mb-1 block text-sm text-[hsl(var(--muted-foreground))]">
              Catatan (opsional)
            </label>
            <Input.TextArea
              rows={2}
              placeholder="Catatan untuk pesanan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Link href="/member/orders">
              <Button>Batal</Button>
            </Link>
            <Button
              type="primary"
              loading={submitting}
              onClick={submitOrder}
            >
              Buat Pesanan
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
