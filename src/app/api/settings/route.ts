import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiDataLogger as log } from '@/lib/logger';

export async function GET() {
  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'default' }
    });

    return NextResponse.json(settings || {
      id: 'default',
      platformCommission: 15,
      kdvRate: 10,
      bankCommissionRate: 2.5,
      stopajRate: 1,
      migrosCommission: 40,
      getirCommission: 40,
      yemeksepetiCommission: 40,
      trendyolCommission: 40,
    });
  } catch (error) {
    log.error('API /settings GET Error', error);
    return NextResponse.json(
      { error: 'Ayarlar getirilirken hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    const settings = await prisma.globalSettings.upsert({
      where: { id: 'default' },
      update: {
        platformCommission: data.platformCommission,
        kdvRate: data.kdvRate,
        bankCommissionRate: data.bankCommissionRate,
        stopajRate: data.stopajRate,
        migrosCommission: data.migrosCommission,
        getirCommission: data.getirCommission,
        yemeksepetiCommission: data.yemeksepetiCommission,
        trendyolCommission: data.trendyolCommission,
      },
      create: {
        id: 'default',
        platformCommission: data.platformCommission ?? 15,
        kdvRate: data.kdvRate ?? 10,
        bankCommissionRate: data.bankCommissionRate ?? 2.5,
        stopajRate: data.stopajRate ?? 1,
        migrosCommission: data.migrosCommission ?? 40,
        getirCommission: data.getirCommission ?? 40,
        yemeksepetiCommission: data.yemeksepetiCommission ?? 40,
        trendyolCommission: data.trendyolCommission ?? 40,
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    log.error('API /settings PUT Error', error);
    return NextResponse.json(
      { error: 'Ayarlar kaydedilirken hata oluştu.' },
      { status: 500 }
    );
  }
}
