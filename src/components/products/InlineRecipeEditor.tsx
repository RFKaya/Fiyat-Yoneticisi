'use client';

import { useState } from 'react';
import type { Product, Ingredient, RecipeItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { calculateCost } from '@/lib/utils';
import { Save } from 'lucide-react';

type InlineRecipeEditorProps = {
  product: Product;
  ingredients: Ingredient[];
  onSave: (newRecipe: RecipeItem[]) => void;
  updateProduct: (id: string, field: keyof Product, value: any) => void;
};

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '0,00 ₺';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};


export default function InlineRecipeEditor({ product, ingredients, onSave, updateProduct }: InlineRecipeEditorProps) {
  const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>(product.recipe || []);

  const hasRecipe = product.recipe && product.recipe.length > 0;

  const handleQuantityChange = (ingredientId: string, quantityStr: string) => {
    const quantity = parseFloat(quantityStr);

    setCurrentRecipe(prev => {
      const newRecipe = prev.filter(item => item.ingredientId !== ingredientId);
      if (!isNaN(quantity) && quantity > 0) {
        newRecipe.push({ ingredientId, quantity });
      }
      return newRecipe;
    });
  };
  
  const getIngredientUnitLabel = (ingredient: Ingredient) => {
      return ingredient.unit;
  }

  const totalCost = calculateCost(currentRecipe, ingredients);

  return (
    <div className="p-4">
        {!hasRecipe && (
            <>
                <div className="mb-6">
                    <h4 className="font-semibold text-base mb-2">Doğrudan Maliyet Girişi</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                        Bu ürün bir reçeteye sahip değil (örneğin bir içecek). Maliyeti doğrudan girebilir veya bir reçete oluşturabilirsiniz.
                    </p>
                    <div className="flex items-center gap-2 max-w-sm">
                        <Label htmlFor={`manual-cost-${product.id}`} className="shrink-0">Ürün Maliyeti (₺)</Label>
                        <Input
                            id={`manual-cost-${product.id}`}
                            type="number"
                            placeholder="0.00"
                            value={product.manualCost || ''}
                            onChange={(e) => updateProduct(product.id, 'manualCost', e.target.value)}
                        />
                    </div>
                </div>
                <div className="relative mb-6">
                    <Separator />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-muted/20 px-2 text-sm text-muted-foreground">VEYA</span>
                    </div>
                </div>
            </>
        )}

        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-base">Reçete Yönetimi</h4>
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-xs text-muted-foreground">Toplam Reçete Maliyeti</p>
                    <p className="font-bold text-lg">{formatCurrency(totalCost)}</p>
                </div>
                <Button onClick={() => onSave(currentRecipe)} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    Reçeteyi Kaydet
                </Button>
            </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ürün maliyetini hesaplamak için kullanılacak malzemeleri ve miktarlarını belirtin. Kaydedildiğinde, bu reçete maliyeti kullanılacaktır.
        </p>
      <ScrollArea className="h-72 border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Malzeme</TableHead>
              <TableHead className="w-[150px]">Miktar</TableHead>
              <TableHead className="w-[120px] text-right">Birim Maliyet</TableHead>
              <TableHead className="w-[120px] text-right">Toplam Maliyet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map(ingredient => {
                const recipeItem = currentRecipe.find(item => item.ingredientId === ingredient.id);
                const quantity = recipeItem?.quantity || 0;
                const itemCost = ingredient.price * quantity;

                return (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                         <Input
                            type="number"
                            placeholder="0"
                            className="w-24 text-right h-8"
                            value={quantity || ''}
                            onChange={(e) => handleQuantityChange(ingredient.id, e.target.value)}
                          />
                          <span className="text-xs text-muted-foreground w-12 text-left">{getIngredientUnitLabel(ingredient)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                        {formatCurrency(ingredient.price)} / {ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        {formatCurrency(itemCost)}
                    </TableCell>
                  </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
