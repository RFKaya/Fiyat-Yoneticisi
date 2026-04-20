import * as XLSX from 'xlsx';
import { ParsedOrder, Platform } from './types';

export function parseYemeksepeti(buffer: ArrayBuffer): ParsedOrder[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // header: 1 returns data as arrays (index-based)
  // range: 2 skips the first 2 rows (data starts from row 3)
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 2 }) as any[][];

  return data
    .filter(row => row[1]) // Ensure order number exists
    .map((row) => ({
      orderNumber: String(row[1] || ''),
      platform: 'YEMEKSEPETI' as Platform,
      // Column I (8): Date
      orderDate: (() => {
        const val = row[8];
        if (val instanceof Date) return val;
        if (typeof val === 'string') {
          // Handle format: 2026-04-18 19:32
          const d = new Date(val.replace(' ', 'T'));
          if (!isNaN(d.getTime())) return d;
        }
        // Fallback for Excel serial numbers if cellDates: true fails
        if (typeof val === 'number') {
           const d = XLSX.SSF.parse_date_code(val);
           return new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S);
        }
        return new Date();
      })(),
      // Column F (5): Payment Method
      paymentMethod: String(row[5] || 'Bilinmiyor'),
      // Column V (21): Total Amount
      totalAmount: typeof row[21] === 'number' ? row[21] : parseFloat(String(row[21] || '0').replace(',', '.')),
      // Column H (7): Status
      status: String(row[7] || ''),
      items: [], 
      hasDetails: true,
      raw: {
        paymentMethod: row[5],
        content: row[47], // Column AV (47)
        fullRow: row
      }
    }));
}

