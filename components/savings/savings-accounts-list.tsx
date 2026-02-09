"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button, Row, Col, App } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

interface SavingsType {
  id: number;
  code: string;
  name: string;
  is_mandatory: boolean;
  is_withdrawable: boolean;
  minimum_amount?: number;
  earns_interest: boolean;
}

export function SavingsAccountsList() {
  const { message } = App.useApp();
  const [types, setTypes] = useState<SavingsType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const response = await fetch("/api/savings");
      if (!response.ok) throw new Error("Failed to fetch savings types");
      const data = await response.json();
      setTypes(data);
    } catch (error: any) {
      message.error(error.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          >
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">
                Kode: {type.code}
                {type.minimum_amount && ` • Min: Rp ${type.minimum_amount.toLocaleString("id-ID")}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" icon={<ArrowDownOutlined />}>
                Setor
              </Button>
              {type.is_withdrawable && (
                <Button className="flex-1" icon={<ArrowUpOutlined />}>
                  Tarik
                </Button>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
