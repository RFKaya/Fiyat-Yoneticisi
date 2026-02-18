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
    if (!ingredient) return total; // Ingredient not found, maybe deleted

    let itemCost = 0;
    // Price is per kg/litre, but recipe quantity is in g/ml
    if ((ingredient.unit === 'kg' || ingredient.unit === 'litre')) {
      itemCost = (ingredient.price / 1000) * item.quantity;
    } else { // 'adet' (piece)
      itemCost = ingredient.price * item.quantity;
    }
    return total + itemCost;
  }, 0);
}
