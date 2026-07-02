import * as XLSX from 'xlsx';
import { PlatformId } from '../platforms';

/**
 * Excel workbook içeriğine bakarak hangi platforma ait olduğunu otomatik tespit eder.
 */
export function detectPlatform(buffer: ArrayBuffer): PlatformId {
  const bytes = new Uint8Array(buffer);

  const originalConsoleError = console.error;
  let workbook;
  try {
    console.error = () => {};
    workbook = XLSX.read(bytes, { type: 'array' });
  } finally {
    console.error = originalConsoleError;
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('Excel dosyasında sayfa bulunamadı.');
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: '' }) as any[][];
  const cellValues = data.slice(0, 5).flat().map(cell => String(cell || '').trim().toLowerCase());
  const looksLikeGetirOrderRow = data.slice(1, 10).some(row => (
    String(row[1] || '').trim() &&
    looksLikeDate(row[10]) &&
    String(row[11] || '').trim() &&
    looksLikeMoney(row[12]) &&
    looksLikeMoney(row[22])
  ));

  // 1. Trendyol
  if (
    cellValues.includes('teslimat modeli') ||
    cellValues.includes('kuryeye teslim tarihi') ||
    cellValues.includes('siparis numarasi') ||
    cellValues.includes('sipariş numarası') ||
    cellValues.includes('siparis statusu') ||
    cellValues.includes('sipariş statüsü') ||
    cellValues.includes('birim fiyati') ||
    cellValues.includes('birim fiyatı')
  ) {
    return 'trendyol';
  }

  // 2. Yemeksepeti
  if (
    cellValues.some(val =>
      val.includes('yemekpay') ||
      val.includes('yemeksepeti') ||
      val.includes('kupon maliyeti')
    )
  ) {
    return 'yemeksepeti';
  }

  // 3. Getir Yemek
  if (
    cellValues.includes('checkout id') ||
    cellValues.some(val => val.includes('getir')) ||
    looksLikeGetirOrderRow ||
    (
      cellValues.some(val => val.includes('odeme') || val.includes('ödeme')) &&
      cellValues.some(val => val.includes('siparis') || val.includes('sipariş')) &&
      cellValues.some(val => val.includes('komisyon')) &&
      cellValues.some(val => val.includes('restoran') && val.includes('indirim'))
    )
  ) {
    return 'getir';
  }

  // 4. Migros
  if (
    cellValues.includes('net tutar') ||
    cellValues.includes('teslimat tipi') ||
    cellValues.some(val => val.includes('migros'))
  ) {
    return 'migros';
  }

  const sheetNameLower = firstSheetName.toLowerCase();
  if (sheetNameLower.includes('trendyol')) return 'trendyol';
  if (sheetNameLower.includes('yemeksepeti')) return 'yemeksepeti';
  if (sheetNameLower.includes('getir')) return 'getir';
  if (sheetNameLower.includes('migros')) return 'migros';

  throw new Error('Platform otomatik olarak tespit edilemedi. Lütfen dosyanın geçerli bir platform raporu olduğundan emin olun.');
}

function looksLikeMoney(value: any): boolean {
  if (typeof value === 'number') return true;
  const text = String(value || '').replace(/\s/g, '').trim();
  return /\d/.test(text) && /^[\d.,-]+(?:tl|try)?$/i.test(text);
}

function looksLikeDate(value: any): boolean {
  if (value instanceof Date) return true;
  if (typeof value === 'number') return Boolean(XLSX.SSF.parse_date_code(value));

  const text = String(value || '').trim();
  if (!text) return false;

  const parsed = new Date(text.replace(' ', 'T'));
  if (!isNaN(parsed.getTime())) return true;

  return /^\d{1,2}[./-]\d{1,2}[./-]\d{4}/.test(text);
}
