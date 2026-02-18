'use server';

import { smartProfitMarginSuggestion } from '@/ai/flows/smart-profit-margin-suggestion';

export async function getSmartSuggestion(productCost: number) {
  if (productCost <= 0) {
    return { success: false, error: 'Product cost must be positive.' };
  }
  try {
    const result = await smartProfitMarginSuggestion({ productCost });
    return { success: true, suggestion: result.suggestedProfitMarginPercentage };
  } catch (error) {
    console.error('Error getting smart suggestion:', error);
    return { success: false, error: 'AI önerisi alınamadı. Lütfen tekrar deneyin.' };
  }
}
