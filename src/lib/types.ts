export type RecipeItem = {
  ingredientId: string;
  // Quantity of the ingredient used in the product.
  // The unit depends on the ingredient's unit (e.g. grams for 'kg'/'gram', count for 'adet')
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
  // Price per unit ('kg', 'gram', 'adet', or 'TL')
  price: number;
  unit: 'kg' | 'gram' | 'adet' | 'TL';
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
