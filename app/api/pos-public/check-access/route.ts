import { NextRequest, NextResponse } from 'next/server';
import { POSSelfServiceDeviceService } from '@/lib/services/pos-self-service-device-service';

const IPV4_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

function getClientIp(request: NextRequest): string {
  const reqIp = (request as { ip?: string }).ip;
  if (reqIp) return reqIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const host = request.headers.get('host') || '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')) {
    return '127.0.0.1';
  }
  const hostIpMatch = host.match(IPV4_REGEX);
  if (hostIpMatch) return hostIpMatch[1];
  return 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    let device = await POSSelfServiceDeviceService.getByIp(ip);
    if (!device && (ip === '::1' || ip === '127.0.0.1' || ip === 'unknown' || !ip)) {
      const fallbacks = ip === '::1' ? ['127.0.0.1'] : ip === '127.0.0.1' ? ['::1'] : ['127.0.0.1', '::1'];
      for (const fallback of fallbacks) {
        device = await POSSelfServiceDeviceService.getByIp(fallback);
        if (device) break;
      }
    }
    if (!device) {
      return NextResponse.json({
        allowed: false,
        message: 'IP tidak terdaftar untuk POS Self-Service',
        detectedIp: ip,
      });
    }
    return NextResponse.json({
      allowed: true,
      warehouseId: device.warehouse_id,
      warehouseCode: device.warehouse_code,
      warehouseName: device.warehouse_name,
      deviceName: device.name,
      detectedIp: ip,
    });
  } catch (error: unknown) {
    console.error('POS check-access:', error);
    return NextResponse.json(
      { allowed: false, error: 'Gagal memeriksa akses', detectedIp: 'unknown' },
      { status: 500 }
    );
  }
}
