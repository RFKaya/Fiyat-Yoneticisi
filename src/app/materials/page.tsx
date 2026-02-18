'use client';

import React, { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import type { Ingredient, Unit, Product, Category } from '@/lib/types';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const unitOptions: Unit[] = ['gram', 'adet', 'TL'];

const formSchema = z.object({
  name: z.string().min(1, { message: 'Malzeme adı zorunludur.' }),
  price: z.coerce.number().positive({ message: 'Fiyat pozitif bir sayı olmalıdır.' }),
  unit: z.enum(['gram', 'adet', 'TL'], { required_error: 'Birim seçimi zorunludur.' }),
});

function IngredientForm({ onAddIngredient, closeDialog }: { onAddIngredient: (data: Omit<Ingredient, 'id'>) => void, closeDialog: () => void }) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            price: '' as any,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        onAddIngredient(values);
        form.reset();
        closeDialog();
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Malzeme Adı</FormLabel>
                        <FormControl><Input placeholder="Örn: Domates" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fiyat (₺)</FormLabel>
                            <FormControl><Input type="number" placeholder="25.50" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Birim</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Birim Seçin" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {unitOptions.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <Button type="submit" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Malzeme Ekle
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

export default function MaterialsPage() {
  const [appData, setAppData] = useState<AppData>({ products: [], ingredients: [], categories: [], margins: [] });
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
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
        if(!isLoading) {
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

  const addIngredient = (ingredient: Omit<Ingredient, 'id'>) => {
    setAppData((prev) => ({...prev, ingredients: [...prev.ingredients, { ...ingredient, id: nanoid() }]}));
  };

  const deleteIngredient = (id: string) => {
    setAppData((prev) => ({...prev, ingredients: prev.ingredients.filter((i) => i.id !== id)}));
  };
  
  const updateIngredient = (id: string, field: keyof Ingredient, value: string | number) => {
      const finalValue = field === 'name' || field === 'unit' ? value : (isNaN(parseFloat(String(value))) ? '' : parseFloat(String(value)));
      setAppData((prev) => ({
          ...prev,
          ingredients: prev.ingredients.map((i) => 
            i.id === id ? { ...i, [field]: finalValue } : i
          )
      }));
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
                    <TableHead className="text-right font-semibold">Fiyat</TableHead>
                    <TableHead className="text-right font-semibold">Birim</TableHead>
                    <TableHead className="text-right font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.length > 0 ? (
                    ingredients.map((ingredient) => (
                      <TableRow key={ingredient.id}>
                        <TableCell>
                           <Input value={ingredient.name} onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)} className="font-medium border-0 bg-transparent -ml-3 focus-visible:ring-1 focus-visible:bg-card" placeholder="Malzeme Adı"/>
                        </TableCell>
                        <TableCell>
                           <Input type="number" value={ingredient.price || ''} onChange={(e) => updateIngredient(ingredient.id, 'price', e.target.value)} className="text-right" placeholder="0.00"/>
                        </TableCell>
                        <TableCell className="text-right">{ingredient.unit}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteIngredient(ingredient.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Malzemeyi Sil</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
              <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Malzeme Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Yeni Malzeme Ekle</DialogTitle></DialogHeader>
                  <IngredientForm onAddIngredient={addIngredient} closeDialog={() => setAddDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
