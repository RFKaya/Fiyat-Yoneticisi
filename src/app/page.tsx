'use client';

import { useState } from 'react';
import type { Product, ComparisonTable } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { nanoid } from 'nanoid';

import Header from '@/components/layout/Header';
import ProductForm from '@/components/products/ProductForm';
import ProductList from '@/components/products/ProductList';
import ProfitCalculator from '@/components/calculator/ProfitCalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [products, setProducts] = useLocalStorage<Product[]>('fiyatvizyon-products', []);
  const [comparisonTables, setComparisonTables] = useState<ComparisonTable[]>([]);

  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((prev) => [...prev, { ...product, id: nanoid() }]);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    // Also remove any comparison tables associated with the deleted product
    setComparisonTables((prev) => prev.filter((t) => t.productId !== id));
  };

  const addComparisonTable = (productId: string) => {
    setComparisonTables((prev) => [...prev, { id: nanoid(), productId }]);
  };

  const deleteComparisonTable = (id: string) => {
    setComparisonTables((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <ProductForm addProduct={addProduct} />
            <ProductList products={products} deleteProduct={deleteProduct} />
          </div>
          <div className="lg:col-span-2">
            <ProfitCalculator
              products={products}
              comparisonTables={comparisonTables}
              addTable={addComparisonTable}
              deleteTable={deleteComparisonTable}
            />
          </div>
        </div>
        {products.length === 0 && (
           <div className="lg:col-span-3 mt-8">
             <Card>
               <CardHeader>
                 <CardTitle>Başlarken</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-muted-foreground">
                  Fiyatlandırma stratejilerinizi analiz etmeye başlamak için lütfen ilk ürününüzü ekleyin. Ürünü ekledikten sonra, farklı kar marjlarına dayalı satış fiyatlarını hesaplamak için karşılaştırma tabloları oluşturabilirsiniz.
                 </p>
               </CardContent>
             </Card>
           </div>
         )}
      </main>
    </div>
  );
}
