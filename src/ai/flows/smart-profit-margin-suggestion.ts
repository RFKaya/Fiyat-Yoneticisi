'use server';
/**
 * @fileOverview This file implements a Genkit flow for suggesting an optimal starting profit margin percentage.
 *
 * - smartProfitMarginSuggestion - A function that handles the profit margin suggestion process.
 * - SmartProfitMarginSuggestionInput - The input type for the smartProfitMarginSuggestion function.
 * - SmartProfitMarginSuggestionOutput - The return type for the smartProfitMarginSuggestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SmartProfitMarginSuggestionInputSchema = z.object({
  productCost: z.number().min(0).describe('The cost price of the product.'),
});
export type SmartProfitMarginSuggestionInput = z.infer<typeof SmartProfitMarginSuggestionInputSchema>;

const SmartProfitMarginSuggestionOutputSchema = z.object({
  suggestedProfitMarginPercentage: z.number().min(5).max(100).describe('The suggested optimal profit margin percentage (e.g., 25 for 25%).'),
});
export type SmartProfitMarginSuggestionOutput = z.infer<typeof SmartProfitMarginSuggestionOutputSchema>;

export async function smartProfitMarginSuggestion(input: SmartProfitMarginSuggestionInput): Promise<SmartProfitMarginSuggestionOutput> {
  return smartProfitMarginSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartProfitMarginSuggestionPrompt',
  input: { schema: SmartProfitMarginSuggestionInputSchema },
  output: { schema: SmartProfitMarginSuggestionOutputSchema },
  prompt: `You are an expert product pricing strategist. Your goal is to suggest an optimal starting profit margin percentage for a product, ensuring it's both competitive and profitable. Consider general market dynamics for typical retail products.

Based on the following product cost, provide a numerical profit margin percentage between 5 and 100.

Product Cost: {{{productCost}}}
`,
});

const smartProfitMarginSuggestionFlow = ai.defineFlow(
  {
    name: 'smartProfitMarginSuggestionFlow',
    inputSchema: SmartProfitMarginSuggestionInputSchema,
    outputSchema: SmartProfitMarginSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to get a profit margin suggestion.');
    }
    return output;
  }
);
