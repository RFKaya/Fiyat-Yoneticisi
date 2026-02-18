'use client';

import { useState } from 'react';
import type { Product, Ingredient, RecipeItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type RecipeFormProps = {
  product: Product;
  ingredients: Ingredient[];
  onSave: (newRecipe: RecipeItem[]) => void;
};

export default function RecipeForm({ product, ingredients, onSave }: RecipeFormProps) {
  const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>(product.recipe || []);

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
      if (ingredient.unit === 'kg') return 'gram';
      if (ingredient.unit === 'litre') return 'ml';
      return 'adet';
  }

  return (
    <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Ürünün maliyetini hesaplamak için kullanılacak malzemeleri ve miktarlarını belirtin. Miktar birimleri, malzemenin ana birimine göre otomatik olarak ayarlanır (kg için gram, litre için ml).
        </p>
      <ScrollArea className="h-72">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Malzeme</TableHead>
              <TableHead className="text-right">Miktar ({/* gram, ml, adet */})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map(ingredient => (
              <TableRow key={ingredient.id}>
                <TableCell className="font-medium">{ingredient.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                     <Input
                        type="number"
                        placeholder="0"
                        className="w-24 text-right"
                        value={currentRecipe.find(item => item.ingredientId === ingredient.id)?.quantity || ''}
                        onChange={(e) => handleQuantityChange(ingredient.id, e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground w-12 text-left">{getIngredientUnitLabel(ingredient)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="flex justify-end">
        <Button onClick={() => onSave(currentRecipe)}>Reçeteyi Kaydet</Button>
      </div>
    </div>
  );
}
