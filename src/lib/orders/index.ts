import type { PlatformId } from '@/lib/platforms';
import { ParsedOrder } from './types';
import { parseTrendyol } from './trendyol';
import { parseYemeksepeti } from './yemeksepeti';
import { parseMigros } from './migros';
import { parseGetir } from './getir';

// Parser map — switch-case yerine registry-based dispatch
const PARSERS: Record<PlatformId, (buffer: ArrayBuffer) => ParsedOrder[]> = {
  trendyol: parseTrendyol,
  yemeksepeti: parseYemeksepeti,
  migros: parseMigros,
  getir: parseGetir,
};

export async function parseOrderFile(
  file: File,
  platform: PlatformId
): Promise<ParsedOrder[]> {
  const buffer = await file.arrayBuffer();

  const parser = PARSERS[platform];
  if (!parser) throw new Error(`"${platform}" için parser tanımlı değil`);

  return parser(buffer);
}
