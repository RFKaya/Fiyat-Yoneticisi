/**
 * Sipariş analitik modülü.
 * Parsed siparişleri menüdeki ürünlerle eşleştirip ekonomik analiz yapar.
 * Tüm hesaplamalar merkezi calculateEconomicsFromPrice fonksiyonunu kullanır.
 */

import type { Product, Ingredient } from '@/lib/types';
import { calculateCost, calculateEconomicsFromPrice, type EconomicsResult } from '@/lib/utils';
import type { ParsedOrder } from './types';
import type { PlatformId } from '@/lib/platforms';
import { parseOrderContentString, normalizeWeightUnit, type ParsedContentItem } from './orderContentParser';

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
 * Ürün isimlerini normalize ederek karşılaştırma yapar.
 * Case-insensitive, trimmed, gramaj normalize edilmiş.
 */
function normalizeForMatch(name: string): string {
  return normalizeWeightUnit(name).toLowerCase().trim().replace(/\s+/g, ' ');
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

  // 2. Normalize edilmiş isim → product map'i oluştur
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(normalizeForMatch(p.name), p);
  }

  // 3. Her ürünü eşleştir
  const matchedItems: MatchedItem[] = [];
  const unmatchedItems: ParsedContentItem[] = [];

  for (const item of contentItems) {
    const normalizedName = normalizeForMatch(item.name);
    let product = productMap.get(normalizedName);

    // Fallback Matching: Tam eşleşme yoksa parantezleri sondan silerek dene
    if (!product && normalizedName.includes('(')) {
      let tempName = normalizedName;
      while (!product && tempName.includes('(')) {
        const lastParenIndex = tempName.lastIndexOf('(');
        if (lastParenIndex === -1) break;
        
        // Gramaj bilgisini korumak için kontrol (isteğe bağlı, ama genel fallback için silebiliriz)
        tempName = tempName.substring(0, lastParenIndex).trim();
        if (!tempName) break;
        
        product = productMap.get(tempName);
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
    rates.stopajRate
  );

  // Yemek kartı tespiti: ödeme yöntemi "Yemek Kartı" ise %10 ciro kesintisi uygulanır
  const isYemekKarti = (order.paymentMethod ?? '').trim() === 'Yemek Kartı';
  const yemekKartiDeduction = isYemekKarti ? order.totalAmount * 0.10 : 0;

  // Yemek kartı kesintisini net kârdan düş
  const economics: EconomicsResult = isYemekKarti
    ? { ...baseEconomics, netProfit: baseEconomics.netProfit - yemekKartiDeduction }
    : baseEconomics;

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
