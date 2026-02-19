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
      case 'TL':
        // ingredient.price is the cost, item.quantity is a multiplier
        itemCost = ingredient.price * item.quantity;
        break;
    }

    return total + itemCost;
  }, 0);
}
