'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Ingredient, Product, Category, RecipeItem, Margin } from '@/lib/types';
import { pageMaterialsLogger as log } from '@/lib/logger';
import LoadingState from '@/components/layout/LoadingState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import { IngredientForm, SortableIngredientRow } from './components/IngredientComponents';

// Safely generate a unique ID
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

type AppData = {
  products: Product[];
  ingredients: Ingredient[];
  categories: Category[];
  margins: Margin[];
  platformCommissionRate: number;
  kdvRate: number;
  bankCommissionRate: number;
};

export default function MaterialsPage() {
  const [appData, setAppData] = useState<AppData>({ products: [], ingredients: [], categories: [], margins: [], platformCommissionRate: 15, kdvRate: 10, bankCommissionRate: 2.5 });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = React.useRef(true);

  const { ingredients, products } = appData;
  const sortedIngredients = useMemo(() => [...ingredients].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [ingredients]);
  const ingredientIds = React.useMemo(() => sortedIngredients.map(i => i.id), [sortedIngredients]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    log.info('Malzeme sayfası yükleniyor — veriler çekiliyor...');
    const timer = log.time('Malzeme verisi yükleme süresi');

    fetch('/api/data')
      .then((res) => {
        if (!res.ok) {
          log.error(`API yanıtı başarısız: ${res.status} ${res.statusText}`);
          throw new Error('Veri çekilemedi');
        }
        return res.json();
      })
      .then((data) => {
        timer.end();
        setAppData({
          products: data.products || [],
          ingredients: (data.ingredients || []).sort((a: Ingredient, b: Ingredient) => (a.order ?? 0) - (b.order ?? 0)),
          categories: data.categories || [],
          margins: data.margins || [],
          platformCommissionRate: data.platformCommissionRate ?? 15,
          kdvRate: data.kdvRate ?? 10,
          bankCommissionRate: data.bankCommissionRate ?? 2.5,
        });
        log.success('Malzeme verileri başarıyla yüklendi');
        setIsLoading(false);
      })
      .catch((error) => {
        timer.end();
        log.error('Malzeme verisi yükleme hatası!', { message: error.message });
        window.dispatchEvent(new CustomEvent('app-fetch-error', { detail: 'Veriler yüklenemedi.' }));
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
      const saveTimer = log.time('Malzeme otomatik kayıt süresi');

      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData),
      })
        .then((res) => {
          saveTimer.end();
          if (!res.ok) throw new Error('Kayıt başarısız');
          log.success('Malzeme verileri otomatik kaydedildi ✓');
        })
        .catch(error => {
          saveTimer.end();
          log.error('Malzeme otomatik kayıt hatası!', { message: error.message });
          window.dispatchEvent(new CustomEvent('app-fetch-error', { detail: 'Değişiklikler kaydedilemedi!' }));
        });
    }
  }, [appData, isLoading]);

  const handleSaveIngredient = (data: Omit<Ingredient, 'id' | 'order'>) => {
    setAppData((prev) => {
      if (editingIngredient) {
        return {
          ...prev,
          ingredients: prev.ingredients.map((i) =>
            i.id === editingIngredient.id ? { ...editingIngredient, ...data } as Ingredient : i
          ),
        }
      } else {
        const newOrder = prev.ingredients.length > 0 ? Math.max(...prev.ingredients.map(i => i.order ?? -1)) + 1 : 0;
        return {
          ...prev,
          ingredients: [...prev.ingredients, { ...data, id: generateId(), order: newOrder } as Ingredient],
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
      products: prev.products.map(p => p.id === productId ? { ...p, recipe: newRecipe } : p)
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
          ingredients: reordered.map((item, index) => ({ ...item, order: index }))
        };
      });
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {isLoading && <LoadingState fullPage={true} />}
      <main className="flex-1 w-full max-w-[1950px] mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Malzeme Yönetimi</h2>
            <p className="text-muted-foreground mt-1">Malzemeleri sürükleyip bırakarak sıralayın, detaylarını açarak ürün reçetelerini yönetin.</p>
          </div>
          <Button onClick={() => handleOpenForm()} className="h-10 px-6 font-semibold shadow-indigo-500/20">
            <PlusCircle className="mr-2 h-5 w-5" /> Yeni Malzeme Ekle
          </Button>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogContent onInteractOutside={handleCloseForm} className="max-w-2xl glass-panel border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{editingIngredient ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Ekle'}</DialogTitle>
              <DialogDescription>Malzeme bilgilerini güncelleyin veya yeni bir tane ekleyin.</DialogDescription>
            </DialogHeader>
            <IngredientForm
              onSave={handleSaveIngredient}
              closeDialog={handleCloseForm}
              initialData={editingIngredient}
            />
          </DialogContent>
        </Dialog>

        <div className="glass-panel overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full" />
              Malzeme Listesi
            </h3>
            {ingredients.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ingredientIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
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
              <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <p className="text-lg">Henüz malzeme eklenmemiş.</p>
                <Button variant="link" onClick={() => handleOpenForm()}>İlk malzemeyi hemen ekleyin</Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
