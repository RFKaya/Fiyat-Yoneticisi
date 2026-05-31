import * as XLSX from 'xlsx';
import { PlatformId } from '../platforms';

/**
 * Excel workbook içeriğine bakarak hangi platforma ait olduğunu otomatik tespit eder.
 */
export function detectPlatform(buffer: ArrayBuffer): PlatformId {
  const bytes = new Uint8Array(buffer);
  
  // Hata almamak için console.error'u geçici olarak kapatıyoruz (XLSX bazen bozuk excel formatlarında log basabiliyor)
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

  // İlk 5 satırı analiz etmek için çekelim
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: '' }) as any[][];
  
  // İlk 5 satırdaki tüm hücrelerin değerlerini küçük harf string listesi haline getirip düzleştirelim
  const cellValues = data.slice(0, 5).flat().map(cell => String(cell || '').trim().toLowerCase());

  // 1. Trendyol Tespit Kriterleri
  if (
    cellValues.includes('teslimat modeli') || 
    cellValues.includes('kuryeye teslim tarihi') || 
    cellValues.includes('sipariş numarası') ||
    cellValues.includes('sipariş statusü') ||
    cellValues.includes('birim fiyatı')
  ) {
    return 'trendyol';
  }

  // 2. Yemeksepeti Tespit Kriterleri
  if (
    cellValues.some(val => 
      val.includes('yemekpay') || 
      val.includes('yemeksepeti') || 
      val.includes('kupon maliyeti')
    )
  ) {
    return 'yemeksepeti';
  }

  // 3. Getir Tespit Kriterleri
  if (
    cellValues.includes('checkout id') || 
    cellValues.some(val => val.includes('getir'))
  ) {
    return 'getir';
  }

  // 4. Migros Tespit Kriterleri
  if (
    cellValues.includes('net tutar') || 
    cellValues.includes('teslimat tipi') || 
    cellValues.some(val => val.includes('migros'))
  ) {
    return 'migros';
  }

  // Fallback: Excel sayfa isminde platform araması
  const sheetNameLower = firstSheetName.toLowerCase();
  if (sheetNameLower.includes('trendyol')) return 'trendyol';
  if (sheetNameLower.includes('yemeksepeti')) return 'yemeksepeti';
  if (sheetNameLower.includes('getir')) return 'getir';
  if (sheetNameLower.includes('migros')) return 'migros';

  throw new Error('Platform otomatik olarak tespit edilemedi. Lütfen dosyanın geçerli bir platform raporu olduğundan emin olun.');
}
