import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { apiLedgerLogger as log, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const safeFloat = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop') || '1';

  logApiRequest('API:Ledger', 'GET', { shopId });

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Ledger', 'GET', 401, { shopId });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    });

    if (!shop) {
      log.info('Dükkan bulunamadı, boş veri döndürülüyor', { shopId });
      return NextResponse.json({});
    }

    const ledgerMonths = await prisma.ledgerMonth.findMany({
      where: { shopId },
      include: { extraCosts: true }
    });

    const ledgerDaysAll = await prisma.ledgerDay.findMany({
      where: { shopId },
      orderBy: { date: 'asc' }
    });

    const data: any = {
      shopName: shop.name || `İşyeri ${shopId}`,
      months: {}
    };

    // Initialize all months from LedgerMonth table
    for (const lm of ledgerMonths) {
      data.months[lm.monthKey] = {
        rent: lm.rent,
        electricity: lm.electricity,
        water: lm.water,
        accounting: lm.accounting,
        ads: lm.ads,
        commissions: {
          migros: lm.migrosComm,
          getir: lm.getirComm,
          yemeksepeti: lm.yemeksepetiComm,
          trendyol: lm.trendyolComm
        },
        platformAds: {
          migros: lm.migrosAd,
          getir: lm.getirAd,
          yemeksepeti: lm.yemeksepetiAd,
          trendyol: lm.trendyolAd
        },
        margins: {
          shop: lm.shopMargin,
          online: lm.onlineMargin
        },
        costs: lm.extraCosts.map(c => ({ name: c.name, amount: c.amount })),
        days: [] // will fill below
      };
    }

    // Now insert ledger days into the appropriate monthKey (e.g. "2026-04")
    for (const d of ledgerDaysAll) {
      // Create monthKey from date: format is YYYY-MM
      const yyyy = d.date.getFullYear();
      const mm = String(d.date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;

      if (!data.months[monthKey]) {
         data.months[monthKey] = { costs: [], days: [] };
      }

      const dayStr = d.date.toISOString().split('T')[0];

      data.months[monthKey].days.push({
        date: dayStr,
        cash: d.cash,
        pos: d.pos,
        mealCard: d.mealCard,
        kg: d.kg,
        platforms: {
          migros: { count: d.migrosCount, rev: d.migrosRev },
          getir: { count: d.getirCount, rev: d.getirRev },
          yemeksepeti: { count: d.yemeksepetiCount, rev: d.yemeksepetiRev },
          trendyol: { count: d.trendyolCount, rev: d.trendyolRev },
        }
      });
    }

    const monthCount = Object.keys(data.months).length;
    logApiResponse('API:Ledger', 'GET', 200, { 
      shopId, 
      shopName: shop.name,
      monthCount 
    });

    return NextResponse.json(data);
  } catch (error: any) {
    logApiError('API:Ledger', 'GET', error);
    return NextResponse.json({ message: 'Error reading ledger data.', error: error.message }, { status: 500 });
  }
}

async function processMonthUpdate(shopId: string, monthKey: string, monthData: any) {
  // Upsert LedgerMonth
  const lm = await prisma.ledgerMonth.upsert({
    where: { shopId_monthKey: { shopId, monthKey } },
    update: {
      rent: safeFloat(monthData.rent),
      electricity: safeFloat(monthData.electricity),
      water: safeFloat(monthData.water),
      accounting: safeFloat(monthData.accounting),
      ads: safeFloat(monthData.ads),
      migrosComm: safeFloat(monthData.commissions?.migros),
      getirComm: safeFloat(monthData.commissions?.getir),
      yemeksepetiComm: safeFloat(monthData.commissions?.yemeksepeti),
      trendyolComm: safeFloat(monthData.commissions?.trendyol),
      migrosAd: safeFloat(monthData.platformAds?.migros),
      getirAd: safeFloat(monthData.platformAds?.getir),
      yemeksepetiAd: safeFloat(monthData.platformAds?.yemeksepeti),
      trendyolAd: safeFloat(monthData.platformAds?.trendyol),
      shopMargin: safeFloat(monthData.margins?.shop),
      onlineMargin: safeFloat(monthData.margins?.online),
    },
    create: {
      shopId,
      monthKey,
      rent: safeFloat(monthData.rent),
      electricity: safeFloat(monthData.electricity),
      water: safeFloat(monthData.water),
      accounting: safeFloat(monthData.accounting),
      ads: safeFloat(monthData.ads),
      migrosComm: safeFloat(monthData.commissions?.migros),
      getirComm: safeFloat(monthData.commissions?.getir),
      yemeksepetiComm: safeFloat(monthData.commissions?.yemeksepeti),
      trendyolComm: safeFloat(monthData.commissions?.trendyol),
      migrosAd: safeFloat(monthData.platformAds?.migros),
      getirAd: safeFloat(monthData.platformAds?.getir),
      yemeksepetiAd: safeFloat(monthData.platformAds?.yemeksepeti),
      trendyolAd: safeFloat(monthData.platformAds?.trendyol),
      shopMargin: safeFloat(monthData.margins?.shop),
      onlineMargin: safeFloat(monthData.margins?.online),
    }
  });

  // Recreate extra costs
  await prisma.extraCost.deleteMany({ where: { ledgerMonthId: lm.id } });
  if (monthData.costs && Array.isArray(monthData.costs)) {
    for (const c of monthData.costs) {
      await prisma.extraCost.create({
        data: {
          ledgerMonthId: lm.id,
          name: c.name,
          amount: safeFloat(c.amount)
        }
      });
    }
  }

  // Upsert LedgerDays for this month
  if (monthData.days && Array.isArray(monthData.days)) {
    for (const day of monthData.days) {
      if (!day.date) continue;
      const dateObj = new Date(day.date + 'T00:00:00Z');
      
      const dayUpdate = {
        cash: safeFloat(day.cash),
        pos: safeFloat(day.pos),
        mealCard: safeFloat(day.mealCard),
        kg: safeFloat(day.kg),
        migrosCount: parseInt(day.platforms?.migros?.count) || 0,
        migrosRev: safeFloat(day.platforms?.migros?.rev),
        getirCount: parseInt(day.platforms?.getir?.count) || 0,
        getirRev: safeFloat(day.platforms?.getir?.rev),
        yemeksepetiCount: parseInt(day.platforms?.yemeksepeti?.count) || 0,
        yemeksepetiRev: safeFloat(day.platforms?.yemeksepeti?.rev),
        trendyolCount: parseInt(day.platforms?.trendyol?.count) || 0,
        trendyolRev: safeFloat(day.platforms?.trendyol?.rev),
      };

      await prisma.ledgerDay.upsert({
        where: { shopId_date: { shopId, date: dateObj } },
        update: dayUpdate,
        create: {
          shopId,
          date: dateObj,
          ...dayUpdate
        }
      });
    }
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop') || '1';

  logApiRequest('API:Ledger', 'POST', { shopId });

  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newData = await request.json();

    // Upsert shop just in case
    await prisma.shop.upsert({
      where: { id: shopId },
      update: { name: newData.shopName || `Dükkan ${shopId}` },
      create: { id: shopId, name: newData.shopName || `Dükkan ${shopId}` }
    });

    if (newData.months) {
      for (const [monthKey, monthData] of Object.entries(newData.months)) {
        await processMonthUpdate(shopId, monthKey, monthData);
      }
    }

    logApiResponse('API:Ledger', 'POST', 200, { shopId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('API:Ledger', 'POST', error);
    return NextResponse.json({ message: 'Error saving ledger data.', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop') || '1';

  logApiRequest('API:Ledger', 'PATCH', { shopId });

  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json(); // { monthKey, monthData }
    
    // Ensure shop exists
    const shopCount = await prisma.shop.count({ where: { id: shopId } });
    if (shopCount === 0) {
      await prisma.shop.create({ data: { id: shopId, name: `Dükkan ${shopId}` } });
    }

    if (payload.monthKey && payload.monthData) {
      await processMonthUpdate(shopId, payload.monthKey, payload.monthData);
    } else {
      log.warn('Geçersiz PATCH payload', payload);
    }

    logApiResponse('API:Ledger', 'PATCH', 200, { shopId, updatedMonth: payload.monthKey });
    return NextResponse.json({ success: true, updatedMonth: payload.monthKey });
  } catch (error: any) {
    logApiError('API:Ledger', 'PATCH', error);
    return NextResponse.json({ message: 'Error patching ledger data.', error: error.message }, { status: 500 });
  }
}
