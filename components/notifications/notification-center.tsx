"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Dropdown } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface NotificationItem {
  id: number;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const [count, setCount] = useState(0);
  const [list, setList] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const fetchCount = () => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {});
  };

  const fetchList = () => {
    fetch("/api/notifications?limit=10")
      .then((r) => r.json())
      .then((d) => setList(d.notifications ?? []))
      .catch(() => setList([]));
  };

  useEffect(() => {
    fetchCount();
  }, []);

  useEffect(() => {
    if (open) fetchList();
  }, [open]);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    fetchCount();
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setCount(0);
    setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const dropdownContent = (
    <div className="w-80 max-h-[360px] overflow-hidden flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))]">
        <span className="font-medium">Notifikasi</span>
        {count > 0 && (
          <Button type="link" size="small" onClick={markAllRead}>
            Tandai semua dibaca
          </Button>
        )}
      </div>
      <div className="overflow-y-auto max-h-72">
        {list.length === 0 ? (
          <div className="p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Tidak ada notifikasi
          </div>
        ) : (
          list.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-[hsl(var(--border))]/50 cursor-pointer hover:bg-[hsl(var(--muted))]/50 ${!n.is_read ? "bg-teal-500/5" : ""}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className="font-medium text-sm">{n.title}</div>
              {n.message && <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">{n.message}</div>}
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: id })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Button
        type="text"
        className="relative flex h-9 w-9 items-center justify-center rounded-full p-0"
      >
        <Badge count={count} size="small" offset={[-2, 2]}>
          <BellOutlined className="text-lg" />
        </Badge>
      </Button>
    </Dropdown>
  );
}
