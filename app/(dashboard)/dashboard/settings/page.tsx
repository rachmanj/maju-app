import { Card } from "antd";
import { SettingOutlined } from "@ant-design/icons";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">Konfigurasi sistem dan preferensi</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SettingOutlined className="text-6xl text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Modul dalam pengembangan</h3>
          <p className="text-muted-foreground">
            Fitur pengaturan akan segera tersedia
          </p>
        </div>
      </Card>
    </div>
  );
}
