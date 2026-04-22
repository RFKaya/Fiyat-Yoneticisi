'use client';

import { useState, useMemo } from 'react';
import type { Product, Ingredient, RecipeItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { calculateCost, formatCurrency } from '@/lib/utils';
import { PlusCircle, Trash2, Edit, Package } from 'lucide-react';
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

/**
 * Collects all product IDs reachable from a given product's recipe (recursively).
 * Used to prevent circular references when adding sub-products.
 */
function getReachableProductIds(productId: string, allProducts: Product[]): Set<string> {
  const reachable = new Set<string>();
  const stack = [productId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (reachable.has(currentId)) continue;
    reachable.add(currentId);

    const product = allProducts.find(p => p.id === currentId);
    if (product?.recipe) {
      for (const item of product.recipe) {
        if (item.subProductId && !reachable.has(item.subProductId)) {
          stack.push(item.subProductId);
        }
      }
    }
  }

  return reachable;
}

interface SelectionPopoverProps {
  label: string;
  placeholder: string;
  triggerIcon: any;
  items: { id: string; name: string }[];
  onSelect: (id: string) => void;
  accentClass?: string;
  icon: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

function SelectionPopover({
  label,
  placeholder,
  triggerIcon: TriggerIcon,
  items,
  onSelect,
  accentClass = "hover:bg-primary/10 hover:text-primary",
  icon: Icon,
  open,
  onOpenChange,
  search,
  onSearchChange
}: SelectionPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={accentClass.includes('indigo') ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300' : ''}>
          <TriggerIcon className="mr-2 h-4 w-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 overflow-hidden" align="start">
        <div className="p-2 border-b bg-muted/30">
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-1">
            {items.length > 0 ? (
              items.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start text-xs h-9 px-2 transition-colors group ${accentClass}`}
                  onClick={() => onSelect(item.id)}
                >
                  <Icon className="h-3.5 w-3.5 mr-2 opacity-70 group-hover:opacity-100 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {search ? 'Sonuç bulunamadı.' : 'Eklenecek öge yok.'}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}


export default function InlineRecipeEditor({ product, ingredients, allProducts, onSave, updateProduct, updateIngredientPrice }: InlineRecipeEditorProps) {
  const [isAddIngredientOpen, setAddIngredientOpen] = useState(false);
  const [isAddProductOpen, setAddProductOpen] = useState(false);

  const [searchIng, setSearchIng] = useState('');
  const [searchProd, setSearchProd] = useState('');

  const [ingredientToEdit, setIngredientToEdit] = useState<Ingredient | null>(null);
  const [newPriceInput, setNewPriceInput] = useState('');

  const handleOpenEditPriceDialog = (ingredient: Ingredient) => {
    if (ingredient.price === undefined) return;
    setIngredientToEdit(ingredient);
    setNewPriceInput(String(ingredient.price));
  };

  const handleCloseEditPriceDialog = () => {
    setIngredientToEdit(null);
    setNewPriceInput('');
  }

  const handleQuantityChange = (itemKey: string, isSubProduct: boolean, quantityStr: string) => {
    const quantity = parseFloat(quantityStr.replace(',', '.'));

    if (isNaN(quantity) && quantityStr !== '' && quantityStr !== '.' && quantityStr !== ',') return;

    const newRecipe = (product.recipe || []).map(item => {
      const matchKey = isSubProduct ? item.subProductId : item.ingredientId;
      if (matchKey === itemKey) {
        return { ...item, quantity: isNaN(quantity) ? 0 : quantity };
      }
      return item;
    });
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

  const handleAddSubProduct = (subProductId: string) => {
    const currentRecipe = product.recipe || [];
    if (currentRecipe.some(item => item.subProductId === subProductId)) return;

    const newRecipe = [...currentRecipe, { subProductId, quantity: 1 }];
    onSave(newRecipe);
    setAddProductOpen(false);
  };

  const handleRemoveItem = (itemKey: string, isSubProduct: boolean) => {
    const newRecipe = (product.recipe || []).filter(item => {
      if (isSubProduct) return item.subProductId !== itemKey;
      return item.ingredientId !== itemKey;
    });
    onSave(newRecipe);
  };

  const availableIngredients = useMemo(() => {
    const list = ingredients.filter(
      (ing) => !(product.recipe || []).some((item) => item.ingredientId === ing.id)
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (!searchIng) return list;
    const lowerSearch = searchIng.toLowerCase();
    return list.filter(ing => ing.name.toLowerCase().includes(lowerSearch));
  }, [ingredients, product.recipe, searchIng]);

  // Products available to add as sub-products:
  // 1. Not the current product itself
  // 2. Not already in the recipe  
  // 3. Not any product that would create a circular reference
  const availableSubProducts = useMemo(() => {
    const currentRecipe = product.recipe || [];
    const alreadyAdded = new Set(currentRecipe.filter(r => r.subProductId).map(r => r.subProductId!));

    // Find all products that have THIS product in their reachable sub-product chain
    // Those products cannot be added as sub-products (would create a cycle)
    const forbidden = new Set<string>();
    forbidden.add(product.id); // Can't add self

    // For each other product, check if it references this product in its chain
    for (const p of allProducts) {
      if (p.id === product.id) continue;
      const reachable = getReachableProductIds(p.id, allProducts);
      if (reachable.has(product.id)) {
        // This product p references our product — so we can't add p as a sub-product
        // (it would create: product -> p -> ... -> product)
        forbidden.add(p.id);
      }
    }

    const list = allProducts.filter(p =>
      !forbidden.has(p.id) && !alreadyAdded.has(p.id)
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (!searchProd) return list;
    const lowerSearch = searchProd.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(lowerSearch));
  }, [product.id, product.recipe, allProducts, searchProd]);

  const isRecipeEmpty = !product.recipe || product.recipe.length === 0;

  const totalCost = calculateCost(product.recipe || [], ingredients, allProducts);

  // Separate recipe items into ingredient items and sub-product items
  const recipeIngredients = (product.recipe || [])
    .filter(item => !!item.ingredientId)
    .map(recipeItem => {
      const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
      return { recipeItem, ingredient };
    })
    .filter(item => !!item.ingredient)
    .sort((a, b) => (a.ingredient!.order ?? 0) - (b.ingredient!.order ?? 0));

  const recipeSubProducts = (product.recipe || [])
    .filter(item => !!item.subProductId)
    .map(recipeItem => {
      const subProduct = allProducts.find(p => p.id === recipeItem.subProductId);
      return { recipeItem, subProduct };
    })
    .filter(item => !!item.subProduct)
    .sort((a, b) => (a.subProduct!.order ?? 0) - (b.subProduct!.order ?? 0));

  const hasAnyItems = recipeIngredients.length > 0 || recipeSubProducts.length > 0;

  return (
    <div className="p-4 bg-muted/30">
      {isRecipeEmpty && (
        <>
          <div className="mb-2">
            <p className="text-sm text-muted-foreground mb-2">
              Bu ürünün reçetesi yok. Maliyeti doğrudan girebilir veya malzeme/ürün ekleyebilirsiniz.
            </p>
            <div className="flex items-center gap-2 max-w-sm">
              <Label htmlFor={`manual-cost-${product.id}`} className="shrink-0">Doğrudan Maliyet (₺)</Label>
              <Input
                id={`manual-cost-${product.id}`}
                type="number"
                placeholder="0.00"
                defaultValue={product.manualCost || ''}
                onBlur={(e) => updateProduct(product.id, 'manualCost', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
            </div>
          </div>
          <div className="relative my-4">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-muted/30 px-2 text-sm text-muted-foreground">VEYA</span>
            </div>
          </div>
        </>
      )}

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bileşen</TableHead>
              <TableHead className="w-[150px]">Miktar</TableHead>
              <TableHead className="w-[120px] text-right">Reçete Maliyeti</TableHead>
              <TableHead className="w-[50px] text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Sub-product items */}
            {recipeSubProducts.map(({ recipeItem, subProduct }) => {
              if (!subProduct) return null;

              const quantity = recipeItem?.quantity || 0;
              const subProductCost = calculateCost(
                subProduct.recipe || [], ingredients, allProducts
              ) || subProduct.manualCost;
              const itemCost = subProductCost * quantity;

              return (
                <TableRow key={`sub-${subProduct.id}`} className="bg-indigo-500/5">
                  <TableCell className="font-medium align-top py-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-400 shrink-0" />
                      <div>
                        <div className="font-semibold">{subProduct.name}</div>
                        <div className="text-xs text-indigo-400/80">
                          Ürün • Birim maliyet: {formatCurrency(subProductCost)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        placeholder="1"
                        className="w-24 text-right h-8"
                        value={String(quantity || '')}
                        onChange={(e) => handleQuantityChange(subProduct.id, true, e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground w-12 text-left">adet</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium py-2">
                    {formatCurrency(itemCost)}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveItem(subProduct.id, true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Separator between sub-products and ingredients */}
            {recipeSubProducts.length > 0 && recipeIngredients.length > 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-0 px-0">
                  <Separator />
                </TableCell>
              </TableRow>
            )}

            {/* Ingredient items */}
            {recipeIngredients.length > 0 ? (
              recipeIngredients.map(({ recipeItem, ingredient }) => {
                if (!ingredient) return null;

                const quantity = recipeItem?.quantity || 0;
                const itemCost = calculateCost([recipeItem], ingredients, allProducts);

                let recipeUnitLabel = '';
                if (ingredient.unit) {
                  switch (ingredient.unit) {
                    case 'kg': recipeUnitLabel = 'gram'; break;
                    case 'gram': recipeUnitLabel = 'gram'; break;
                    case 'adet': recipeUnitLabel = 'adet'; break;
                  }
                } else {
                  recipeUnitLabel = 'TL';
                }

                const priceText = ingredient.price !== undefined && ingredient.unit
                  ? `${formatCurrency(ingredient.price)} / ${ingredient.unit}`
                  : `Birim fiyat yok`;

                return (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium align-top py-2">
                      <div>{ingredient.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{priceText}</span>
                        {ingredient.unit && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditPriceDialog(ingredient)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-24 text-right h-8"
                          value={String(quantity || '')}
                          onChange={(e) => handleQuantityChange(ingredient.id, false, e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground w-12 text-left">{recipeUnitLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium py-2">
                      {formatCurrency(itemCost)}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveItem(ingredient.id, false)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : !hasAnyItems && !isRecipeEmpty && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Reçete oluşturmak için malzeme veya ürün ekleyin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <SelectionPopover
            label="Malzeme Ekle"
            placeholder="Malzeme ara..."
            triggerIcon={PlusCircle}
            icon={Package}
            items={availableIngredients}
            onSelect={handleAddIngredient}
            open={isAddIngredientOpen}
            onOpenChange={setAddIngredientOpen}
            search={searchIng}
            onSearchChange={setSearchIng}
          />

          <SelectionPopover
            label="Ürün Ekle"
            placeholder="Ürün ara..."
            triggerIcon={Package}
            icon={Package}
            items={availableSubProducts}
            onSelect={handleAddSubProduct}
            accentClass="hover:bg-indigo-500/10 hover:text-indigo-400"
            open={isAddProductOpen}
            onOpenChange={setAddProductOpen}
            search={searchProd}
            onSearchChange={setSearchProd}
          />
        </div>

        <div className="text-right">
          <span className="text-sm font-semibold">Toplam Reçete Maliyeti: {formatCurrency(totalCost)}</span>
        </div>
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
