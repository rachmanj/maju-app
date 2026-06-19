"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const POS_DEVICE_TOKEN_KEY = "pos_device_token";

export type PosAccessState =
  | { status: "loading" }
  | { status: "unpaired" }
  | { status: "denied"; message?: string }
  | { status: "allowed"; warehouseId: number; warehouseName: string };

type PosSelfServiceContextValue = {
  access: PosAccessState;
  setAccess: React.Dispatch<React.SetStateAction<PosAccessState>>;
  deviceToken: string | null;
  setDeviceToken: React.Dispatch<React.SetStateAction<string | null>>;
  warehouseId: number | null;
  setWarehouseId: React.Dispatch<React.SetStateAction<number | null>>;
  checkAccess: (token?: string | null) => Promise<void>;
  handleSignOut: () => void;
};

const PosSelfServiceContext = createContext<PosSelfServiceContextValue | null>(null);

export function PosSelfServiceProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<PosAccessState>({ status: "loading" });
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

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

  useEffect(() => {
    const storedToken = localStorage.getItem(POS_DEVICE_TOKEN_KEY);
    setDeviceToken(storedToken);
    checkAccess(storedToken);
  }, [checkAccess]);

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout?callbackUrl=/pos";
  };

  return (
    <PosSelfServiceContext.Provider
      value={{
        access,
        setAccess,
        deviceToken,
        setDeviceToken,
        warehouseId,
        setWarehouseId,
        checkAccess,
        handleSignOut,
      }}
    >
      {children}
    </PosSelfServiceContext.Provider>
  );
}

export function usePosSelfService() {
  const context = useContext(PosSelfServiceContext);
  if (!context) {
    throw new Error("usePosSelfService must be used within PosSelfServiceProvider");
  }
  return context;
}
