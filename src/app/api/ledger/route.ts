import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyAuthCookie } from '@/lib/auth';

const LEDGER_DATA_DIR = path.join(process.cwd(), 'src/data/ledger');

const getDbPath = (shopId: string) => path.join(LEDGER_DATA_DIR, `db_shop_${shopId}.json`);

export async function GET(request: Request) {
  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop') || '1';
    const dbPath = getDbPath(shopId);

    if (await fs.stat(dbPath).catch(() => false)) {
      const content = await fs.readFile(dbPath, 'utf8');
      return NextResponse.json(JSON.parse(content));
    } else {
      return NextResponse.json({});
    }
  } catch (error: any) {
    return NextResponse.json({ message: 'Error reading ledger data.', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop') || '1';
    const dbPath = getDbPath(shopId);
    const newData = await request.json();

    if (!await fs.stat(LEDGER_DATA_DIR).catch(() => false)) {
      await fs.mkdir(LEDGER_DATA_DIR, { recursive: true });
    }

    await fs.writeFile(dbPath, JSON.stringify(newData, null, 2));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error saving ledger data.', error: error.message }, { status: 500 });
  }
}
