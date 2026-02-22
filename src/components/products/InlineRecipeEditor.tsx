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
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


type InlineRecipeEditorProps = {
  product: Product;
  ingredients: Ingredient[];
  allProducts: Product[];
  onSave: (newRecipe: RecipeItem[]) => void;
  updateProduct: (id: string, field: keyof Product, value: any) => void;
  updateIngredientPrice: (ingredientId: string, newPrice: number) => void;
};

const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) return '0,00 ₺';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4, 
    }).format(amount);
  };


export default function InlineRecipeEditor({ product, ingredients, allProducts, onSave, updateProduct, updateIngredientPrice }: InlineRecipeEditorProps) {
  const [isAddIngredientOpen, setAddIngredientOpen] = useState(false);
  
  const [ingredientToEdit, setIngredientToEdit] = useState<Ingredient | null>(null);
  const [newPriceInput, setNewPriceInput] = useState('');

  const handleOpenEditPriceDialog = (ingredient: Ingredient) => {
    setIngredientToEdit(ingredient);
    setNewPriceInput(String(ingredient.price));
  };
  
  const handleCloseEditPriceDialog = () => {
    setIngredientToEdit(null);
    setNewPriceInput('');
  }

  const handleQuantityChange = (ingredientId: string, quantityStr: string) => {
    const quantity = parseFloat(quantityStr);
    
    if (isNaN(quantity) && quantityStr !== '' && quantityStr !== '.') return;

    const newRecipe = (product.recipe || []).map(item =>
        item.ingredientId === ingredientId
        ? { ...item, quantity: isNaN(quantity) ? 0 : quantity }
        : item
    );
    onSave(newRecipe);
  };
  
  const handlePriceUpdateRequest = () => {
    if (!ingredientToEdit) return;

    const newPrice = parseFloat(newPriceInput);
    if (!isNaN(newPrice) && newPrice >= 0) {
        updateIngredientPrice(ingredientToEdit.id, newPrice);
    }
    handleCloseEditPriceDialog();
  };

  const handleAddIngredient = (ingredientId: string) => {
    const currentRecipe = product.recipe || [];
    if (currentRecipe.some(item => item.ingredientId === ingredientId)) return;
    
    const newRecipe = [...currentRecipe, { ingredientId, quantity: 0 }];
    onSave(newRecipe);
    setAddIngredientOpen(false);
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    const newRecipe = (product.recipe || []).filter(item => item.ingredientId !== ingredientId);
    onSave(newRecipe);
  };
  
  const availableIngredients = ingredients.filter(
      (ing) => !(product.recipe || []).some((item) => item.ingredientId === ing.id)
  );

  const isRecipeEmpty = !product.recipe || product.recipe.length === 0;

  const totalCost = calculateCost(product.recipe || [], ingredients);

  const recipeIngredients = (product.recipe || [])
    .map(recipeItem => {
        const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
        return { recipeItem, ingredient };
    })
    .filter(item => !!item.ingredient)
    .sort((a, b) => (a.ingredient!.order ?? 0) - (b.ingredient!.order ?? 0));

  return (
    <div className="p-4 bg-muted/30">
        {isRecipeEmpty && (
            <>
                <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-4">
                        Bu ürünün reçetesi yok. Maliyeti doğrudan girebilir veya malzeme ekleyerek bir reçete oluşturabilirsiniz.
                    </p>
                    <div className="flex items-center gap-2 max-w-sm">
                        <Label htmlFor={`manual-cost-${product.id}`} className="shrink-0">Doğrudan Maliyet (₺)</Label>
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
                        <span className="bg-muted/30 px-2 text-sm text-muted-foreground">VEYA</span>
                    </div>
                </div>
            </>
        )}

        <ScrollArea className="h-auto max-h-72 border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Malzeme</TableHead>
                <TableHead className="w-[150px]">Miktar</TableHead>
                <TableHead className="w-[120px] text-right">Reçete Maliyeti</TableHead>
                <TableHead className="w-[50px] text-right">İşlem</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {recipeIngredients.length > 0 ? (
                    recipeIngredients.map(({ recipeItem, ingredient }) => {
                        if (!ingredient) return null;
                        
                        const quantity = recipeItem?.quantity || 0;
                        const itemCost = calculateCost([recipeItem], ingredients);

                        let recipeUnitLabel = '';
                        switch (ingredient.unit) {
                            case 'kg': recipeUnitLabel = 'gram'; break;
                            case 'gram': recipeUnitLabel = 'gram'; break;
                            case 'adet': recipeUnitLabel = 'adet'; break;
                            case 'TL': recipeUnitLabel = 'TL'; break;
                        }

                        return (
                        <TableRow key={ingredient.id}>
                            <TableCell className="font-medium align-top py-2">
                            <div>{ingredient.name}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>{formatCurrency(ingredient.price)} / {ingredient.unit}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditPriceDialog(ingredient)}>
                                    <Edit className="h-3 w-3"/>
                                </Button>
                            </div>
                            </TableCell>
                            <TableCell className="py-2">
                            <div className="flex items-center justify-end gap-2">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    className="w-24 text-right h-8"
                                    value={quantity || ''}
                                    onChange={(e) => handleQuantityChange(ingredient.id, e.target.value)}
                                />
                                <span className="text-xs text-muted-foreground w-12 text-left">{recipeUnitLabel}</span>
                            </div>
                            </TableCell>
                            <TableCell className="text-right font-medium py-2">
                                {formatCurrency(itemCost)}
                            </TableCell>
                            <TableCell className="text-right py-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveIngredient(ingredient.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                        )
                    })
                ) : !isRecipeEmpty ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Bu ürüne ait reçete bulundu ancak malzemeler yüklenemedi.
                        </TableCell>
                    </TableRow>
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Reçete oluşturmak için malzeme ekleyin.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </ScrollArea>
       <div className="mt-4 flex justify-between items-center">
          <Popover open={isAddIngredientOpen} onOpenChange={setAddIngredientOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Malzeme Ekle
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <ScrollArea className="h-64">
                <div className="p-1">
                {availableIngredients.length > 0 ? (
                  availableIngredients.map(ing => (
                    <Button 
                      key={ing.id} 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleAddIngredient(ing.id)}
                    >
                      {ing.name}
                    </Button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Tüm malzemeler zaten reçetede.
                  </div>
                )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

            {!isRecipeEmpty && (
                <div className="text-right">
                    <span className="text-sm font-semibold">Toplam Reçete Maliyeti: {formatCurrency(totalCost)}</span>
                </div>
            )}
        </div>

        <Dialog open={!!ingredientToEdit} onOpenChange={(open) => !open && handleCloseEditPriceDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{ingredientToEdit?.name} Fiyatını Güncelle</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Label htmlFor="new-price">Yeni Birim Fiyat (₺)</Label>
                    <Input 
                        id="new-price"
                        type="number" 
                        value={newPriceInput} 
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePriceUpdateRequest(); }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCloseEditPriceDialog}>İptal</Button>
                    <Button onClick={handlePriceUpdateRequest}>Güncelle</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
