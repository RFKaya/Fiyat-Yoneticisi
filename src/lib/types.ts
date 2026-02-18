export type Unit = 'kg' | 'g' | 'litre' | 'ml' | 'adet';

export type Ingredient = {
  id: string;
  name: string;
  price: number;
  // Unit for the price, e.g. price per kg
  unit: 'kg' | 'litre' | 'adet';
};

export type RecipeItem = {
  ingredientId: string;
  // Quantity of the ingredient used in the product.
  // The unit is assumed to be 'g' for 'kg', 'ml' for 'litre', and 'adet' for 'adet'.
  quantity: number;
};

export type Product = {
  id: string;
  name: string;
  recipe: RecipeItem[];
  storePrice: number;
  onlinePrice: number;
};
