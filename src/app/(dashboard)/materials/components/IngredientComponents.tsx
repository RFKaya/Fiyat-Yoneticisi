import React, { useState, useMemo } from 'react';
import type { Ingredient, Product, RecipeItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, GripVertical, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Separator = ({ className }: { className?: string }) => <div className={`h-[1px] w-full bg-border ${className}`} />;

const formSchema = z.object({
  name: z.string().min(1, { message: 'Malzeme adı zorunludur.' }),
  price: z.coerce.number().optional(),
  unit: z.enum(['kg', 'gram', 'adet']).optional(),
});

export const formatCurrency = (amount: number) => {
  if (isNaN(amount) || !isFinite(amount)) return '...';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function IngredientForm({
  onSave,
  closeDialog,
  initialData,
}: {
  onSave: (data: Omit<Ingredient, 'id' | 'order'>) => void;
  closeDialog: () => void;
  initialData?: Omit<Ingredient, 'id' | 'order'>;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      price: initialData.price,
      unit: initialData.unit as any,
    } : {
      name: '',
      price: undefined,
      unit: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
    form.reset();
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Malzeme Adı</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim Fiyatı (₺) (İsteğe Bağlı)</FormLabel>
              <FormControl><Input type="number" placeholder="120" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim (İsteğe Bağlı)</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === 'clear' ? undefined : value)} value={field.value ?? 'clear'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Birim seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="clear">Birim Yok</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="gram">gram</SelectItem>
                  <SelectItem value="adet">adet</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Malzemeyi Kaydet
        </Button>
      </form>
    </Form>
  );
}

export function IngredientUsageManager({
  ingredient,
  products,
  onRecipeChange,
}: {
  ingredient: Ingredient;
  products: Product[];
  onRecipeChange: (productId: string, newRecipe: RecipeItem[]) => void;
}) {
  const productsWithIngredient = useMemo(() =>
    products.filter(p => p.recipe.some(item => item.ingredientId === ingredient.id)),
    [products, ingredient.id]
  );

  const productsWithoutIngredient = useMemo(() =>
    products.filter(p => !p.recipe.some(item => item.ingredientId === ingredient.id)),
    [products, ingredient.id]
  );

  const handleQuantityChange = (productId: string, quantityStr: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const quantity = parseFloat(quantityStr);
    const newRecipe = product.recipe.map(item =>
      item.ingredientId === ingredient.id ? { ...item, quantity: isNaN(quantity) ? 0 : quantity } : item
    );
    onRecipeChange(productId, newRecipe);
  };

  const handleRemoveFromRecipe = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newRecipe = product.recipe.filter(item => item.ingredientId !== ingredient.id);
    onRecipeChange(productId, newRecipe);
  };

  const handleAddToRecipe = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newRecipe = [...product.recipe, { ingredientId: ingredient.id, quantity: 1 }];
    onRecipeChange(productId, newRecipe);
  };

  let unitLabel = '';
  if (ingredient.unit) {
    switch (ingredient.unit) {
      case 'kg': unitLabel = 'gram'; break;
      case 'gram': unitLabel = 'gram'; break;
      case 'adet': unitLabel = 'adet'; break;
    }
  } else {
    unitLabel = 'TL';
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <div>
        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Bu Malzemeyi Kullanan Ürünler</h4>
        <div className="space-y-2">
          {productsWithIngredient.length > 0 ? productsWithIngredient.map(product => {
            const recipeItem = product.recipe.find(item => item.ingredientId === ingredient.id);
            return (
              <div key={product.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                <span className="text-sm font-medium flex-grow truncate">{product.name}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24 h-8 text-right"
                    value={recipeItem?.quantity || ''}
                    onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground w-10">{unitLabel}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveFromRecipe(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          }) : <p className="text-sm text-center text-muted-foreground p-4">Bu malzeme henüz hiçbir üründe kullanılmıyor.</p>}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Diğer Ürünler</h4>
        <div className="space-y-2">
          {productsWithoutIngredient.map(product => (
            <div key={product.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
              <span className="text-sm font-medium flex-grow truncate">{product.name}</span>
              <Button size="sm" variant="outline" onClick={() => handleAddToRecipe(product.id)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ekle
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SortableIngredientRow({ ingredient, products, onRecipeChange, deleteIngredient, handleOpenForm }: {
  ingredient: Ingredient;
  products: Product[];
  onRecipeChange: (productId: string, newRecipe: RecipeItem[]) => void;
  deleteIngredient: (id: string) => void;
  handleOpenForm: (ingredient: Ingredient) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ingredient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const priceText = ingredient.price !== undefined && ingredient.unit
    ? `${formatCurrency(ingredient.price)} / ${ingredient.unit}`
    : 'Birim fiyatı yok (Reçetede TL olarak belirtilir)';

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center p-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="flex-grow ml-2">
            <p className="font-medium">{ingredient.name}</p>
            <p className="text-sm text-muted-foreground">{priceText}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleOpenForm(ingredient) }}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteIngredient(ingredient.id) }}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="p-4 pt-2">
          <Separator className="mb-4" />
          <IngredientUsageManager ingredient={ingredient} products={products} onRecipeChange={onRecipeChange} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
