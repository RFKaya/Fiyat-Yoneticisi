import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyAuthCookie } from '@/lib/auth';

const LEDGER_DATA_DIR = path.join(process.cwd(), 'src/data/ledger');

export async function GET() {
  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!await fs.stat(LEDGER_DATA_DIR).catch(() => false)) {
      await fs.mkdir(LEDGER_DATA_DIR, { recursive: true });
    }

    const files = await fs.readdir(LEDGER_DATA_DIR);
    const shops = [];

    for (const file of files) {
      if (file.startsWith('db_shop_') && file.endsWith('.json')) {
        const id = file.replace('db_shop_', '').replace('.json', '');
        const content = await fs.readFile(path.join(LEDGER_DATA_DIR, file), 'utf-8');
        let shopName = `İşyeri ${id}`;
        
        if (content.trim() !== '') {
          try {
            const data = JSON.parse(content);
            if (data.shopName) shopName = data.shopName;
          } catch (e) {}
        }
        
        shops.push({ id, name: shopName });
      }
    }

    // Default shop if none exists
    if (shops.length === 0) {
      const defaultShop = { id: '1', name: 'Dükkan 1' };
      const defaultPath = path.join(LEDGER_DATA_DIR, 'db_shop_1.json');
      await fs.writeFile(defaultPath, JSON.stringify({ shopName: 'Dükkan 1', data: {} }, null, 2));
      shops.push(defaultShop);
    }

    shops.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return NextResponse.json(shops);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error reading shops.', error: error.message }, { status: 500 });
  }
}
