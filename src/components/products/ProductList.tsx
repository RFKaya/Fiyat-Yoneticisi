'use client';

import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductForm from './ProductForm';


type ProductListProps = {
  products: Product[];
  deleteProduct: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};


export default function ProductList({ products, deleteProduct, addProduct }: ProductListProps) {
  const [open, setOpen] = useState(false);

  const handleProductAdded = (product: Omit<Product, 'id'>) => {
    addProduct(product);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Ürünler</CardTitle>
          <CardDescription>
            Mevcut ürün kataloğunuz.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Ürün
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Ürün Ekle</DialogTitle>
            </DialogHeader>
            <ProductForm addProduct={handleProductAdded} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henüz ürün eklenmedi.
              </p>
            ) : (
              products.map((product) => (
                <Card key={product.id} className="bg-muted/40">
                  <CardHeader className="flex flex-row items-start justify-between py-3 px-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Ürünü Sil</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 text-sm">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-semibold">{formatCurrency(product.cost)}</p>
                        <p className="text-xs text-muted-foreground">Maliyet</p>
                      </div>
                      <div>
                        <p className="font-semibold">{formatCurrency(product.storePrice)}</p>
                        <p className="text-xs text-muted-foreground">Mağaza</p>
                      </div>
                      <div>
                        <p className="font-semibold">{formatCurrency(product.onlinePrice)}</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
