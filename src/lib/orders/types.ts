export type Platform = 'TRENDYOL' | 'YEMEKSEPETI' | 'MIGROS' | 'GETIR';

export interface ParsedOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ParsedOrder {
  id?: string;
  orderNumber: string;
  platform: Platform;
  orderDate: Date;
  paymentMethod?: string;
  totalAmount: number;
  status?: string;
  items: ParsedOrderItem[];
  raw?: any; // For debugging
  hasDetails: boolean; // False for Migros/Getir
}

export interface ParsingResult {
  success: boolean;
  orders: ParsedOrder[];
  errors: string[];
}
