import * as XLSX from 'xlsx';
import { ParsedOrder } from './types';

export function parseGetir(buffer: ArrayBuffer): ParsedOrder[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as any[];

  return data.map((row) => ({
    orderNumber: String(row['Sipariş No'] || row['Checkout ID'] || ''),
    platform: 'getir' as const,
    orderDate: row['Tarih'] ? new Date(row['Tarih']) : new Date(),
    paymentMethod: 'Platform Ödemesi',
    totalAmount: parseFloat(String(row['Ödenen Tutar'] || row['Tutar'] || '0').replace(',', '.')),
    items: [],
    raw: row
  }));
}
