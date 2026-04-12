import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyAuthCookie } from '@/lib/auth';
import { apiLedgerLogger as log, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';

const LEDGER_DATA_DIR = path.join(process.cwd(), 'src/data/ledger');

const getDbPath = (shopId: string) => path.join(LEDGER_DATA_DIR, `db_shop_${shopId}.json`);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop') || '1';

  logApiRequest('API:Ledger', 'GET', { shopId });

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Ledger', 'GET', 401, { shopId });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbPath = getDbPath(shopId);
    log.debug('Ledger dosyası kontrol ediliyor...', { path: dbPath });

    if (await fs.stat(dbPath).catch(() => false)) {
      const timer = log.time(`GET shop_${shopId} okuma süresi`);
      const content = await fs.readFile(dbPath, 'utf8');
      const data = JSON.parse(content);
      timer.end();

      const monthCount = data.months ? Object.keys(data.months).length : 0;
      logApiResponse('API:Ledger', 'GET', 200, { 
        shopId, 
        shopName: data.shopName || '?',
        monthCount,
        fileSize: `${(content.length / 1024).toFixed(1)}KB`,
      });

      return NextResponse.json(data);
    } else {
      log.info('Ledger dosyası bulunamadı, boş veri döndürülüyor', { shopId });
      logApiResponse('API:Ledger', 'GET', 200, { shopId, status: 'boş veri' });
      return NextResponse.json({});
    }
  } catch (error: any) {
    logApiError('API:Ledger', 'GET', error);
    return NextResponse.json({ message: 'Error reading ledger data.', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop') || '1';

  logApiRequest('API:Ledger', 'POST', { shopId });

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Ledger', 'POST', 401, { shopId });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbPath = getDbPath(shopId);
    const newData = await request.json();

    log.debug('Ledger verisi yazılıyor (tam üzerine yazma)', { shopId, dbPath });

    if (!await fs.stat(LEDGER_DATA_DIR).catch(() => false)) {
      log.info('Ledger dizini oluşturuluyor...', { path: LEDGER_DATA_DIR });
      await fs.mkdir(LEDGER_DATA_DIR, { recursive: true });
    }

    const timer = log.time(`POST shop_${shopId} yazma süresi`);
    await fs.writeFile(dbPath, JSON.stringify(newData, null, 2));
    timer.end();

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
    logApiResponse('API:Ledger', 'PATCH', 401, { shopId });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbPath = getDbPath(shopId);
    const payload = await request.json(); // Beklenen: { monthKey: '2026-04', monthData: {...} }

    log.debug('Kısmi güncelleme (PATCH) alındı', { 
      shopId, 
      monthKey: payload.monthKey,
      hasMonthData: !!payload.monthData,
      dayCount: payload.monthData?.days?.length || 0,
      costCount: payload.monthData?.costs?.length || 0,
    });

    if (!await fs.stat(LEDGER_DATA_DIR).catch(() => false)) {
      log.info('Ledger dizini oluşturuluyor...', { path: LEDGER_DATA_DIR });
      await fs.mkdir(LEDGER_DATA_DIR, { recursive: true });
    }

    let existingData: any = { months: {} };
    if (await fs.stat(dbPath).catch(() => false)) {
      const content = await fs.readFile(dbPath, 'utf8');
      try {
        existingData = JSON.parse(content);
        log.debug('Mevcut dosya okundu', { 
          existingMonths: Object.keys(existingData.months || {}).length 
        });
      } catch (e) {
        log.warn('Mevcut dosya bozuk veya boş, sıfırdan başlanıyor');
        // Dosya bozuksa veya boşsa sıfırdan başla
      }
    } else {
      log.info('Dosya mevcut değil, yeni oluşturulacak', { shopId });
    }

    if (!existingData.months) {
      existingData.months = {};
    }

    // Sadece belirtilen ayı güncelle
    if (payload.monthKey && payload.monthData) {
      existingData.months[payload.monthKey] = payload.monthData;
      log.debug(`Ay güncellendi: ${payload.monthKey}`);
    } else {
      log.warn('Geçersiz PATCH payload — monthKey veya monthData eksik', payload);
    }

    const timer = log.time(`PATCH shop_${shopId} yazma süresi`);
    await fs.writeFile(dbPath, JSON.stringify(existingData, null, 2));
    timer.end();

    logApiResponse('API:Ledger', 'PATCH', 200, { shopId, updatedMonth: payload.monthKey });
    return NextResponse.json({ success: true, updatedMonth: payload.monthKey });
  } catch (error: any) {
    logApiError('API:Ledger', 'PATCH', error);
    return NextResponse.json({ message: 'Error patching ledger data.', error: error.message }, { status: 500 });
  }
}
