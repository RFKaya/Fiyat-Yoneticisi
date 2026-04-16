import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { RecipeItem, Ingredient } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateCost(recipe: RecipeItem[], ingredients: Ingredient[]): number {
  if (!recipe || !ingredients) return 0;

  return recipe.reduce((total, item) => {
    const ingredient = ingredients.find((i) => i.id === item.ingredientId);
    if (!ingredient) {
      return total;
    }

    let itemCost = 0;
    // If ingredient has no unit or price, the quantity is the direct cost in TL.
    if (ingredient.unit == null || ingredient.price == null) {
        itemCost = item.quantity || 0;
    } else {
        switch (ingredient.unit) {
          case 'kg':
            // ingredient.price is per kg, recipe item.quantity is in grams
            itemCost = (ingredient.price / 1000) * item.quantity;
            break;
          case 'gram':
            // ingredient.price is per gram, recipe item.quantity is in grams
            itemCost = ingredient.price * item.quantity;
            break;
          case 'adet':
             // ingredient.price is per adet, recipe item.quantity is in adets
            itemCost = ingredient.price * item.quantity;
            break;
        }
    }

    return total + (itemCost || 0);
  }, 0);
}

export interface EconomicsResult {
  sellingPrice: number;
  revenueExVat: number;
  vatAmount: number;
  commissionAmount: number;
  stopajAmount: number;
  netProfit: number;
  profitPercentage: number;          // Revenue-based (Ciroya göre)
  profitOverCostPercentage: number;  // Cost-based (Maliyete göre)
  isCalculable: boolean;
}

export function calculateEconomicsFromPrice(
  price: number,
  cost: number,
  kdvRate: number,
  commissionRate: number,
  stopajRate: number = 0
): EconomicsResult {
  if (!price || price <= 0) {
    return {
      sellingPrice: 0,
      revenueExVat: 0,
      vatAmount: 0,
      commissionAmount: 0,
      stopajAmount: 0,
      netProfit: -cost,
      profitPercentage: 0,
      profitOverCostPercentage: 0,
      isCalculable: false
    };
  }

  const revenueExVat = price / (1 + kdvRate / 100);
  const vatAmount = price - revenueExVat;
  const commissionAmount = price * (commissionRate / 100);
  const stopajAmount = revenueExVat * (stopajRate / 100);
  const netProfit = revenueExVat - commissionAmount - stopajAmount - cost;
  
  const profitPercentage = (netProfit / price) * 100;
  const profitOverCostPercentage = cost > 0 ? (netProfit / cost) * 100 : 0;

  return {
    sellingPrice: price,
    revenueExVat,
    vatAmount,
    commissionAmount,
    stopajAmount,
    netProfit,
    profitPercentage,
    profitOverCostPercentage,
    isCalculable: true
  };
}

export function calculateEconomicsFromMargin(
  targetMarginPercentage: number,
  cost: number,
  kdvRate: number,
  commissionRate: number,
  stopajRate: number = 0
): EconomicsResult {
  const revenueFactor = (1 - stopajRate / 100) / (1 + kdvRate / 100);
  const divisor = revenueFactor - (commissionRate / 100);
  
  // New Formula: SellingPrice = [ cost * (1 + TargetMargin / 100) ] / [ (1 - Stopaj/100) / (1 + KDV/100) - Commission/100 ]
  const sellingPrice = divisor > 0 ? (cost * (1 + targetMarginPercentage / 100)) / divisor : Infinity;
  
  if (!isFinite(sellingPrice) || sellingPrice <= 0) {
    return {
      sellingPrice: Infinity,
      revenueExVat: 0,
      vatAmount: 0,
      commissionAmount: 0,
      stopajAmount: 0,
      netProfit: 0,
      profitPercentage: 0,
      profitOverCostPercentage: 0,
      isCalculable: false
    };
  }

  const revenueExVat = sellingPrice / (1 + kdvRate / 100);
  const vatAmount = sellingPrice - revenueExVat;
  const commissionAmount = sellingPrice * (commissionRate / 100);
  const stopajAmount = revenueExVat * (stopajRate / 100);
  const netProfit = revenueExVat - commissionAmount - stopajAmount - cost;
  
  const profitPercentage = (netProfit / sellingPrice) * 100;
  const profitOverCostPercentage = cost > 0 ? (netProfit / cost) * 100 : 0;

  return {
    sellingPrice,
    revenueExVat,
    vatAmount,
    commissionAmount,
    stopajAmount,
    netProfit,
    profitPercentage,
    profitOverCostPercentage,
    isCalculable: true
  };
}
export function formatCurrency(amount: number, options: { minimumFractionDigits?: number, maximumFractionDigits?: number, fallback?: string } = {}) {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2, fallback = '' } = options;
  if (isNaN(amount) || !isFinite(amount)) return fallback;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}
