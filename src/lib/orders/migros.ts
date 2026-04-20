import * as XLSX from 'xlsx';
import { ParsedOrder, Platform } from './types';

export function parseMigros(buffer: ArrayBuffer): ParsedOrder[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as any[];

  return data.map((row) => ({
    orderNumber: String(row['Sipariş No'] || row['ID'] || ''),
    platform: 'MIGROS' as Platform,
    orderDate: row['Tarih'] ? new Date(row['Tarih']) : new Date(),
    paymentMethod: 'Platform Ödemesi',
    totalAmount: parseFloat(String(row['Net Tutar'] || row['Tutar'] || '0').replace(',', '.')),
    items: [],
    hasDetails: false, // Migros provides limited info
    raw: row
  }));
}
