import * as XLSX from 'xlsx';
import { ParsedOrder } from './types';

export function parseTrendyol(buffer: ArrayBuffer): ParsedOrder[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as any[];

  return data.map((row) => ({
    orderNumber: String(row['Sipariş No'] || row['Sipariş Numarası'] || ''),
    platform: 'trendyol' as const,
    orderDate: row['Sipariş Tarihi'] ? new Date(row['Sipariş Tarihi']) : new Date(),
    paymentMethod: row['Ödeme Yöntemi'] || 'Online Ödeme',
    totalAmount: parseFloat(String(row['Toplam Tutar'] || row['Tutar'] || '0').replace(',', '.')),
    items: [], // Trendyol items usually in a separate sheet or nested, placeholder for now
    raw: row
  }));
}
