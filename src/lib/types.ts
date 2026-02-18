export type Unit = 'gram' | 'adet' | 'TL';

export type Ingredient = {
  id: string;
  name: string;
  price: number;
  // Unit for the price, e.g. price per gram
  unit: Unit;
};

export type RecipeItem = {
  ingredientId: string;
  // Quantity of the ingredient used in the product.
  // The unit is assumed to match the ingredient's unit.
  quantity: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
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
