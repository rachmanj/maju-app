import { NextResponse } from 'next/server';
import { ProductService } from '@/lib/services/product-service';
import { requireAnggotaSession } from '@/lib/auth/require-anggota';

export async function GET() {
  const authResult = await requireAnggotaSession();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const categories = await ProductService.getCategories();
    return NextResponse.json(categories);
  } catch (error: unknown) {
    console.error('POS public categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
