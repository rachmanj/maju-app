"use client";

import { useEffect, useState } from "react";
import { Card, Tag, App } from "antd";
import { UserOutlined } from "@ant-design/icons";

interface OnlineUser {
  user_id: number;
  name: string;
  email: string;
  roles: string[];
  last_activity_at: string;
  context: string | null;
}

export function OnlineUsersCard() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/monitoring/online-users");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      message.error("Gagal memuat data pengguna online");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card
      title={
        <span>
          <UserOutlined className="mr-2" />
          Siapa yang Online ({users.length})
        </span>
      }
      loading={loading}
    >
      {users.length === 0 && !loading ? (
        <p className="text-muted-foreground text-sm">Tidak ada pengguna online</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.user_id}
              className="flex w-full items-center justify-between rounded border-b border-gray-200/50 pb-2 last:border-0 last:pb-0"
            >
              <div>
                <span className="font-medium">{u.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {u.roles.map((r) => (
                  <Tag key={r}>{r}</Tag>
                ))}
                {u.context && (
                  <Tag color="blue">{u.context === "member_portal" ? "Portal" : "Dashboard"}</Tag>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
