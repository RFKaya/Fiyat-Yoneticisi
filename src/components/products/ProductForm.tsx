'use client';

import type { Product, Category } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Ürün adı en az 2 karakter olmalıdır.' }),
  storePrice: z.coerce.number().positive({ message: 'Mağaza fiyatı pozitif bir sayı olmalıdır.' }),
  onlinePrice: z.coerce.number().positive({ message: 'Online fiyat pozitif bir sayı olmalıdır.' }),
  categoryId: z.string().optional(),
});

type ProductFormProps = {
  addProduct: (product: Omit<Product, 'id' | 'recipe' | 'order'>) => void;
  categories: Category[];
};

export default function ProductForm({ addProduct, categories }: ProductFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      storePrice: '' as any,
      onlinePrice: '' as any,
      categoryId: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addProduct(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ürün Adı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: Çiğ Köfte Dürüm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="storePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mağaza Fiyatı</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="250" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="onlinePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Online Fiyat</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="220" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin (isteğe bağlı)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Ürün Ekle
        </Button>
      </form>
    </Form>
  );
}
