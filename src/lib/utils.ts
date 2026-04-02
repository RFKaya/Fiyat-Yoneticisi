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
    if (ingredient.unit === undefined || ingredient.price === undefined) {
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
  profitPercentage: number;
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
      isCalculable: false
    };
  }

  const revenueExVat = price / (1 + kdvRate / 100);
  const vatAmount = price - revenueExVat;
  const commissionAmount = price * (commissionRate / 100);
  const stopajAmount = revenueExVat * (stopajRate / 100);
  const netProfit = revenueExVat - commissionAmount - stopajAmount - cost;
  const profitPercentage = (netProfit / price) * 100;

  return {
    sellingPrice: price,
    revenueExVat,
    vatAmount,
    commissionAmount,
    stopajAmount,
    netProfit,
    profitPercentage,
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
  const divisor = revenueFactor - (commissionRate / 100) - (targetMarginPercentage / 100);
  const sellingPrice = divisor > 0 ? cost / divisor : Infinity;
  
  if (!isFinite(sellingPrice) || sellingPrice <= 0) {
    return {
      sellingPrice: Infinity,
      revenueExVat: 0,
      vatAmount: 0,
      commissionAmount: 0,
      stopajAmount: 0,
      netProfit: 0,
      profitPercentage: 0,
      isCalculable: false
    };
  }

  const revenueExVat = sellingPrice / (1 + kdvRate / 100);
  const vatAmount = sellingPrice - revenueExVat;
  const commissionAmount = sellingPrice * (commissionRate / 100);
  const stopajAmount = revenueExVat * (stopajRate / 100);
  const netProfit = revenueExVat - commissionAmount - stopajAmount - cost;
  // Account for floating point inaccuracies
  const profitPercentage = (netProfit / sellingPrice) * 100;

  return {
    sellingPrice,
    revenueExVat,
    vatAmount,
    commissionAmount,
    stopajAmount,
    netProfit,
    profitPercentage,
    isCalculable: true
  };
}
