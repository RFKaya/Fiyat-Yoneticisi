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
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Malzeme adı zorunludur.' }),
  purchasePrice: z.coerce.number().positive({ message: 'Fiyat pozitif bir sayı olmalıdır.' }),
  purchaseQty: z.coerce.number().positive({ message: 'Miktar pozitif bir sayı olmalıdır.' }),
  purchaseUnit: z.string().min(1, { message: 'Alış birimi zorunludur.'}),
  recipeUnit: z.string().min(1, { message: 'Reçete birimi zorunludur.'}),
  recipeUnitsPerPurchaseUnit: z.coerce.number().positive({ message: 'Dönüşüm faktörü pozitif bir sayı olmalıdır.' }),
});

function IngredientForm({
  onSave,
  closeDialog,
  initialData,
}: {
  onSave: (data: Omit<Ingredient, 'id'>) => void;
  closeDialog: () => void;
  initialData?: Omit<Ingredient, 'id'>;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      purchasePrice: '' as any,
      purchaseQty: 1,
      purchaseUnit: '',
      recipeUnit: '',
      recipeUnitsPerPurchaseUnit: '' as any,
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
              <FormControl><Input placeholder="Örn: Lavaş" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="purchasePrice" render={({ field }) => (
            <FormItem>
              <FormLabel>Alış Fiyatı (₺)</FormLabel>
              <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="purchaseQty" render={({ field }) => (
            <FormItem>
              <FormLabel>Alış Miktarı</FormLabel>
              <FormControl><Input type="number" placeholder="1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="purchaseUnit" render={({ field }) => (
            <FormItem>
              <FormLabel>Alış Birimi</FormLabel>
              <FormControl><Input placeholder="Paket, Kg, Kasa" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField control={form.control} name="recipeUnit" render={({ field }) => (
            <FormItem>
              <FormLabel>Reçete Birimi</FormLabel>
              <FormControl><Input placeholder="Adet, Gram, Yaprak" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="recipeUnitsPerPurchaseUnit" render={({ field }) => (
            <FormItem>
              <FormLabel>Dönüşüm Oranı</FormLabel>
              <FormControl><Input type="number" placeholder="50" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
         <DialogDescription className="text-xs pt-2">
            <b>Örnek:</b> 50'li bir lavaş paketini 100₺'ye alıyorsanız girmeniz gerekenler:
            <br />
            Alış Fiyatı: 100, Alış Miktarı: 1, Alış Birimi: Paket, Reçete Birimi: Adet, Dönüşüm Oranı: 50.
            <br />
            Böylece sistem 1 adet lavaşın maliyetini 2₺ olarak hesaplar.
        </DialogDescription>
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

export default function MaterialsPage() {
  const [appData, setAppData] = useState<AppData>({ products: [], ingredients: [], categories: [], margins: [] });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = React.useRef(true);

  const { ingredients } = appData;

  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((data) => {
        setAppData(data);
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

  const handleSaveIngredient = (data: Omit<Ingredient, 'id'>) => {
    if (editingIngredient) {
      setAppData((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((i) =>
          i.id === editingIngredient.id ? { ...i, ...data } : i
        ),
      }));
    } else {
      setAppData((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, { ...data, id: nanoid() }],
      }));
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
              Ürün maliyetlerinizi hesaplamak için kullandığınız hammaddeleri ve birim fiyatlarını yönetin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Malzeme Adı</TableHead>
                    <TableHead className="font-semibold">Birim Maliyet</TableHead>
                    <TableHead className="font-semibold">Alış Bilgisi</TableHead>
                    <TableHead className="text-right font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.length > 0 ? (
                    ingredients.map((ingredient) => {
                      const pricePerPurchaseUnit = ingredient.purchasePrice / ingredient.purchaseQty;
                      const costPerRecipeUnit = pricePerPurchaseUnit / ingredient.recipeUnitsPerPurchaseUnit;

                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell className="font-medium">{ingredient.name}</TableCell>
                           <TableCell>
                            {formatCurrency(costPerRecipeUnit)} / {ingredient.recipeUnit}
                           </TableCell>
                          <TableCell>
                            {ingredient.purchaseQty} {ingredient.purchaseUnit} @ {formatCurrency(ingredient.purchasePrice)}
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
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Henüz malzeme eklenmemiş.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
