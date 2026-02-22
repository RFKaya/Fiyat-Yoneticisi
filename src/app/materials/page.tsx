'use client';

import React, { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import type { Ingredient, Product, Category } from '@/lib/types';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, GripVertical } from 'lucide-react';
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

const formSchema = z.object({
  name: z.string().min(1, { message: 'Malzeme adı zorunludur.' }),
  price: z.coerce.number().min(0, { message: 'Fiyat pozitif bir sayı olmalıdır.' }),
  unit: z.enum(['kg', 'gram', 'adet', 'TL'], { required_error: 'Birim seçimi zorunludur.'}),
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
    defaultValues: initialData || {
      name: '',
      price: '' as any,
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
              <FormControl><Input placeholder="Örn: Çiğ Köfte" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim Fiyatı (₺)</FormLabel>
              <FormControl><Input type="number" placeholder="120" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem>
              <FormLabel>Birim</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Birim seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="gram">gram</SelectItem>
                  <SelectItem value="adet">adet</SelectItem>
                  <SelectItem value="TL">TL</SelectItem>
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

function SortableIngredientRow({ ingredient, deleteIngredient, handleOpenForm }: { ingredient: Ingredient; deleteIngredient: (id: string) => void; handleOpenForm: (ingredient: Ingredient) => void; }) {
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

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-12 pl-4">
         <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
      </TableCell>
      <TableCell className="font-medium">{ingredient.name}</TableCell>
      <TableCell>
        {formatCurrency(ingredient.price)} / {ingredient.unit}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenForm(ingredient)}>
          <Edit className="h-4 w-4" />
          <span className="sr-only">Malzemeyi Düzenle</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteIngredient(ingredient.id)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Malzemeyi Sil</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function MaterialsPage() {
  const [appData, setAppData] = useState<AppData>({ products: [], ingredients: [], categories: [], margins: [], commissionRate: 15 });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = React.useRef(true);

  const { ingredients } = appData;
  const ingredientIds = React.useMemo(() => ingredients.map(i => i.id), [ingredients]);

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
        const sortedIngredients = (data.ingredients || []).sort((a: Ingredient, b: Ingredient) => (a.order ?? 0) - (b.order ?? 0));
        setAppData({...data, ingredients: sortedIngredients});
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
    if (editingIngredient) {
      setAppData((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((i) =>
          i.id === editingIngredient.id ? { ...editingIngredient, ...data } : i
        ),
      }));
    } else {
      setAppData((prev) => {
        const newOrder = prev.ingredients.length > 0 ? Math.max(...prev.ingredients.map(i => i.order)) + 1 : 0;
        return {
          ...prev,
          ingredients: [...prev.ingredients, { ...data, id: nanoid(), order: newOrder }],
        }
      });
    }
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
            <CardTitle>Malzeme Yönetimi</CardTitle>
            <CardDescription>
              Malzemelerinizi sürükleyip bırakarak sıralayın. Bu sıralama, ürün reçetelerindeki görünümü belirleyecektir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="font-semibold">Malzeme Adı</TableHead>
                      <TableHead className="font-semibold">Birim Fiyatı</TableHead>
                      <TableHead className="text-right font-semibold">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={ingredientIds} strategy={verticalListSortingStrategy}>
                    <TableBody>
                      {ingredients.length > 0 ? (
                        ingredients.map((ingredient) => (
                          <SortableIngredientRow
                            key={ingredient.id}
                            ingredient={ingredient}
                            deleteIngredient={deleteIngredient}
                            handleOpenForm={handleOpenForm}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Henüz malzeme eklenmemiş.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </Table>
              </div>
            </DndContext>
            <div className="mt-6 flex justify-center">
              <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Malzeme Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent onInteractOutside={handleCloseForm}>
                  <DialogHeader><DialogTitle>{editingIngredient ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Ekle'}</DialogTitle></DialogHeader>
                  <IngredientForm 
                    onSave={handleSaveIngredient} 
                    closeDialog={handleCloseForm} 
                    initialData={editingIngredient}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
