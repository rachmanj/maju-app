import { NextRequest, NextResponse } from 'next/server';
import { POSSelfServiceDeviceService } from '@/lib/services/pos-self-service-device-service';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-device-token')?.trim() ?? '';
    if (!token) {
      return NextResponse.json({
        allowed: false,
        unpaired: true,
        message: 'Device belum dipasangkan. Masukkan kode pairing.',
      });
    }

    const device = await POSSelfServiceDeviceService.getByToken(token);
    if (!device) {
      return NextResponse.json({
        allowed: false,
        unpaired: true,
        message: 'Token device tidak valid atau device nonaktif',
      });
    }

    return NextResponse.json({
      allowed: true,
      warehouseId: device.warehouse_id,
      warehouseCode: device.warehouse_code,
      warehouseName: device.warehouse_name,
      deviceName: device.name,
    });
  } catch (error: unknown) {
    console.error('POS check-access:', error);
    return NextResponse.json(
      { allowed: false, error: 'Gagal memeriksa akses' },
      { status: 500 }
    );
  }
}
