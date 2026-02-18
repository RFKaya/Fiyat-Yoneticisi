export type Product = {
  id: string;
  name: string;
  cost: number;
  storePrice: number;
  onlinePrice: number;
};

export type ComparisonTable = {
  id:string;
  productId: string;
};
