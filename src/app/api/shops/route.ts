import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyAuthCookie } from '@/lib/auth';
import { apiShopsLogger as log, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';

const LEDGER_DATA_DIR = path.join(process.cwd(), 'src/data/ledger');

export async function GET() {
  logApiRequest('API:Shops', 'GET');

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Shops', 'GET', 401);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!await fs.stat(LEDGER_DATA_DIR).catch(() => false)) {
      log.info('Ledger dizini bulunamadı, oluşturuluyor...', { path: LEDGER_DATA_DIR });
      await fs.mkdir(LEDGER_DATA_DIR, { recursive: true });
    }

    const files = await fs.readdir(LEDGER_DATA_DIR);
    const shopFiles = files.filter(f => f.startsWith('db_shop_') && f.endsWith('.json'));
    log.debug('Dükkan dosyaları taranıyor...', { totalFiles: files.length, shopFiles: shopFiles.length });

    const shops = [];

    for (const file of shopFiles) {
      const id = file.replace('db_shop_', '').replace('.json', '');
      const content = await fs.readFile(path.join(LEDGER_DATA_DIR, file), 'utf-8');
      let shopName = `İşyeri ${id}`;
      
      if (content.trim() !== '') {
        try {
          const data = JSON.parse(content);
          if (data.shopName) shopName = data.shopName;
        } catch (e) {
          log.warn(`Dükkan dosyası bozuk: ${file}`, { error: (e as Error).message });
        }
      }
      
      shops.push({ id, name: shopName });
      log.debug(`Dükkan yüklendi: ${shopName}`, { id, file });
    }

    // Default shop if none exists
    if (shops.length === 0) {
      log.info('Hiç dükkan bulunamadı, varsayılan dükkan oluşturuluyor');
      const defaultShop = { id: '1', name: 'Dükkan 1' };
      const defaultPath = path.join(LEDGER_DATA_DIR, 'db_shop_1.json');
      await fs.writeFile(defaultPath, JSON.stringify({ shopName: 'Dükkan 1', data: {} }, null, 2));
      shops.push(defaultShop);
      log.success('Varsayılan dükkan oluşturuldu', defaultShop);
    }

    shops.sort((a, b) => parseInt(a.id) - parseInt(b.id));

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
