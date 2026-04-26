import type { PlatformId } from '@/lib/platforms';

// Backward compat: Platform artık PlatformId'nin alias'ı
export type Platform = PlatformId;

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
  couponDiscount?: number;
  raw?: any; // For debugging
}

export interface ParsingResult {
  success: boolean;
  orders: ParsedOrder[];
  errors: string[];
}
