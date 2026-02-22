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
import { Save, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>(product.recipe || []);
  const [isAddIngredientOpen, setAddIngredientOpen] = useState(false);
  
  const [priceChangeInfo, setPriceChangeInfo] = useState<{ 
    ingredientId: string; 
    newPrice: number; 
    oldPrice: number, 
    ingredientName: string;
    affectedProducts: string[];
  } | null>(null);

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
    
    setCurrentRecipe(prev => {
        if (isNaN(quantity) && quantityStr !== '') return prev;
      
        return prev.map(item =>
          item.ingredientId === ingredientId
            ? { ...item, quantity: isNaN(quantity) ? 0 : quantity }
            : item
        );
      });
  };
  
  const handlePriceChangeRequest = () => {
    if (!ingredientToEdit) return;

    const newPrice = parseFloat(newPriceInput);
    const ingredient = ingredientToEdit;

    if (ingredient && !isNaN(newPrice) && newPrice > 0 && newPrice !== ingredient.price) {
      const affectedProducts = allProducts
        .filter(p => 
            p.id !== product.id && 
            p.recipe.some(item => item.ingredientId === ingredient.id)
        )
        .map(p => p.name);

      setPriceChangeInfo({ 
          ingredientId: ingredient.id, 
          newPrice, 
          oldPrice: ingredient.price, 
          ingredientName: ingredient.name,
          affectedProducts: affectedProducts,
      });
      handleCloseEditPriceDialog();
    } else {
      handleCloseEditPriceDialog();
    }
  };

  const confirmPriceChange = () => {
    if (priceChangeInfo) {
      updateIngredientPrice(priceChangeInfo.ingredientId, priceChangeInfo.newPrice);
      setPriceChangeInfo(null);
    }
  };

  const handleAddIngredient = (ingredientId: string) => {
    if (currentRecipe.some(item => item.ingredientId === ingredientId)) return;
    
    setCurrentRecipe(prev => [...prev, { ingredientId, quantity: 0 }]);
    setAddIngredientOpen(false);
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setCurrentRecipe(prev => prev.filter(item => item.ingredientId !== ingredientId));
  };
  
  const totalCost = calculateCost(currentRecipe, ingredients);
  
  const availableIngredients = ingredients.filter(
      (ing) => !currentRecipe.some((item) => item.ingredientId === ing.id)
  );

  const isRecipeActive = (product.recipe && product.recipe.length > 0) || currentRecipe.length > 0;

  return (
    <div className="p-4">
        {!isRecipeActive && (
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
                        <span className="bg-background px-2 text-sm text-muted-foreground">VEYA</span>
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
            {currentRecipe.length > 0 ? (
                currentRecipe.map(recipeItem => {
                    const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
                    if (!ingredient) return null;
                    
                    const quantity = recipeItem?.quantity || 0;
                    
                    let costPerUnit = 0;
                    let recipeUnitLabel = '';

                    switch (ingredient.unit) {
                        case 'kg':
                            costPerUnit = ingredient.price / 1000;
                            recipeUnitLabel = 'gram';
                            break;
                        case 'gram':
                            costPerUnit = ingredient.price;
                            recipeUnitLabel = 'gram';
                            break;
                        case 'adet':
                            costPerUnit = ingredient.price;
                            recipeUnitLabel = 'adet';
                            break;
                        case 'TL':
                            costPerUnit = ingredient.price;
                            recipeUnitLabel = 'TL';
                            break;
                    }

                    const itemCost = costPerUnit * quantity;

                    return (
                    <TableRow key={ingredient.id}>
                        <TableCell className="font-medium align-top">
                           <div>{ingredient.name}</div>
                           <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>{formatCurrency(ingredient.price)} / {ingredient.unit}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditPriceDialog(ingredient)}>
                                    <Edit className="h-3 w-3"/>
                                </Button>
                           </div>
                        </TableCell>
                        <TableCell>
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
                        <TableCell className="text-right font-medium">
                            {formatCurrency(itemCost)}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveIngredient(ingredient.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    )
                })
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Bu ürüne malzeme ekleyerek reçete oluşturun.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
       <div className="mt-4">
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
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePriceChangeRequest(); }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCloseEditPriceDialog}>İptal</Button>
                    <Button onClick={handlePriceChangeRequest}>Güncelle ve Onayla</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!priceChangeInfo} onOpenChange={(open) => !open && setPriceChangeInfo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fiyat Değişikliği Onayı</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{priceChangeInfo?.ingredientName}</strong> malzemesinin birim fiyatını değiştirmek üzeresiniz.
                <br/><br/>
                Bu değişiklik, bu malzemeyi içeren <strong>tüm ürün reçetelerini</strong> etkileyecektir ve geri alınamaz.
                 {priceChangeInfo?.affectedProducts && priceChangeInfo.affectedProducts.length > 0 && (
                    <div className="mt-4">
                        <p className="font-medium">Etkilenecek diğer ürünler:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground max-h-24 overflow-y-auto bg-muted/50 p-2 rounded-md">
                            {priceChangeInfo.affectedProducts.map(name => <li key={name}>{name}</li>)}
                        </ul>
                    </div>
                 )}
                <br />
                Devam etmek istiyor musunuz?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPriceChange}>Onayla ve Değiştir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
