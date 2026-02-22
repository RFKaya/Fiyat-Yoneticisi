'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { nanoid } from 'nanoid';
import type { Ingredient, Product, Category, RecipeItem } from '@/lib/types';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, GripVertical, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Malzeme adı zorunludur.' }),
  price: z.coerce.number().optional(),
  unit: z.enum(['kg', 'gram', 'adet']).optional(),
}).refine(data => {
    if (data.price !== undefined && data.price !== null && data.price >= 0) {
        return !!data.unit;
    }
    return true;
}, {
    message: "Fiyat girildiğinde birim seçimi zorunludur.",
    path: ["unit"],
});

function IngredientForm({
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
        unit: initialData.unit,
    } : {
      name: '',
      price: undefined,
      unit: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave: Omit<Ingredient, 'id'|'order'> = { name: values.name };
    if (values.price !== undefined && values.unit) {
        dataToSave.price = values.price;
        dataToSave.unit = values.unit;
    }
    onSave(dataToSave);
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
          )}/>
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim (İsteğe Bağlı)</FormLabel>
               <Select onValueChange={(value) => field.onChange(value === 'clear' ? undefined : value)} value={field.value}>
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
          )}/>
        </div>
        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Malzemeyi Kaydet
        </Button>
      </form>
    </Form>
  );
}

type AppData = {
  products: Product[];
  ingredients: Ingredient[];
  categories: Category[];
  margins: number[];
  commissionRate: number;
};

const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) return '...';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
};


function IngredientUsageManager({
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
                                <PlusCircle className="mr-2 h-4 w-4"/> Ekle
                            </Button>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
}

function SortableIngredientRow({ ingredient, products, onRecipeChange, deleteIngredient, handleOpenForm }: { 
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleOpenForm(ingredient)}}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteIngredient(ingredient.id)}}>
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

export default function MaterialsPage() {
  const [appData, setAppData] = useState<AppData>({ products: [], ingredients: [], categories: [], margins: [], commissionRate: 15 });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = React.useRef(true);

  const { ingredients, products } = appData;
  const sortedIngredients = useMemo(() => ingredients.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [ingredients]);
  const ingredientIds = React.useMemo(() => sortedIngredients.map(i => i.id), [sortedIngredients]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((data) => {
        setAppData({
            products: data.products || [],
            ingredients: (data.ingredients || []).sort((a: Ingredient, b: Ingredient) => (a.order ?? 0) - (b.order ?? 0)),
            categories: data.categories || [],
            margins: data.margins || [],
            commissionRate: data.commissionRate || 15,
        });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load data:', error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      if (!isLoading) {
        isInitialMount.current = false;
      }
      return;
    }

    if (!isLoading) {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData),
      }).catch(error => console.error('Failed to save data:', error));
    }
  }, [appData, isLoading]);

  const handleSaveIngredient = (data: Omit<Ingredient, 'id' | 'order'>) => {
    setAppData((prev) => {
        if (editingIngredient) {
            return {
                ...prev,
                ingredients: prev.ingredients.map((i) =>
                i.id === editingIngredient.id ? { ...editingIngredient, ...data } : i
                ),
            }
        } else {
            const newOrder = prev.ingredients.length > 0 ? Math.max(...prev.ingredients.map(i => i.order ?? -1)) + 1 : 0;
            return {
                ...prev,
                ingredients: [...prev.ingredients, { ...data, id: nanoid(), order: newOrder }],
            }
        }
    });
  };
  
  const handleOpenForm = (ingredient?: Ingredient) => {
      setEditingIngredient(ingredient);
      setFormOpen(true);
  }

  const handleCloseForm = () => {
      setEditingIngredient(undefined);
      setFormOpen(false);
  }

  const deleteIngredient = (id: string) => {
    setAppData((prev) => ({ ...prev, ingredients: prev.ingredients.filter((i) => i.id !== id) }));
  };

  const handleRecipeChange = (productId: string, newRecipe: RecipeItem[]) => {
    setAppData(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === productId ? {...p, recipe: newRecipe} : p)
    }));
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAppData((prev) => {
        const oldIndex = prev.ingredients.findIndex((item) => item.id === active.id);
        const newIndex = prev.ingredients.findIndex((item) => item.id === over.id);
        
        const reordered = arrayMove(prev.ingredients, oldIndex, newIndex);
        
        return {
            ...prev,
            ingredients: reordered.map((item, index) => ({...item, order: index}))
        };
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Veriler yükleniyor...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Malzeme Yönetimi</CardTitle>
                    <CardDescription>
                    Malzemeleri sürükleyip bırakarak sıralayın, detaylarını açarak ürün reçetelerini yönetin.
                    </CardDescription>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Yeni Malzeme Ekle
                    </Button>
                    </DialogTrigger>
                    <DialogContent onInteractOutside={handleCloseForm} className="max-w-2xl">
                    <DialogHeader><DialogTitle>{editingIngredient ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Ekle'}</DialogTitle></DialogHeader>
                    <IngredientForm 
                        onSave={handleSaveIngredient} 
                        closeDialog={handleCloseForm} 
                        initialData={editingIngredient}
                    />
                    </DialogContent>
                </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {ingredients.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={ingredientIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                        {sortedIngredients.map((ingredient) => (
                            <SortableIngredientRow
                                key={ingredient.id}
                                ingredient={ingredient}
                                products={products}
                                onRecipeChange={handleRecipeChange}
                                deleteIngredient={deleteIngredient}
                                handleOpenForm={handleOpenForm}
                            />
                        ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="h-24 flex items-center justify-center text-center text-muted-foreground">
                    Henüz malzeme eklenmemiş.
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
