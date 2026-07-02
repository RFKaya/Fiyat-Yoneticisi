import * as XLSX from 'xlsx';
import { ParsedOrder } from './types';

/**
 * Getir Yemek sipariş raporu parser'ı.
 *
 * 1. satır bilgi/başlık satırıdır; siparişler 2. satırdan başlar.
 * Sütun haritası (0-indexed):
 *   B (1)  -> Ödeme yöntemi
 *   K (10) -> Tarih
 *   L (11) -> Sipariş no
 *   M (12) -> Brüt sipariş tutarı
 *   O (14) -> Restoran indirimi
 *   W (22) -> Komisyon tutarı
 */
export function parseGetir(buffer: ArrayBuffer): ParsedOrder[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    range: 1,
    defval: '',
  }) as any[][];

  return data
    .filter(row => String(row[11] || '').trim())
    .map((row) => {
      const restaurantDiscount = parseMoney(row[14]);
      const commission = parseMoney(row[22]);

      return {
        orderNumber: String(row[11] || '').trim(),
        platform: 'getir' as const,
        orderDate: parseDate(row[10]),
        paymentMethod: normalizePaymentMethod(row[1]),
        totalAmount: parseMoney(row[12]),
        couponDiscount: restaurantDiscount,
        platformCommission: commission > 0 ? commission : undefined,
        items: [],
        raw: {
          paymentMethod: row[1],
          orderDate: row[10],
          grossAmount: row[12],
          restaurantDiscount: row[14],
          commission: row[22],
          fullRow: row,
        },
      };
    });
}

function parseMoney(value: any): number {
  if (typeof value === 'number') return Math.abs(value);

  const text = String(value || '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!text) return 0;

  const normalized = text.includes(',') && text.includes('.')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(',', '.');

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function parseDate(value: any): Date {
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
    }
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return new Date();

    const isoDate = new Date(text.replace(' ', 'T'));
    if (!isNaN(isoDate.getTime())) return isoDate;

    const trMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (trMatch) {
      const [, day, month, year, hour = '0', minute = '0', second = '0'] = trMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );
    }
  }

  return new Date();
}

function normalizePaymentMethod(value: any): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Platform Ödemesi';

  const lower = raw.toLowerCase();
  if (
    lower.includes('multinet') ||
    lower.includes('pluxee') ||
    lower.includes('sodexo') ||
    lower.includes('setcard') ||
    lower.includes('edenred') ||
    lower.includes('ticket') ||
    lower.includes('metropol') ||
    lower.includes('yemek kart')
  ) {
    return 'Yemek Kartı';
  }

  return raw;
}
