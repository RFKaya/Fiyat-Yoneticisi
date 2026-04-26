/**
 * Sipariş analitik modülü.
 * Parsed siparişleri menüdeki ürünlerle eşleştirip ekonomik analiz yapar.
 * Tüm hesaplamalar merkezi calculateEconomicsFromPrice fonksiyonunu kullanır.
 */

import type { Product, Ingredient } from '@/lib/types';
import { calculateCost, calculateEconomicsFromPrice, type EconomicsResult } from '@/lib/utils';
import type { ParsedOrder } from './types';
import type { PlatformId } from '@/lib/platforms';
import { parseOrderContentString, normalizeWeightUnit, stripCommonSuffixes, stripFillerWords, type ParsedContentItem } from './orderContentParser';

// ── Tip Tanımları ──────────────────────────────────────────

export interface MatchedItem {
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  matchedProductId: string;
  matchedProductName: string;
}

export interface OrderAnalysis {
  orderNumber: string;
  platform: PlatformId;
  revenue: number;
  totalCost: number;
  economics: EconomicsResult;
  matchedItems: MatchedItem[];
  unmatchedItems: ParsedContentItem[];
  /** Ödeme yöntemi Yemek Kartı mı? */
  isYemekKarti: boolean;
  /** Yemek kartı kesinti tutarı (%10 × brüt ciro). Normal ödemede 0. */
  yemekKartiDeduction: number;
  /** Kupon maliyeti (özellikle Yemeksepeti için). */
  couponDiscount: number;
  /** Gerçekleşen komisyon oranı (Eğer platformdan geldiyse farklı olabilir) */
  actualCommissionRate: number;
  /** Komisyon platformdan mı geldi? */
  isCommissionOverridden: boolean;
}

export interface ProductSalesStats {
  productName: string;
  productId?: string;
  totalQuantity: number;
  totalCost: number;
  matched: boolean;
}

/** Platform komisyon oranları — /api/data'dan gelen settings */
export interface PlatformRates {
  yemeksepetiCommission: number;
  trendyolCommission: number;
  migrosCommission: number;
  getirCommission: number;
  kdvRate: number;
  stopajRate: number;
}

// ── Yardımcı Fonksiyonlar ──────────────────────────────────

/**
 * Ürün isimlerini basitçe normalize eder (Sadece birim, küçük harf ve boşluk).
 */
function simpleNormalize(name: string): string {
  return normalizeWeightUnit(name).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Ürün isimlerini agresif normalize ederek karşılaştırma yapar.
 * Filler kelimeler silinmiş ve kelimeler alfabetik sıralanmış.
 */
function normalizeForMatch(name: string): string {
  let n = normalizeWeightUnit(name).toLowerCase().trim();
  n = stripCommonSuffixes(n);
  n = stripFillerWords(n);
  return n.split(' ').filter(Boolean).sort().join(' ');
}

/**
 * Platform ID'sine göre doğru komisyon oranını döndürür.
 * Merkezi settings'ten alır, hardcoded değer yok.
 */
export function getPlatformCommission(platformId: PlatformId, rates: PlatformRates): number {
  const map: Record<PlatformId, number> = {
    yemeksepeti: rates.yemeksepetiCommission,
    trendyol: rates.trendyolCommission,
    migros: rates.migrosCommission,
    getir: rates.getirCommission,
  };
  return map[platformId] ?? 15;
}

// ── Ana Analiz Fonksiyonları ───────────────────────────────

/**
 * Tek bir siparişi analiz eder — ürünleri eşleştirir ve ekonomik hesap yapar.
 * calculateEconomicsFromPrice merkezi fonksiyonunu kullanarak KDV, komisyon,
 * stopaj dahil net kâr hesaplar.
 */
export function analyzeOrder(
  order: ParsedOrder,
  products: Product[],
  ingredients: Ingredient[],
  rates: PlatformRates
): OrderAnalysis {
  // 1. İçerik ayrıştır — items doluysa onu kullan, yoksa raw.content'ten parse et
  const contentItems: ParsedContentItem[] = order.items.length > 0
    ? order.items.map(i => ({ name: i.name, quantity: i.quantity }))
    : order.raw?.content
      ? parseOrderContentString(order.raw.content)
      : [];

  // 2. Map'leri oluştur (Hızlı erişim için)
  const simpleProductMap = new Map<string, Product>();
  const advancedProductMap = new Map<string, Product>();
  
  for (const p of products) {
    simpleProductMap.set(simpleNormalize(p.name), p);
    advancedProductMap.set(normalizeForMatch(p.name), p);
  }

  // 3. Her ürünü eşleştir
  const matchedItems: MatchedItem[] = [];
  const unmatchedItems: ParsedContentItem[] = [];

  for (const item of contentItems) {
    // AŞAMA 1: Tam/Basit Eşleşme (Standart Çiğ Köfte Dürüm gibi durumlar için)
    const simpleName = simpleNormalize(item.name);
    let product = simpleProductMap.get(simpleName);

    // AŞAMA 2: Agresif Eşleşme (Filler temizleme + Kelime sıralama)
    if (!product) {
      const advancedName = normalizeForMatch(item.name);
      product = advancedProductMap.get(advancedName);
    }

    // AŞAMA 3: Fallback Matching (Parantezleri silerek dene)
    if (!product && simpleName.includes('(')) {
      let tempName = simpleName;
      while (!product && tempName.includes('(')) {
        const lastParenIndex = tempName.lastIndexOf('(');
        if (lastParenIndex === -1) break;
        tempName = tempName.substring(0, lastParenIndex).trim();
        if (!tempName) break;
        
        product = simpleProductMap.get(tempName) || advancedProductMap.get(normalizeForMatch(tempName));
      }
    }

    if (product) {
      const hasRecipe = product.recipe && product.recipe.length > 0;
      const unitCost = hasRecipe
        ? calculateCost(product.recipe, ingredients, products)
        : product.manualCost;

      matchedItems.push({
        name: item.name,
        quantity: item.quantity,
        unitCost,
        totalCost: unitCost * item.quantity,
        matchedProductId: product.id,
        matchedProductName: product.name,
      });
    } else {
      unmatchedItems.push(item);
    }
  }

  // 4. Toplam maliyet ve ekonomik hesap
  const totalCost = matchedItems.reduce((sum, m) => sum + m.totalCost, 0);
  const commissionRate = getPlatformCommission(order.platform, rates);

  // Merkezi hesaplama fonksiyonunu kullan — prices sayfasıyla aynı formül
  const baseEconomics = calculateEconomicsFromPrice(
    order.totalAmount,
    totalCost,
    rates.kdvRate,
    commissionRate,
    rates.stopajRate,
    order.platformCommission
  );

  // Yemek kartı tespiti: ödeme yöntemi "Yemek Kartı" ise %10 ciro kesintisi uygulanır
  const isYemekKarti = (order.paymentMethod ?? '').trim() === 'Yemek Kartı';
  const yemekKartiDeduction = isYemekKarti ? order.totalAmount * 0.10 : 0;

  // Kupon maliyetini dahil et
  const couponDiscount = order.couponDiscount || 0;

  // Yemek kartı kesintisini ve kupon maliyetini net kârdan düş
  const economics: EconomicsResult = {
    ...baseEconomics,
    netProfit: baseEconomics.netProfit - yemekKartiDeduction - couponDiscount
  };

  return {
    orderNumber: order.orderNumber,
    platform: order.platform,
    revenue: order.totalAmount,
    totalCost,
    economics,
    matchedItems,
    unmatchedItems,
    isYemekKarti,
    yemekKartiDeduction,
    couponDiscount,
    actualCommissionRate: order.totalAmount > 0 
      ? (baseEconomics.commissionAmount / order.totalAmount) * 100 
      : commissionRate,
    isCommissionOverridden: order.platformCommission !== undefined,
  };
}

/**
 * Tüm siparişleri toplu analiz eder.
 */
export function analyzeAllOrders(
  orders: ParsedOrder[],
  products: Product[],
  ingredients: Ingredient[],
  rates: PlatformRates
): OrderAnalysis[] {
  return orders.map(order => analyzeOrder(order, products, ingredients, rates));
}

/**
 * Tüm siparişlerden ürün satış istatistiklerini toplar.
 * En çok satılandan en az satılana sıralı döner.
 */
export function aggregateProductStats(analyses: OrderAnalysis[]): ProductSalesStats[] {
  const statsMap = new Map<string, ProductSalesStats>();

  for (const analysis of analyses) {
    for (const item of analysis.matchedItems) {
      const key = item.matchedProductId;
      const existing = statsMap.get(key);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalCost += item.totalCost;
      } else {
        statsMap.set(key, {
          productName: item.matchedProductName,
          productId: item.matchedProductId,
          totalQuantity: item.quantity,
          totalCost: item.totalCost,
          matched: true,
        });
      }
    }

    for (const item of analysis.unmatchedItems) {
      const key = `unmatched:${normalizeForMatch(item.name)}`;
      const existing = statsMap.get(key);
      if (existing) {
        existing.totalQuantity += item.quantity;
      } else {
        statsMap.set(key, {
          productName: item.name,
          totalQuantity: item.quantity,
          totalCost: 0,
          matched: false,
        });
      }
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
}
