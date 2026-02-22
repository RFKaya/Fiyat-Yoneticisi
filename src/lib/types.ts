export type RecipeItem = {
  ingredientId: string;
  // Quantity of the ingredient used in the product.
  // The unit depends on the ingredient's unit (e.g. grams for 'kg'/'gram', count for 'adet')
  // If ingredient has no unit, this is the cost in TL.
  quantity: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Ingredient = {
  id: string;
  name: string;
  // Price per unit ('kg', 'gram', 'adet') - now optional
  price?: number;
  // The unit is now optional. If not present, cost is specified directly in recipe.
  unit?: 'kg' | 'gram' | 'adet';
  order: number;
};

export type Margin = {
  id: string;
  value: number;
  type: 'store' | 'online';
};

export type Product = {
  id:string;
  name: string;
  recipe: RecipeItem[];
  manualCost: number;
  storePrice: number;
  onlinePrice: number;
  order: number;
  categoryId?: string;
};
