export type RecipeItem = {
  ingredientId: string;
  // Quantity of the ingredient used in the product.
  // The unit is the ingredient's recipeUnit.
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
  // How the ingredient is purchased
  purchasePrice: number; // e.g. 100 (for 1 pack)
  purchaseQty: number; // e.g. 1
  purchaseUnit: string; // e.g. "Paket"
  // How the ingredient is used in recipes
  recipeUnit: string; // e.g. "Adet"
  // Conversion factor
  recipeUnitsPerPurchaseUnit: number; // e.g. 50 (adet per paket)
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
