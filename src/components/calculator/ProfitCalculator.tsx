'use client';

import { useState } from 'react';
import type { Product, ComparisonTable } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import ProfitTable from './ProfitTable';

type ProfitCalculatorProps = {
  products: Product[];
  comparisonTables: ComparisonTable[];
  addTable: (productId: string) => void;
  deleteTable: (id: string) => void;
};

export default function ProfitCalculator({
  products,
  comparisonTables,
  addTable,
  deleteTable,
}: ProfitCalculatorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const handleAddTable = () => {
    if (selectedProductId) {
      addTable(selectedProductId);
    }
  };
  
  const getProductById = (id: string) => products.find(p => p.id === id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kâr Analizi</CardTitle>
        <CardDescription>
          Farklı kâr marjlarına göre fiyatlandırma senaryoları oluşturun ve karşılaştırın.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 border rounded-lg bg-muted/40">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1 bg-background">
              <SelectValue placeholder="Analiz için bir ürün seçin" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddTable} disabled={!selectedProductId} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Karşılaştırma Tablosu Ekle
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {comparisonTables.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-10">
              <p>Karşılaştırma yapmak için bir ürün seçip tablo ekleyin.</p>
            </div>
          ) : (
            comparisonTables.map((table) => {
              const product = getProductById(table.productId);
              return product ? (
                <ProfitTable
                  key={table.id}
                  product={product}
                  onDelete={() => deleteTable(table.id)}
                />
              ) : null;
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
