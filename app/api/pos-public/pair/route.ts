import { NextRequest, NextResponse } from 'next/server';
import { POSSelfServiceDeviceService } from '@/lib/services/pos-self-service-device-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body?.code ?? '').trim();
    if (!code) {
      return NextResponse.json({ error: 'Kode pairing wajib diisi' }, { status: 400 });
    }

    const device = await POSSelfServiceDeviceService.claimPairingCode(code);
    if (!device || !device.device_token) {
      return NextResponse.json(
        { error: 'Kode pairing tidak valid atau sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      device_token: device.device_token,
      warehouseId: device.warehouse_id,
      warehouseCode: device.warehouse_code,
      warehouseName: device.warehouse_name,
      deviceName: device.name,
    });
  } catch (error: unknown) {
    console.error('POS pair:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memasangkan device' },
      { status: 500 }
    );
  }
}
