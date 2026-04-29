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
import CostHistoryChart from './CostHistoryChart';


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
    <div className="p-6 bg-muted/20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Sol Taraf: Reçete / Fiyat Girişi */}
        <div className="space-y-6">
          {isRecipeEmpty && (
            <div className="glass-panel p-4 bg-background/50 border-dashed">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Bu ürünün reçetesi henüz oluşturulmamış. Maliyeti doğrudan girebilir veya aşağıdan malzeme ekleyerek reçete oluşturabilirsiniz.
                </p>
                <div className="flex items-center gap-4 max-w-sm">
                  <Label htmlFor={`manual-cost-${product.id}`} className="shrink-0 font-bold">Doğrudan Maliyet</Label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₺</span>
                    <Input
                      id={`manual-cost-${product.id}`}
                      type="number"
                      placeholder="0.00"
                      className="pl-7 font-bold text-lg"
                      defaultValue={product.manualCost || ''}
                      onBlur={(e) => updateProduct(product.id, 'manualCost', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    />
                  </div>
                </div>
              </div>
              {!(product.manualCost > 0) && (
                <div className="relative my-6">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-background px-3 text-xs font-bold text-muted-foreground tracking-widest">VEYA</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!(product.manualCost > 0) && (
            <div className="space-y-4">
              <div className="border rounded-xl bg-card overflow-hidden shadow-sm border-border/50">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Bileşen</TableHead>
                      <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider">Miktar</TableHead>
                      <TableHead className="w-[120px] text-right font-bold text-xs uppercase tracking-wider">Maliyet</TableHead>
                      <TableHead className="w-[50px] text-right"></TableHead>
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
                        <TableRow key={`sub-${subProduct.id}`} className="bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                          <TableCell className="font-medium align-top py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-indigo-500" />
                              </div>
                              <div>
                                <div className="font-bold text-sm">{subProduct.name}</div>
                                <div className="text-[10px] font-medium text-indigo-500/70 uppercase tracking-tight">
                                  Alt Ürün • Birim: {formatCurrency(subProductCost)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                placeholder="1"
                                className="w-20 text-right h-8 font-bold"
                                value={String(quantity || '')}
                                onChange={(e) => handleQuantityChange(subProduct.id, true, e.target.value)}
                              />
                              <span className="text-[10px] font-bold text-muted-foreground w-10 uppercase">adet</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold py-3 text-sm">
                            {formatCurrency(itemCost)}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(subProduct.id, true)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {/* Separator between sub-products and ingredients */}
                    {recipeSubProducts.length > 0 && recipeIngredients.length > 0 && (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={4} className="p-0">
                          <div className="h-[1px] bg-border/50 w-full" />
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
                            case 'kg': recipeUnitLabel = 'gr'; break;
                            case 'gram': recipeUnitLabel = 'gr'; break;
                            case 'adet': recipeUnitLabel = 'ad'; break;
                          }
                        } else {
                          recipeUnitLabel = '₺';
                        }

                        const priceText = ingredient.price !== undefined && ingredient.unit
                          ? `${formatCurrency(ingredient.price)} / ${ingredient.unit}`
                          : `Birim fiyat yok`;

                        return (
                          <TableRow key={ingredient.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium align-top py-3">
                              <div className="font-bold text-sm">{ingredient.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{priceText}</span>
                                {ingredient.unit && (
                                  <button onClick={() => handleOpenEditPriceDialog(ingredient)} className="text-primary hover:text-primary/70 transition-colors">
                                    <Edit className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="w-20 text-right h-8 font-bold"
                                  value={String(quantity || '')}
                                  onChange={(e) => handleQuantityChange(ingredient.id, false, e.target.value)}
                                />
                                <span className="text-[10px] font-bold text-muted-foreground w-10 uppercase">{recipeUnitLabel}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold py-3 text-sm">
                              {formatCurrency(itemCost)}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(ingredient.id, false)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : !hasAnyItems && !isRecipeEmpty && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Package className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm font-medium">Reçete oluşturmak için malzeme veya ürün ekleyin.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <SelectionPopover
                    label="Malzeme"
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
                    label="Ürün"
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

                <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Toplam Reçete Maliyeti</div>
                  <div className="text-xl font-black text-primary">{formatCurrency(totalCost)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Taraf: Maliyet Geçmişi */}
        <div className="lg:sticky lg:top-4">
          <CostHistoryChart history={product.costHistory || []} />
        </div>
      </div>

      <Dialog open={!!ingredientToEdit} onOpenChange={(open) => !open && handleCloseEditPriceDialog()}>
        <DialogContent className="glass-panel border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{ingredientToEdit?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-price" className="font-bold text-sm">Yeni Birim Fiyat (₺)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₺</span>
                <Input
                  id="new-price"
                  type="number"
                  className="pl-7 font-bold"
                  value={newPriceInput}
                  onChange={(e) => setNewPriceInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePriceUpdateRequest(); }}
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Bu değişiklik bu malzemeyi kullanan tüm reçeteleri etkileyecektir.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleCloseEditPriceDialog} className="font-bold">İptal</Button>
            <Button onClick={handlePriceUpdateRequest} className="font-bold px-8">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
