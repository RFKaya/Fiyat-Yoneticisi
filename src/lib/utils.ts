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
    if (!ingredient || ingredient.purchaseQty <= 0 || ingredient.recipeUnitsPerPurchaseUnit <= 0) {
      return total;
    }

    const pricePerPurchaseUnit = ingredient.purchasePrice / ingredient.purchaseQty;
    const costPerRecipeUnit = pricePerPurchaseUnit / ingredient.recipeUnitsPerPurchaseUnit;

    const itemCost = costPerRecipeUnit * item.quantity;
    return total + itemCost;
  }, 0);
}
