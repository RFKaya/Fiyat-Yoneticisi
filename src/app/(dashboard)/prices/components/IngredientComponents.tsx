import React, { useState, useMemo } from 'react';
import type { Ingredient, Product, RecipeItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, GripVertical, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency, cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Malzeme adı zorunludur.' }),
  price: z.coerce.number().optional(),
  unit: z.enum(['kg', 'gram', 'adet']).optional(),
});

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
              <FormControl><Input {...field} className="glass-panel" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim Fiyatı (₺) (İsteğe Bağlı)</FormLabel>
              <FormControl><Input type="number" placeholder="120" {...field} value={field.value ?? ''} className="glass-panel" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim (İsteğe Bağlı)</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === 'clear' ? undefined : value)} value={field.value ?? 'clear'}>
                <FormControl>
                  <SelectTrigger className="glass-panel">
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
        <Button type="submit" className="w-full font-bold h-11">
          {initialData ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {initialData ? 'Malzemeyi Güncelle' : 'Malzemeyi Kaydet'}
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
  const [searchQuery, setSearchQuery] = useState('');

  const productsWithIngredient = useMemo(() =>
    products.filter(p => p.recipe.some(item => item.ingredientId === ingredient.id)),
    [products, ingredient.id]
  );

  const productsWithoutIngredient = useMemo(() =>
    products.filter(p => 
      !p.recipe.some(item => item.ingredientId === ingredient.id) &&
      (p.name.toLocaleLowerCase('tr').includes(searchQuery.toLocaleLowerCase('tr')))
    ),
    [products, ingredient.id, searchQuery]
  );

  const handleQuantityChange = (productId: string, quantityStr: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const quantity = parseFloat(quantityStr.replace(',', '.'));
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-4">
      <div className="space-y-4">
        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-2 h-4 bg-primary rounded-full" />
          Kullanılan Ürünler ({productsWithIngredient.length})
        </h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {productsWithIngredient.length > 0 ? productsWithIngredient.map(product => {
            const recipeItem = product.recipe.find(item => item.ingredientId === ingredient.id);
            return (
              <div key={product.id} className="group flex items-center justify-between gap-3 p-3 bg-muted/30 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors">
                <span className="text-sm font-semibold truncate">{product.name}</span>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Input
                      type="number"
                      className="w-24 h-9 text-right pr-12 font-bold"
                      defaultValue={recipeItem?.quantity || ''}
                      onBlur={(e) => handleQuantityChange(product.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase pointer-events-none">{unitLabel}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg" onClick={() => handleRemoveFromRecipe(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          }) : (
            <div className="h-32 flex flex-col items-center justify-center border border-dashed rounded-xl text-muted-foreground text-sm italic">
              Bu malzeme henüz hiçbir üründe kullanılmıyor.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-4 bg-muted-foreground/30 rounded-full" />
            Diğer Ürünlere Ekle
          </h4>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Ürün ara..." 
              className="h-8 pl-8 text-xs bg-muted/20 border-none" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {productsWithoutIngredient.length > 0 ? productsWithoutIngredient.map(product => (
            <div key={product.id} className="flex items-center justify-between gap-3 p-3 bg-card border border-border/30 rounded-xl hover:border-primary/30 transition-all group">
              <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{product.name}</span>
              <Button size="sm" variant="ghost" className="h-8 hover:bg-primary/10 hover:text-primary rounded-lg font-bold text-xs" onClick={() => handleAddToRecipe(product.id)}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" /> Ekle
              </Button>
            </div>
          )) : (
            <div className="h-32 flex items-center justify-center border border-dashed rounded-xl text-muted-foreground text-sm italic">
              {searchQuery ? 'Eşleşen ürün bulunamadı.' : 'Tüm ürünlerde kullanılıyor.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SortableIngredientRow({ 
  ingredient, 
  products, 
  onRecipeChange, 
  deleteIngredient, 
  handleOpenForm,
  updateIngredientPrice 
}: {
  ingredient: Ingredient;
  products: Product[];
  onRecipeChange: (productId: string, newRecipe: RecipeItem[]) => void;
  deleteIngredient: (id: string) => void;
  handleOpenForm: (ingredient: Ingredient) => void;
  updateIngredientPrice: (id: string, price: number) => void;
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

  const hasPrice = ingredient.price !== undefined && ingredient.unit;

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "group relative border border-border/40 rounded-2xl bg-card/40 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 overflow-hidden",
      isOpen && "border-primary/30 bg-card/90 shadow-lg shadow-primary/5"
    )}>
      {/* Decorative vertical bar */}
      <div className={cn(
        "absolute inset-y-0 left-0 w-1 transition-colors",
        isOpen ? "bg-primary" : "bg-primary/20 group-hover:bg-primary/50"
      )} />

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center p-3 sm:p-4 gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab shrink-0 text-muted-foreground/50 hover:text-primary transition-colors" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5" />
          </Button>

          <div className="flex-grow min-w-0">
            <h5 className="font-bold text-foreground truncate text-base">{ingredient.name}</h5>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-tighter border border-border/50">
                {ingredient.unit || 'BİRİMSİZ'}
              </span>
              <span className="text-xs text-muted-foreground italic">
                {products.filter(p => p.recipe.some(item => item.ingredientId === ingredient.id)).length} ürün kullanıyor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group/price hidden sm:flex items-center">
               <Input
                type="number"
                className="w-28 h-10 text-right pr-8 font-black text-lg bg-muted/20 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                defaultValue={ingredient.price}
                onBlur={(e) => {
                  const newPrice = parseFloat(e.target.value.replace(',', '.'));
                  if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== ingredient.price) {
                    updateIngredientPrice(ingredient.id, newPrice);
                  } else {
                    e.target.value = String(ingredient.price || '');
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
              <span className="absolute right-3 font-bold text-sm text-primary/40 group-hover/price:text-primary transition-colors">₺</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors rounded-lg" onClick={(e) => { e.stopPropagation(); handleOpenForm(ingredient) }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg" onClick={(e) => { e.stopPropagation(); deleteIngredient(ingredient.id) }}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted transition-colors">
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>
        
        <CollapsibleContent className="px-4 pb-6 sm:px-6">
          <Separator className="bg-border/30 mb-6" />
          <IngredientUsageManager ingredient={ingredient} products={products} onRecipeChange={onRecipeChange} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
