import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const platforms = new Set([
  'multinet',
  'edenred',
  'pluxee',
  'setcard',
  'metropol',
  'tokenflex',
]);

export async function GET() {
  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invoices = await prisma.mealCardInvoice.findMany({
      where: { completed: true },
      orderBy: [{ invoiceDate: 'asc' }, { platform: 'asc' }],
    });

    return NextResponse.json(
      invoices.map(invoice => ({
        platform: invoice.platform,
        date: invoice.invoiceDate,
        completed: invoice.completed,
      }))
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Yemek kartı faturaları okunamadı.', error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await verifyAuthCookie())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { platform, date, completed } = await request.json();

    if (
      !platforms.has(platform) ||
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof completed !== 'boolean'
    ) {
      return NextResponse.json({ message: 'Geçersiz fatura bilgisi.' }, { status: 400 });
    }

    if (completed) {
      await prisma.mealCardInvoice.upsert({
        where: {
          invoiceDate_platform: {
            invoiceDate: date,
            platform,
          },
        },
        update: { completed: true },
        create: {
          invoiceDate: date,
          platform,
          completed: true,
        },
      });
    } else {
      await prisma.mealCardInvoice.deleteMany({
        where: {
          invoiceDate: date,
          platform,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Yemek kartı faturası kaydedilemedi.', error: error.message },
      { status: 500 }
    );
  }
}
