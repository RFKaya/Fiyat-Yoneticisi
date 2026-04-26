/**
 * Sipariş içerik string'ini ayrıştırıp ürün ismi ve miktar çıkaran parser.
 * Gramaj birimlerini normalleştirerek menü eşleştirmesini kolaylaştırır.
 */

export interface ParsedContentItem {
  name: string;
  quantity: number;
}

/**
 * Tüm gramaj kısaltmalarını standart 'g' harfine çevirir.
 * "gr." → "g", "gr" → "g", "GR." → "g"
 * "gram" kelimesi olduğu gibi bırakılır.
 * "kg", "ml", "lt" gibi diğer birimler etkilenmez.
 */
export function normalizeWeightUnit(text: string): string {
  return text
    // gr. -> g
    .replace(/(\d+)\s*gr\.?(?!\w)/gi, '$1 g')
    // kg. -> kg
    .replace(/(\d+)\s*kg\.?(?!\w)/gi, '$1 kg')
    // L. -> L
    .replace(/(\d+)\s*l\.?(?!\w)/gi, '$1 L')
    // ml. -> ml
    .replace(/(\d+)\s*ml\.?(?!\w)/gi, '$1 ml')
    // cl. -> ml (10x conversion)
    .replace(/(\d+(?:[.,]\d+)?)\s*cl\.?(?!\w)/gi, (match, p1) => {
      const val = parseFloat(p1.replace(',', '.'));
      return `${Math.round(val * 10)} ml`;
    });
}

/**
 * Platformlara özel gereksiz takıları (Örn: " Menü") siler
 * ve sembolleri standartlaştırır (& -> +).
 */
export function stripCommonSuffixes(text: string): string {
  return text
    .replace(/\s+Menü$/i, '') // Sondaki " Menü" yazısını sil
    .replace(/\s*&\s*/g, ' + ') // "&" işaretini " + " yap
    .trim();
}

/**
 * Köşeli parantez [...] içindeki malzeme detaylarını siler.
 * Örn: "[1 Göbek Marul, 1 Limon]" → ""
 */
export function stripBracketedContent(text: string): string {
  return text.replace(/\s*\[.*?\]/g, '');
}

/**
 * Sondaki gereksiz parantezleri temizler (Örn: " (Tek Kişilik)").
 * Ancak gramaj bilgisi (örn: " (160 g)") içeren parantezleri korur.
 */
export function stripExtraParentheses(text: string): string {
  let temp = text.trim();
  
  // Sondan başlayarak parantez bloklarını kontrol et
  while (temp.endsWith(')')) {
    const lastParenIndex = temp.lastIndexOf('(');
    if (lastParenIndex === -1) break;
    
    const parenContent = temp.substring(lastParenIndex).toLowerCase();
    
    // Eğer parantez içinde birim (g, kg, l, ml) bilgisi varsa dur
    const isWeight = parenContent.includes(' g') || 
                     parenContent.includes('g)') || 
                     parenContent.includes(' gr') || 
                     parenContent.includes('gr)') ||
                     parenContent.includes(' kg') ||
                     parenContent.includes('kg)') ||
                     parenContent.includes(' l') ||
                     parenContent.includes('l)') ||
                     parenContent.includes(' ml') ||
                     parenContent.includes('ml)');
                     
    if (isWeight) break;
    
    // Gramaj değilse bu parantez bloğunu sil
    temp = temp.substring(0, lastParenIndex).trim();
  }
  
  return temp;
}

/**
 * Sipariş içerik string'ini ayrıştırır.
 *
 * Girdi: "2 Doritoslu Çiğ Köfte Dürüm (100 gr.) [1 Göbek Marul, ...], 1 Standart ..."
 * Çıktı: [{ name: "Doritoslu Çiğ Köfte Dürüm (100 g)", quantity: 2 }, ...]
 */
export function parseOrderContentString(content: string): ParsedContentItem[] {
  if (!content || typeof content !== 'string') return [];

  // 1. Köşeli parantez içindeki malzemeleri temizle
  const cleaned = stripBracketedContent(content);

  // 2. Virgülle ayır (Sayılar arasındaki ondalık virgülleri ayırmamak için regex kullanıyoruz)
  // Sadece arkasından rakam GELMEYEN virgüllerden böl
  const parts = cleaned.split(/,(?!\d)/).map(s => s.trim()).filter(Boolean);

  const items: ParsedContentItem[] = [];

  for (const part of parts) {
    // 3. Başındaki miktar sayısını çıkar: "2 Doritoslu Çiğ Köfte Dürüm (100 gr.)"
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const quantity = parseInt(match[1], 10);
      const rawName = match[2].trim();
      // 4. Gramaj normalizasyonu
      let name = normalizeWeightUnit(rawName);
      name = stripCommonSuffixes(name);
      
      items.push({ name, quantity });
    } else {
      // Miktar yoksa 1 olarak kabul et
      let name = normalizeWeightUnit(part.trim());
      name = stripCommonSuffixes(name);
      
      if (name) {
        items.push({ name, quantity: 1 });
      }
    }
  }

  return items;
}
