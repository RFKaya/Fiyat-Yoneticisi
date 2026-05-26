'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, Ingredient, RecipeItem, ProductCostSource } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { calculateCost, formatCurrency } from '@/lib/utils';
import { PlusCircle, Edit, Package, CheckCircle2, Circle } from 'lucide-react';
import { DeleteIconButton, AddRowButton, PopoverTriggerButton, CancelRowButton } from '@/components/ui/icon-buttons';
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
  updateProductCostSources: (productId: string, sources: ProductCostSource[]) => void;
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
        <PopoverTriggerButton
          icon={TriggerIcon}
          accent={accentClass.includes('indigo') ? 'indigo' : 'primary'}
        >
          {label}
        </PopoverTriggerButton>
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


const generateLocalId = () => `new-${Math.random().toString(36).slice(2)}`;

export default function InlineRecipeEditor({ product, ingredients, allProducts, onSave, updateProduct, updateIngredientPrice, updateProductCostSources }: InlineRecipeEditorProps) {
  const [isAddIngredientOpen, setAddIngredientOpen] = useState(false);
  const [isAddProductOpen, setAddProductOpen] = useState(false);

  const [searchIng, setSearchIng] = useState('');
  const [searchProd, setSearchProd] = useState('');

  const [ingredientToEdit, setIngredientToEdit] = useState<Ingredient | null>(null);
  const [newPriceInput, setNewPriceInput] = useState('');

  // For new source being typed
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceCost, setNewSourceCost] = useState('');
  const [showNewSourceRow, setShowNewSourceRow] = useState(false);
  const [costError, setCostError] = useState(false);
  const newSourceNameRef = useRef<HTMLInputElement>(null);

  const costSources: ProductCostSource[] = product.costSources || [];

  // One-time migration: if product has manualCost but no sources, create an unnamed source
  useEffect(() => {
    if (costSources.length === 0 && product.manualCost > 0 && isRecipeEmptyRef.current) {
      const migratedSource: ProductCostSource = {
        id: generateLocalId(),
        productId: product.id,
        sourceName: '',
        cost: product.manualCost,
        isSelected: true,
      };
      updateProductCostSources(product.id, [migratedSource]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCostSource = () => {
    const cost = parseFloat(newSourceCost.replace(',', '.'));
    if (isNaN(cost) || cost < 0) {
      setCostError(true);
      return;
    }
    setCostError(false);
    const isFirst = costSources.length === 0;
    const newSource: ProductCostSource = {
      id: generateLocalId(),
      productId: product.id,
      sourceName: newSourceName.trim(),
      cost,
      isSelected: isFirst,
    };
    const updated = [...costSources, newSource];
    updateProductCostSources(product.id, updated);
    if (isFirst) updateProduct(product.id, 'manualCost', cost);
    setNewSourceName('');
    setNewSourceCost('');
    setShowNewSourceRow(false);
  };

  const handleSelectSource = (sourceId: string) => {
    const updated = costSources.map(s => ({ ...s, isSelected: s.id === sourceId }));
    updateProductCostSources(product.id, updated);
    const selected = updated.find(s => s.isSelected);
    if (selected) updateProduct(product.id, 'manualCost', selected.cost);
  };

  const handleDeleteSource = (sourceId: string) => {
    const wasSelected = costSources.find(s => s.id === sourceId)?.isSelected;
    let updated = costSources.filter(s => s.id !== sourceId);
    if (wasSelected && updated.length > 0) {
      updated = updated.map((s, i) => ({ ...s, isSelected: i === 0 }));
      updateProduct(product.id, 'manualCost', updated[0].cost);
    } else if (updated.length === 0) {
      updateProduct(product.id, 'manualCost', 0);
    }
    updateProductCostSources(product.id, updated);
  };

  const handleSourceCostChange = (sourceId: string, costStr: string) => {
    const cost = parseFloat(costStr.replace(',', '.'));
    if (isNaN(cost)) return;
    const updated = costSources.map(s =>
      s.id === sourceId ? { ...s, cost } : s
    );
    updateProductCostSources(product.id, updated);
    const sel = updated.find(s => s.isSelected);
    if (sel) updateProduct(product.id, 'manualCost', sel.cost);
  };

  const handleSourceNameChange = (sourceId: string, name: string) => {
    const updated = costSources.map(s =>
      s.id === sourceId ? { ...s, sourceName: name } : s
    );
    updateProductCostSources(product.id, updated);
  };

  useEffect(() => {
    if (showNewSourceRow && newSourceNameRef.current) {
      newSourceNameRef.current.focus();
    }
  }, [showNewSourceRow]);

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
  // Stable ref for migration useEffect (avoids closure over stale isRecipeEmpty)
  const isRecipeEmptyRef = useRef(isRecipeEmpty);
  isRecipeEmptyRef.current = isRecipeEmpty;

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
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-sm">Maliyet Kaynakları</Label>
                  {costSources.length > 0 && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Aktif maliyet: <span className="text-primary">{formatCurrency(product.manualCost)}</span>
                    </span>
                  )}
                </div>

                {/* Sources table */}
                {costSources.length > 0 && (
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-background/60">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-8"></th>
                          <th className="text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kaynak Adı</th>
                          <th className="text-right px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">Fiyat (₺)</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {costSources.map((src) => (
                          <tr
                            key={src.id}
                            className={`border-t border-border/30 transition-colors ${src.isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
                              }`}
                          >
                            {/* Select radio */}
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleSelectSource(src.id)}
                                className="flex items-center justify-center hover:scale-110 transition-transform"
                                title="Bu kaynağı aktif maliyet olarak seç"
                              >
                                {src.isSelected
                                  ? <CheckCircle2 className="h-4 w-4 text-primary" />
                                  : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                              </button>
                            </td>
                            {/* Editable name */}
                            <td className="px-2 py-1.5">
                              <Input
                                className={`h-7 text-sm border-transparent hover:border-border focus:border-border bg-transparent px-2 font-medium ${src.isSelected ? 'text-primary' : ''
                                  }`}
                                value={src.sourceName}
                                onChange={(e) => handleSourceNameChange(src.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                placeholder="Kaynak belirtilmemiş"
                              />
                            </td>
                            {/* Editable cost */}
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                className={`h-7 w-full text-right text-sm border-transparent hover:border-border focus:border-border bg-transparent font-bold ${src.isSelected ? 'text-primary' : ''
                                  }`}
                                defaultValue={src.cost || ''}
                                onBlur={(e) => handleSourceCostChange(src.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                placeholder="0.00"
                              />
                            </td>
                            {/* Delete */}
                            <td className="pr-2">
                              <DeleteIconButton
                                buttonSize="sm"
                                className="text-muted-foreground/40"
                                onClick={() => handleDeleteSource(src.id)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* New source input row */}
                 {showNewSourceRow ? (
                   <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                     <div className="flex items-center gap-2">
                       <Input
                         ref={newSourceNameRef}
                         className="h-8 text-sm flex-1"
                         placeholder="Kaynak adı (örn: Migros) — isteğe bağlı"
                         value={newSourceName}
                         onChange={(e) => setNewSourceName(e.target.value)}
                         onKeyDown={(e) => { if (e.key === 'Enter') handleAddCostSource(); if (e.key === 'Escape') { setShowNewSourceRow(false); setCostError(false); } }}
                       />
                       <div className="relative shrink-0">
                         <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₺</span>
                         <Input
                           type="number"
                           className={`h-8 w-28 pl-6 text-sm font-bold transition-all ${
                             costError ? 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive ring-offset-background' : ''
                           }`}
                           placeholder="0.00"
                           value={newSourceCost}
                           onChange={(e) => {
                             setNewSourceCost(e.target.value);
                             if (costError) setCostError(false);
                           }}
                           onKeyDown={(e) => { if (e.key === 'Enter') handleAddCostSource(); if (e.key === 'Escape') { setShowNewSourceRow(false); setCostError(false); } }}
                         />
                       </div>
                       <Button size="sm" className="h-8 font-bold px-4 shrink-0" onClick={handleAddCostSource}>
                         Ekle
                       </Button>
                        <CancelRowButton onClick={() => { setShowNewSourceRow(false); setNewSourceName(''); setNewSourceCost(''); setCostError(false); }} />
                     </div>
                     {costError && (
                       <span className="text-[10px] text-destructive font-semibold px-1 animate-pulse">
                         Lütfen geçerli bir maliyet fiyatı girin.
                       </span>
                     )}
                   </div>
                 ) : (
                   <AddRowButton onClick={() => setShowNewSourceRow(true)}>
                     Kaynak Ekle
                   </AddRowButton>
                )}
              </div>

              {/* VEYA divider — only when no cost is active */}
              {!(product.manualCost > 0) && !showNewSourceRow && (
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
                            <DeleteIconButton onClick={() => handleRemoveItem(subProduct.id, true)} />
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
                            case 'kg':
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
                              <DeleteIconButton onClick={() => handleRemoveItem(ingredient.id, false)} />
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
