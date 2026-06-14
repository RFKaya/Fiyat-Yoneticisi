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
    .replace(/(\d+(?:[.,]\d+)?)\s*gr\.?(?!\w)/gi, '$1 g')
    // kg. / kilo -> kg
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:kilo|kg)\.?(?!\w)/gi, '$1 kg')
    // L. -> L
    .replace(/(\d+(?:[.,]\d+)?)\s*l\.?(?!\w)/gi, '$1 L')
    // ml. -> ml
    .replace(/(\d+(?:[.,]\d+)?)\s*ml\.?(?!\w)/gi, '$1 ml')
    // cc. -> ml (1:1 conversion)
    .replace(/(\d+(?:[.,]\d+)?)\s*cc\.?(?!\w)/gi, '$1 ml')
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
 * Platformlarda kullanılan "Standart", "Özel", "Yarım", "Porsiyon" gibi eşleşmeyi zorlaştıran 
 * ancak ana ürünü değiştirmeyen kelimeleri temizler.
 */
export function stripFillerWords(text: string): string {
  return text
    .replace(/\b(standart|özel|ozel|yeni|popüler|populer|yarım|yarim|porsiyon|porsıyon|tam|adet|tane|pors|aile\s+boyu|aile\s+boy|aile|mega|orta\s+boy|orta|küçük\s+boy|kucuk\s+boy|küçük|kucuk|büyük\s+boy|buyuk\s+boy|büyük|buyuk|boyu|boy|double|duble|tek|tekli|çift|cift|çiftli|ciftli|ekstra|extra|süper|super)\b/gi, '')
    .replace(/\s+/g, ' ')
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
 * '+' içeren kombo/menü ürün isimlerini ayrıştırıp miktar ve temiz isimler listesi döner.
 * Örn: "Standart Çiğ Köfte Dürüm (100 g) + 330 Ml. Coca Cola", miktar: 2
 * Çıktı: [{ name: "Standart Çiğ Köfte Dürüm (100 g)", quantity: 2 }, { name: "330 Ml. Coca Cola", quantity: 2 }]
 */
export function splitItemByNameWithPlus(name: string, quantity: number): ParsedContentItem[] {
  if (!name.includes('+')) {
    return [{ name, quantity }];
  }

  const parts = name.split('+').map(p => p.trim()).filter(Boolean);
  const result: ParsedContentItem[] = [];

  for (const part of parts) {
    // 1. Explicit adet belirteçleri: "2 x Ayran", "2 adet Ayran", "2 tane Ayran"
    const explicitMatch = part.match(/^(\d+)\s*(?:x|adet|tane)\s+(.+)$/i);
    if (explicitMatch) {
      const subQty = parseInt(explicitMatch[1], 10);
      result.push({
        name: explicitMatch[2].trim(),
        quantity: quantity * subQty
      });
      continue;
    }

    // 2. Sadece sayı ile başlayan durumlar: "2 Ayran" veya "330 Ml. Coca Cola"
    const numberMatch = part.match(/^(\d+)\s+(.+)$/);
    if (numberMatch) {
      const subQty = parseInt(numberMatch[1], 10);
      const rest = numberMatch[2].trim();
      const firstWordOfRest = rest.split(/\s+/)[0].toLowerCase().replace(/\./g, '');
      const isUnit = /^(?:ml|cl|cc|lt|l|g|gr|gram|kg|kilo|oz|kişilik|kisilik|kişi|kisi|dilim|parça|top)\b/i.test(firstWordOfRest);

      if (!isUnit) {
        result.push({
          name: rest,
          quantity: quantity * subQty
        });
        continue;
      }
    }

    // 3. Adet bulunamadıysa parent miktarını miras al
    result.push({
      name: part,
      quantity
    });
  }

  return result;
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
      const quantityVal = parseInt(match[1], 10);
      const rawName = match[2].trim();
      
      // Sonraki kelimenin bir birim veya "kişilik" vb. dolgu kelimesi olup olmadığını kontrol et
      const firstWordOfRest = rawName.split(/\s+/)[0].toLowerCase().replace(/\./g, '');
      const isUnitOrAdjective = /^(?:ml|cl|cc|lt|l|g|gr|gram|kg|kilo|oz|kişilik|kisilik|kişi|kisi|dilim|parça|top)\b/i.test(firstWordOfRest);

      if (isUnitOrAdjective) {
        // Birim veya dolgu sıfatı ise, bu sayı adet değil ismin parçasıdır (örn: "3 Kişilik ...")
        let name = normalizeWeightUnit(part.trim());
        name = stripCommonSuffixes(name);
        if (name) {
          items.push({ name, quantity: 1 });
        }
      } else {
        // Normal miktar sayısı
        let name = normalizeWeightUnit(rawName);
        name = stripCommonSuffixes(name);
        items.push({ name, quantity: quantityVal });
      }
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
