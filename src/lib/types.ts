export type RecipeItem = {
  ingredientId?: string;
  subProductId?: string;
  // Quantity of the ingredient/sub-product used in the product.
  // For ingredients: unit depends on ingredient's unit (e.g. grams for 'kg'/'gram', count for 'adet')
  // For sub-products: always in 'adet' (count)
  // If ingredient has no unit, this is the cost in TL.
  quantity: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  order: number;
  categoryMargins?: CategoryMargin[];
};

export type CategoryMargin = {
  id: string;
  categoryId: string;
  marginId: string;
  value: number;
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
  commissionRate?: number | null;
  name?: string;
  categorySpecifics?: CategoryMargin[];
};

export type ProductCostHistory = {
  id: string;
  productId: string;
  dateKey: string;
  cost: number;
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
  costHistory?: ProductCostHistory[];
};

export type GlobalSettings = {
  id: string;
  platformCommission: number;
  kdvRate: number;
  bankCommissionRate: number;
  stopajRate: number;
  migrosCommission: number;
  getirCommission: number;
  yemeksepetiCommission: number;
  trendyolCommission: number;

  // Prices page simulated commissions
  pricesMigrosCommission?: number | null;
  pricesGetirCommission?: number | null;
  pricesYemeksepetiCommission?: number | null;
  pricesTrendyolCommission?: number | null;
};
