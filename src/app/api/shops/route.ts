import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { apiShopsLogger as log, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function GET() {
  logApiRequest('API:Shops', 'GET');

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Shops', 'GET', 401);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    let shops = await prisma.shop.findMany({
      select: { id: true, name: true }
    });

    log.debug('Dükkanlar taranıyor...', { shopCount: shops.length });

    // Default shop if none exists
    if (shops.length === 0) {
      log.info('Hiç dükkan bulunamadı, varsayılan dükkan oluşturuluyor');
      
      const defaultShop = await prisma.shop.create({
        data: { id: '1', name: 'Dükkan 1' }
      });
      shops.push({ id: defaultShop.id, name: defaultShop.name });
      
      log.success('Varsayılan dükkan oluşturuldu', defaultShop);
    }

    // sort them numerically if possible
    shops.sort((a, b) => {
       const numA = parseInt(a.id);
       const numB = parseInt(b.id);
       if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
       return a.id.localeCompare(b.id);
    });

    logApiResponse('API:Shops', 'GET', 200, { 
      shopCount: shops.length,
      shops: shops.map(s => `${s.id}:${s.name}`).join(', '),
    });
    return NextResponse.json(shops);
  } catch (error: any) {
    logApiError('API:Shops', 'GET', error);
    return NextResponse.json({ message: 'Error reading shops.', error: error.message }, { status: 500 });
  }
}
