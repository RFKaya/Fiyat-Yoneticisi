import { Platform, ParsedOrder } from './types';
import { parseTrendyol } from './trendyol';
import { parseYemeksepeti } from './yemeksepeti';
import { parseMigros } from './migros';
import { parseGetir } from './getir';

export async function parseOrderFile(
  file: File,
  platform: Platform
): Promise<ParsedOrder[]> {
  const buffer = await file.arrayBuffer();
  
  switch (platform) {
    case 'TRENDYOL':
      return parseTrendyol(buffer);
    case 'YEMEKSEPETI':
      return parseYemeksepeti(buffer);
    case 'MIGROS':
      return parseMigros(buffer);
    case 'GETIR':
      return parseGetir(buffer);
    default:
      throw new Error('Geçersiz platform seçildi');
  }
}
