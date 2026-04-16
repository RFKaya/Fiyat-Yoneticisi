'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Product, RecipeItem, Ingredient, Category, Margin } from '@/lib/types';
import { calculateCost, calculateEconomicsFromPrice, calculateEconomicsFromMargin, formatCurrency } from '@/lib/utils';
import { pageHomeLogger as log } from '@/lib/logger';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import LoadingState from '@/components/layout/LoadingState';
import ProductForm from './components/ProductForm';
import InlineRecipeEditor from './components/InlineRecipeEditor';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Trash2, X, Tags, Check, GripVertical, MoreVertical, ChevronDown, ChevronUp, Percent } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';




const categoryColors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];

// Safely generate a unique ID, falling back if crypto.randomUUID is not available
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

function MarginEditPopover({
  margin,
  onSave,
  trigger,
}: {
  margin?: Margin;
  onSave: (marginData: Partial<Margin>) => void;
  trigger: React.ReactNode;
}) {
  const [value, setValue] = useState(margin?.value.toString() || '');
  const [name, setName] = useState(margin?.name || '');
  const [commission, setCommission] = useState(margin?.commissionRate?.toString() || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && margin) {
      setValue(margin.value.toString());
      setName(margin.name || '');
      setCommission(margin.commissionRate?.toString() || '');
    }
  }, [isOpen, margin]);

  const handleSave = () => {
    const numericValue = parseFloat(value);
    const numericCommission = parseFloat(commission);

    // For Store margins, value can be 0 (default) as it's defined per category
    onSave({
      value: !isNaN(numericValue) ? numericValue : 0,
      name: name.trim() || undefined,
      commissionRate: !isNaN(numericCommission) ? numericCommission : null,
    });
    if (!margin) {
      setValue('');
      setName('');
      setCommission('');
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 glass-panel border-none shadow-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="grid gap-4">
          <div className="space-y-1">
            <h4 className="font-bold leading-none">
              {margin ? 'Kolonu Düzenle' : 'Yeni Satış Kolonu'}
            </h4>
            <p className="text-xs text-muted-foreground">
              Bu kolon tüm kategorilerde görünecek, ancak kâr oranlarını her kategori için ayrı belirleyeceksiniz.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="margin-name" className="text-xs font-semibold">Kolon/Platform İsmi</Label>
              <Input
                id="margin-name"
                placeholder="Örn: Kampanyalı, Özel..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button onClick={handleSave} size="sm" className="w-full font-bold">
            {margin ? 'Güncelle' : 'Kolon Ekle'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EconomicsTooltipContent({
  title,
  revenue,
  vat,
  commission,
  commissionRate,
  stopaj,
  stopajRate,
  cost,
  netProfit,
  profitPercentage,
  profitOverCostPercentage,
  kdvRate,
  isCalculable = true,
  headerLabel
}: {
  title: string;
  revenue: number;
  vat: number;
  commission: number;
  commissionRate?: number;
  stopaj: number;
  stopajRate?: number;
  cost: number;
  netProfit: number;
  profitPercentage: number;
  profitOverCostPercentage: number;
  kdvRate?: number;
  isCalculable?: boolean;
  headerLabel?: string;
}) {
  return (
    <TooltipContent align="start" side="bottom" sideOffset={5} className="z-[100] max-w-xs">
      {isCalculable ? (
        <div className="p-2 space-y-1 text-xs w-64">
          {headerLabel && <div className="font-bold border-b border-border/50 pb-1 mb-2 text-primary">{headerLabel}</div>}
          <div className="flex justify-between">
            <span className={headerLabel ? "text-muted-foreground" : ""}>{title}</span>
            <span className="font-medium">{formatCurrency(revenue)}</span>
          </div>
          <Separator className="my-1 bg-border/50" />
          <div className="flex justify-between text-muted-foreground">
            <span>{kdvRate !== undefined ? `KDV Tutarı (%${kdvRate})` : 'KDV Tutarı'}</span>
            <span className="text-destructive">- {formatCurrency(vat)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Komisyon {(commissionRate !== undefined && commissionRate !== null) ? `(%${commissionRate.toFixed(2)})` : ''}</span>
            <span className="text-destructive">- {formatCurrency(commission)}</span>
          </div>
          {stopaj > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Stopaj {(stopajRate !== undefined && stopajRate !== null) ? `(%${stopajRate})` : ''}</span>
              <span className="text-destructive">- {formatCurrency(stopaj)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Ürün Maliyeti</span>
            <span className="text-destructive">- {formatCurrency(cost)}</span>
          </div>
          <div className="border-t border-border/50 pt-1 mt-1 space-y-0.5">
            <div className="flex justify-between font-bold">
              <span>Net Kâr</span>
              <span className="text-green-500">{formatCurrency(netProfit)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground italic">
              <span>Maliyete Göre Kâr:</span>
              <span>%{profitOverCostPercentage.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground italic">
              <span>Ciroya Göre Kâr:</span>
              <span>%{profitPercentage.toFixed(1)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs">Marj, maliyet için çok yüksek.</p>
      )}
    </TooltipContent>
  );
}

function MarginDisplay({ marginData, colorStyle }: { marginData: { percentage: number, totalRevenue: number, totalProfit: number, totalCost: number, totalVat: number, totalCommission: number, totalStopaj: number } | null, colorStyle?: any }) {
  if (!marginData) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter cursor-default hover:text-primary transition-colors">
            Ort. Kâr: <span className="font-bold text-foreground" style={colorStyle}>%{marginData.percentage.toFixed(1)}</span>
          </span>
        </TooltipTrigger>
        <EconomicsTooltipContent
          title="Toplam Beklenen Ciro"
          revenue={marginData.totalRevenue}
          vat={marginData.totalVat}
          commission={marginData.totalCommission}
          stopaj={marginData.totalStopaj}
          cost={marginData.totalCost}
          netProfit={marginData.totalProfit}
          profitOverCostPercentage={marginData.percentage}
          profitPercentage={(marginData.totalProfit / marginData.totalRevenue) * 100}
          headerLabel="Ciroya Göre Hesaplanmıştır"
        />
      </Tooltip>
    </TooltipProvider>
  );
}

const HeaderColumnLabel = React.forwardRef<HTMLDivElement, { title: string, subtitle: string }>(
  ({ title, subtitle, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className="cursor-pointer hover:text-primary transition-colors flex flex-col overflow-hidden"
      >
        <span className="truncate font-bold">{title}</span>
        {subtitle && (
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5 uppercase tracking-tighter truncate">
            {subtitle}
          </span>
        )}
      </div>
    );
  }
);
HeaderColumnLabel.displayName = 'HeaderColumnLabel';

const EconomicsCells = React.memo(({
  cost,
  kdvRate,
  stopajRate,
  cells
}: {
  cost: number;
  kdvRate: number;
  stopajRate: number;
  cells: { name: string, commission: number, targetMargin: number }[];
}) => {
  return (
    <>
      {cells.map((cell, idx) => {
        const mEcon = calculateEconomicsFromMargin(cell.targetMargin, cost, kdvRate, cell.commission, stopajRate);
        return (
          <TableCell key={idx} className="text-left w-[140px] px-2 py-1 text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-full flex items-center">
                    {mEcon.isCalculable ? formatCurrency(mEcon.sellingPrice) : 'Hesaplanamaz'}
                  </div>
                </TooltipTrigger>
                <EconomicsTooltipContent
                  isCalculable={mEcon.isCalculable}
                  title={`${cell.name} Fiyatı`}
                  revenue={mEcon.sellingPrice}
                  vat={mEcon.vatAmount}
                  kdvRate={kdvRate}
                  commission={mEcon.commissionAmount}
                  commissionRate={cell.commission}
                  stopaj={mEcon.stopajAmount}
                  stopajRate={stopajRate > 0 ? stopajRate : undefined}
                  cost={cost}
                  netProfit={mEcon.netProfit}
                  profitOverCostPercentage={mEcon.profitOverCostPercentage}
                  profitPercentage={mEcon.profitPercentage}
                  headerLabel={`${cell.name} (%${cell.targetMargin} Hedef)`}
                />
              </Tooltip>
            </TooltipProvider>
          </TableCell>
        );
      })}
    </>
  );
});
EconomicsCells.displayName = 'EconomicsCells';

const SortableProductRow = React.memo(({
  product,
  ingredients,
  storeMargins,
  categories,
  platformCommissionRate,
  bankCommissionRate,
  kdvRate,
  stopajRate,
  updateProduct,
  deleteProduct,
  isExpanded,
  onToggleExpand,
  updateIngredientPrice,
  onlineTargetMargin,
  platforms,
  category
}: {
  product: Product,
  ingredients: Ingredient[],
  storeMargins: Margin[],
  categories: Category[],
  platformCommissionRate: number,
  bankCommissionRate: number,
  kdvRate: number,
  stopajRate: number,
  updateProduct: (id: string, field: keyof Product, value: any) => void,
  deleteProduct: (id: string) => void,
  isExpanded: boolean,
  onToggleExpand: (id: string) => void,
  updateIngredientPrice: (ingredientId: string, newPrice: number) => void;
  onlineTargetMargin: number;
  platforms: { name: string, commission: number }[];
  category?: Category;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });

  const [editingField, setEditingField] = useState<'name' | 'storePrice' | 'onlinePrice' | null>(null);

  const hasRecipe = product.recipe && product.recipe.length > 0;
  const cost = hasRecipe ? calculateCost(product.recipe, ingredients) : product.manualCost;
  // Use product category for coloring, but the passed category is more reliable for target calculations
  const displayCategory = categories.find(c => c.id === product.categoryId);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
    backgroundColor: displayCategory ? `${displayCategory.color}33` : undefined,
  };

  const handleUpdate = (field: 'name' | 'storePrice' | 'onlinePrice', value: string) => {
    updateProduct(product.id, field, value);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  // Unified Economics Calculations
  const storeEconomics = calculateEconomicsFromPrice(product.storePrice, cost, kdvRate, bankCommissionRate, 0);
  const showNetStoreProfit = product.storePrice > 0;

  const onlineEconomics = calculateEconomicsFromPrice(product.onlinePrice, cost, kdvRate, platformCommissionRate, stopajRate);
  const showNetOnlineProfit = product.onlinePrice > 0;

  // Prepare store dynamic margin cells
  const categoryStoreMarginCells = storeMargins.map(m => {
    // Find the specific margin value for this category and margin column
    const mv = category?.storeMarginValues?.find(v => v.marginId === m.id);
    const targetVal = mv?.value || 0;
    const comm = bankCommissionRate;
    return { name: m.name || `%${targetVal} Marj`, commission: comm, targetMargin: targetVal };
  });

  return (
    <TableRow ref={setNodeRef} style={style} key={product.id} className={isExpanded ? 'border-b-0' : ''}>
      <TableCell className="w-[340px] px-4 py-1">
        <div className="flex items-center gap-1 h-8">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
          {editingField === 'name' ? (
            <Input
              defaultValue={product.name}
              onBlur={(e) => handleUpdate('name', e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-medium border-dashed focus-visible:ring-1 focus-visible:bg-card flex-grow h-8"
            />
          ) : (
            <div onClick={() => setEditingField('name')} className="font-medium flex-grow cursor-pointer truncate px-2 h-8 flex items-center rounded-md hover:bg-muted/50">
              {product.name || <span className="text-muted-foreground">Yeni Ürün Adı</span>}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-left w-[120px] px-4 py-1">
        <div className="flex items-center justify-start gap-0 h-8">
          <span className="font-medium text-foreground">{formatCurrency(cost)}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onToggleExpand(product.id)}>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Reçeteyi Göster/Gizle</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell className="w-[140px] px-4 py-1 text-left">
        {editingField === 'storePrice' ? (
          <Input
            type="number"
            defaultValue={product.storePrice || ''}
            onBlur={(e) => handleUpdate('storePrice', e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-left h-8 border-dashed"
            placeholder="0.00"
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div onClick={() => setEditingField('storePrice')} className="-ml-2 text-left cursor-pointer px-2 h-8 flex items-center rounded-md hover:bg-muted/50">
                  <div className="flex flex-col justify-center text-left">
                    <div>{formatCurrency(product.storePrice)}</div>
                    {showNetStoreProfit && (
                      <div className="text-xs text-muted-foreground -mt-1 leading-tight">
                        {formatCurrency(storeEconomics.netProfit)} ({storeEconomics.profitOverCostPercentage.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              {showNetStoreProfit && (
                <EconomicsTooltipContent
                  title="Ana Fiyat"
                  revenue={product.storePrice}
                  vat={storeEconomics.vatAmount}
                  kdvRate={kdvRate}
                  commission={storeEconomics.commissionAmount}
                  commissionRate={bankCommissionRate}
                  stopaj={storeEconomics.stopajAmount}
                  cost={cost}
                  netProfit={storeEconomics.netProfit}
                  profitOverCostPercentage={storeEconomics.profitOverCostPercentage}
                  profitPercentage={storeEconomics.profitPercentage}
                />
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>

      <EconomicsCells
        cost={cost}
        kdvRate={kdvRate}
        stopajRate={0}
        cells={categoryStoreMarginCells}
      />

      <TableCell className="text-left px-0 w-[40px] py-1" />

      <TableCell className="w-8 px-1 py-1" />

      <TableCell className="w-[140px] px-4 py-1 text-left">
        {editingField === 'onlinePrice' ? (
          <Input
            type="number"
            defaultValue={product.onlinePrice || ''}
            onBlur={(e) => handleUpdate('onlinePrice', e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-left h-8 border-dashed"
            placeholder="0.00"
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div onClick={() => setEditingField('onlinePrice')} className="-ml-2 h-8 cursor-pointer rounded-md hover:bg-muted/50 flex items-center justify-start px-2">
                  <div className="flex flex-col justify-center text-left">
                    <div>{formatCurrency(product.onlinePrice)}</div>
                    {showNetOnlineProfit && (
                      <div className="text-xs text-muted-foreground -mt-1 leading-tight">
                        {formatCurrency(onlineEconomics.netProfit)} ({onlineEconomics.profitOverCostPercentage.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              {showNetOnlineProfit && (
                <EconomicsTooltipContent
                  title="Ana Fiyat"
                  revenue={product.onlinePrice}
                  vat={onlineEconomics.vatAmount}
                  kdvRate={kdvRate}
                  commission={onlineEconomics.commissionAmount}
                  commissionRate={platformCommissionRate}
                  stopaj={onlineEconomics.stopajAmount}
                  stopajRate={stopajRate}
                  cost={cost}
                  netProfit={onlineEconomics.netProfit}
                  profitOverCostPercentage={onlineEconomics.profitOverCostPercentage}
                  profitPercentage={onlineEconomics.profitPercentage}
                />
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>

      <EconomicsCells
        cost={cost}
        kdvRate={kdvRate}
        stopajRate={stopajRate}
        cells={platforms.map(p => ({
          name: p.name,
          commission: p.commission,
          targetMargin: category?.targetOnlineMargin ?? onlineTargetMargin
        }))}
      />
      <TableCell className="text-right w-[80px] px-4 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Taşı</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => updateProduct(product.id, 'categoryId', undefined)}>
                    Kategorisiz
                  </DropdownMenuItem>
                  {categories.map(cat => (
                    <DropdownMenuItem key={cat.id} onClick={() => updateProduct(product.id, 'categoryId', cat.id)}>
                      {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => deleteProduct(product.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Ürünü Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
SortableProductRow.displayName = 'SortableProductRow';

function SortableCategoryItem({ category, onDelete }: { category: Category; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 rounded-md border bg-background">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
        <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
        <span>{category.name}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(category.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RatePopover({ title, label, description, rate, onSave, maxLimit = 100, trigger, placeholder = "Örn: 30" }: { title: string, label?: string, description?: string, rate: number, onSave: (r: number) => void, maxLimit?: number, trigger?: React.ReactNode, placeholder?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState(String(rate));

  const handleSave = () => {
    const newRate = parseFloat(input);
    if (!isNaN(newRate) && newRate >= 0 && newRate <= maxLimit) {
      onSave(newRate);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => { if (open) setInput(String(rate)); setIsOpen(open) }}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs hover:bg-primary/10">
            <Percent className="h-3.5 w-3.5" /> {label} %{rate}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 glass-panel border-none shadow-xl">
        <div className="grid gap-3">
          <div className="space-y-1">
            <h4 className="font-bold">{title}</h4>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
            <span className="font-bold">%</span>
          </div>
          <Button onClick={handleSave} size="sm" className="w-full">Güncelle</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}



export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [margins, setMargins] = useState<Margin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  const [isAddProductDialogOpen, setAddProductDialogOpen] = useState(false);

  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const isInitialMount = React.useRef(true);

  // Rate states
  const [platformCommissionRate, setPlatformCommissionRate] = useState(15);
  const [bankCommissionRate, setBankCommissionRate] = useState(2.5);
  const [kdvRate, setKdvRate] = useState(10);
  const [stopajRate, setStopajRate] = useState(1);
  const [onlineTargetMargin, setOnlineTargetMargin] = useState(30);
  const [migrosCommission, setMigrosCommission] = useState(15);
  const [getirCommission, setGetirCommission] = useState(15);
  const [yemeksepetiCommission, setYemeksepetiCommission] = useState(15);
  const [trendyolCommission, setTrendyolCommission] = useState(15);

  const storeMargins = useMemo(() => margins.filter(m => m.type === 'store').sort((a, b) => (a.name || '').localeCompare(b.name || '')), [margins]);

  const platforms = useMemo(() => [
    { key: 'migros', name: 'Migros', commission: migrosCommission },
    { key: 'getir', name: 'Getir', commission: getirCommission },
    { key: 'yemeksepeti', name: 'Yemeksepeti', commission: yemeksepetiCommission },
    { key: 'trendyol', name: 'Trendyol', commission: trendyolCommission },
  ], [migrosCommission, getirCommission, yemeksepetiCommission, trendyolCommission]);

  const updatePlatformCommission = (key: string, val: number) => {
    isDirtyRef.current = true;
    if (key === 'migros') setMigrosCommission(val);
    else if (key === 'getir') setGetirCommission(val);
    else if (key === 'yemeksepeti') setYemeksepetiCommission(val);
    else if (key === 'trendyol') setTrendyolCommission(val);
  };

  const toggleProductExpansion = React.useCallback((productId: string) => {
    setExpandedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const addProduct = React.useCallback((productData: Omit<Product, 'id' | 'recipe' | 'order' | 'manualCost'>) => {
    log.info('Yeni ürün ekleniyor', { name: productData.name, categoryId: productData.categoryId });
    setProducts((prev) => {
      isDirtyRef.current = true;
      const newOrder = prev.length > 0 ? Math.max(...prev.map(p => p.order)) + 1 : 0;
      return [...prev, { ...productData, id: generateId(), recipe: [], order: newOrder, manualCost: 0 }];
    });
    setAddProductDialogOpen(false);
  }, []);

  const deleteProduct = React.useCallback((id: string) => {
    isDirtyRef.current = true;
    log.warn('Ürün siliniyor', { productId: id });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateCategoryMargin = React.useCallback((categoryId: string, type: 'store' | 'online', value: number, marginId?: string) => {
    isDirtyRef.current = true;
    setCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        if (type === 'online') {
          return { ...c, targetOnlineMargin: value };
        } else if (type === 'store' && marginId) {
          const existingValues = c.storeMarginValues || [];
          const index = existingValues.findIndex(v => v.marginId === marginId);
          let newValues;
          if (index >= 0) {
            newValues = [...existingValues];
            newValues[index] = { ...newValues[index], value };
          } else {
            newValues = [...existingValues, { id: generateId(), categoryId, marginId, value }];
          }
          return { ...c, storeMarginValues: newValues };
        }
      }
      return c;
    }));
  }, []);


  const updateProduct = React.useCallback((id: string, field: keyof Product, value: string | number | undefined) => {
    isDirtyRef.current = true;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (field === 'categoryId') {
            return { ...p, categoryId: value as string | undefined };
          }
          if (field === 'name') {
            return { ...p, name: value as string };
          }
          const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : (value ?? 0);
          const finalValue = isNaN(numericValue as number) ? 0 : numericValue;
          return { ...p, [field]: finalValue };
        }
        return p;
      })
    );
  }, []);

  const updateProductRecipe = React.useCallback((productId: string, newRecipe: RecipeItem[]) => {
    isDirtyRef.current = true;
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        // If a recipe is added, clear manualCost. If recipe is cleared, user can set manualCost.
        const manualCost = newRecipe.length > 0 ? 0 : p.manualCost;
        return { ...p, recipe: newRecipe, manualCost };
      }
      return p;
    }));
  }, []);

  const updateIngredientPrice = React.useCallback((ingredientId: string, newPrice: number) => {
    isDirtyRef.current = true;
    setIngredients(prevIngredients =>
      prevIngredients.map(ing =>
        ing.id === ingredientId ? { ...ing, price: newPrice } : ing
      )
    );
  }, []);

  const handleUpdateMarginDetails = React.useCallback((id: string, marginData: Partial<Margin>) => {
    isDirtyRef.current = true;
    setMargins(prev => prev.map(m => m.id === id ? { ...m, ...marginData } : m));
  }, []);

  const handleDeleteMargin = React.useCallback((id: string) => {
    isDirtyRef.current = true;
    setMargins(prev => prev.filter((m) => m.id !== id));
  }, []);

  const handleAddMargin = React.useCallback((marginData: Partial<Margin>) => {
    isDirtyRef.current = true;
    const newMarginObject: Margin = {
      id: generateId(),
      type: 'store',
      value: marginData.value || 0,
      name: marginData.name,
      commissionRate: marginData.commissionRate
    };
    setMargins((prev) => [...prev, newMarginObject]);
  }, []);

  const renderMarginHeaders = (
    marginsList: Margin[]
  ) => (
    <>
      {marginsList.map((margin) => (
        <TableHead key={margin.id} className="th-premium w-[140px] px-2 relative group">
          <Button variant="ghost" size="icon" className="absolute top-2 right-1 h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => handleDeleteMargin(margin.id)}>
            <X className="h-3 w-3" />
          </Button>
          <MarginEditPopover
            margin={margin}
            onSave={(data) => handleUpdateMarginDetails(margin.id, data)}
            trigger={
              <HeaderColumnLabel
                title={margin.name || 'Yeni Kolon'}
                subtitle=""
              />
            }
          />
        </TableHead>
      ))}
      <TableHead className="w-[40px] p-0 flex items-center justify-center">
        <MarginEditPopover
          onSave={(data) => handleAddMargin(data)}
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <PlusCircle className="h-5 w-5" />
            </Button>
          }
        />
      </TableHead>
    </>
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data Fetching and Saving
  useEffect(() => {
    log.info('Sayfa yükleniyor — veriler çekiliyor...');
    const timer = log.time('Veri yükleme süresi');

    fetch('/api/data')
      .then((res) => {
        if (!res.ok) {
          log.error(`API yanıtı başarısız: ${res.status} ${res.statusText}`);
          throw new Error('Veri çekilemedi');
        }
        log.debug('API yanıtı alındı, JSON ayrıştırılıyor...');
        return res.json();
      })
      .then((data) => {
        timer.end();

        const sortedProducts = (data.products || []).sort((a: Product, b: Product) => (a.order ?? 0) - (b.order ?? 0));
        const sortedIngredients = (data.ingredients || []).sort((a: Ingredient, b: Ingredient) => (a.order ?? 0) - (b.order ?? 0));

        const categoriesWithOrder = (data.categories || []).map((cat: Category, index: number) => ({ ...cat, order: cat.order ?? index }));
        const sortedCategories = categoriesWithOrder.sort((a: Category, b: Category) => a.order - b.order);

        setProducts(sortedProducts);
        setIngredients(sortedIngredients);
        setMargins(data.margins || []);
        setCategories(sortedCategories);

        setPlatformCommissionRate(data.platformCommissionRate ?? 15);
        setBankCommissionRate(data.bankCommissionRate ?? 2.5);
        setKdvRate(data.kdvRate ?? 10);
        setStopajRate(data.stopajRate ?? 1);
        setOnlineTargetMargin(data.onlineTargetMargin ?? 30);
        setMigrosCommission(data.migrosCommission ?? 15);
        setGetirCommission(data.getirCommission ?? 15);
        setYemeksepetiCommission(data.yemeksepetiCommission ?? 15);
        setTrendyolCommission(data.trendyolCommission ?? 15);

        log.success('Veriler başarıyla yüklendi', {
          products: sortedProducts.length,
          ingredients: sortedIngredients.length,
          categories: sortedCategories.length,
          margins: (data.margins || []).length,
          rates: {
            platform: data.platformCommissionRate ?? 15,
            banka: data.bankCommissionRate ?? 2.5,
            kdv: data.kdvRate ?? 10,
            stopaj: data.stopajRate ?? 1,
            onlineTarget: data.onlineTargetMargin ?? 30,
          },
        });

        setIsLoading(false);
      })
      .catch((error) => {
        timer.end();
        log.error('Veri yükleme hatası!', { message: error.message });
        window.dispatchEvent(new CustomEvent('app-fetch-error', { detail: 'Veriler yüklenemedi. Lütfen sayfayı yenileyin veya tekrar giriş yapın.' }));
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (isInitialMount.current) {
      if (!isLoading) {
        isInitialMount.current = false;
        log.debug('İlk yükleme tamamlandı — otomatik kayıt aktif');
      }
      return;
    }

    if (!isLoading && isDirtyRef.current) {
      isDirtyRef.current = false;
      setSaveStatus('saving');
      log.debug('Otomatik kayıt başlatılıyor...', {
        products: products.length,
        margins: margins.length,
      });

      const saveTimer = log.time('Otomatik kayıt süresi');

      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          ingredients,
          margins,
          categories,
          platformCommissionRate,
          kdvRate,
          bankCommissionRate,
          stopajRate,
          onlineTargetMargin,
          migrosCommission,
          getirCommission,
          yemeksepetiCommission,
          trendyolCommission
        }),
      })
        .then((res) => {
          saveTimer.end();
          if (!res.ok) throw new Error('Kayıt başarısız');
          setSaveStatus('saved');
          log.success('Veriler otomatik kaydedildi ✓');
          setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2000);
        })
        .catch(error => {
          saveTimer.end();
          setSaveStatus('error');
          log.error('Otomatik kayıt hatası!', { message: error.message });
          window.dispatchEvent(new CustomEvent('app-fetch-error', { detail: 'Yaptığınız değişiklikler kaydedilemedi!' }));
        });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    products, ingredients, margins, categories, platformCommissionRate,
    kdvRate, bankCommissionRate, stopajRate, onlineTargetMargin,
    migrosCommission, getirCommission, yemeksepetiCommission, trendyolCommission,
    isLoading
  ]);



  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    log.info('Yeni kategori ekleniyor', { name: newCategoryName, color: newCategoryColor });
    setCategories(prev => {
      isDirtyRef.current = true;
      const newOrder = prev.length > 0 ? Math.max(...prev.map(c => c.order ?? -1)) + 1 : 0;
      return [...prev, { id: generateId(), name: newCategoryName, color: newCategoryColor, order: newOrder }];
    });
    setNewCategoryName('');
    setNewCategoryColor(categoryColors[0]);
  }

  const handleDeleteCategory = (id: string) => {
    setProducts(prev => {
      isDirtyRef.current = true;
      return prev.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p);
    });
    setCategories(prev => {
      isDirtyRef.current = true;
      return prev.filter(c => c.id !== id);
    });
  }

  const productAverages = useMemo(() => {
    const calculateMargin = (prods: Product[], type: 'store' | 'online') => {
      let totalProfit = 0;
      let totalRevenue = 0;
      let totalCost = 0;
      let totalVat = 0;
      let totalCommission = 0;
      let totalStopaj = 0;

      prods.forEach(product => {
        const hasRecipe = product.recipe && product.recipe.length > 0;
        const cost = hasRecipe ? calculateCost(product.recipe, ingredients) : product.manualCost;

        if (type === 'store' && product.storePrice > 0) {
          const econ = calculateEconomicsFromPrice(product.storePrice, cost, kdvRate, bankCommissionRate, 0);
          totalProfit += econ.netProfit;
          totalRevenue += econ.sellingPrice;
          totalCost += cost;
          totalVat += econ.vatAmount;
          totalCommission += econ.commissionAmount;
          totalStopaj += econ.stopajAmount;
        } else if (type === 'online' && product.onlinePrice > 0) {
          const econ = calculateEconomicsFromPrice(product.onlinePrice, cost, kdvRate, platformCommissionRate, stopajRate);
          totalProfit += econ.netProfit;
          totalRevenue += econ.sellingPrice;
          totalCost += cost;
          totalVat += econ.vatAmount;
          totalCommission += econ.commissionAmount;
          totalStopaj += econ.stopajAmount;
        }
      });

      return totalRevenue > 0 ? {
        percentage: (totalProfit / totalCost) * 100,
        totalRevenue,
        totalProfit,
        totalCost,
        totalVat,
        totalCommission,
        totalStopaj
      } : null;
    };

    return {
      overallStore: calculateMargin(products.filter(p => p.categoryId), 'store'),
      overallOnline: calculateMargin(products.filter(p => p.categoryId), 'online'),
      calculateMargin
    };
  }, [products, ingredients, kdvRate, bankCommissionRate, platformCommissionRate, stopajRate]);

  const productsByCategory = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.order - b.order);
    const grouped: { category?: Category, products: Product[], avgStoreMargin: { percentage: number, totalRevenue: number, totalProfit: number, totalCost: number, totalVat: number, totalCommission: number, totalStopaj: number } | null, avgOnlineMargin: { percentage: number, totalRevenue: number, totalProfit: number, totalCost: number, totalVat: number, totalCommission: number, totalStopaj: number } | null }[] = [];
    const uncategorized: Product[] = [];
    const productsByCatId: Record<string, Product[]> = {};

    for (const product of sorted) {
      if (product.categoryId) {
        if (!productsByCatId[product.categoryId]) {
          productsByCatId[product.categoryId] = [];
        }
        productsByCatId[product.categoryId].push(product);
      } else {
        uncategorized.push(product);
      }
    }

    const sortedCategories = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    sortedCategories.forEach(cat => {
      const catProducts = productsByCatId[cat.id];
      if (catProducts && catProducts.length > 0) {
        grouped.push({
          category: cat,
          products: catProducts,
          avgStoreMargin: productAverages.calculateMargin(catProducts, 'store'),
          avgOnlineMargin: productAverages.calculateMargin(catProducts, 'online')
        });
      }
    });

    if (uncategorized.length > 0) {
      grouped.push({
        products: uncategorized,
        avgStoreMargin: null,
        avgOnlineMargin: null
      });
    }

    return grouped;
  }, [products, categories, productAverages]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        isDirtyRef.current = true;
        return reordered.map((item, index) => ({ ...item, order: index }));
      });
    }
  }

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        isDirtyRef.current = true;
        return reordered.map((item, index) => ({ ...item, order: index }));
      });
    }
  }

  const totalColumns = 7 + storeMargins.length + platforms.length;
  const productIds = useMemo(() => products.map(p => p.id), [products]);
  const categoryIds = useMemo(() => categories.map(c => c.id), [categories]);
  const pricedIngredients = useMemo(() => ingredients.filter(ing => ing.price !== undefined && ing.unit !== undefined), [ingredients]);

  return (
    <div className="min-h-screen flex flex-col">
      {isLoading && <LoadingState fullPage={true} />}
      <main className="flex-1 w-full max-w-[1950px] mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 h-6">
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                Ürün ve Kâr Analizi
              </h2>
              <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full transition-all duration-300 ${
                saveStatus === 'saving' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse' :
                  saveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    saveStatus === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                      'opacity-0'
                }`}>
                {saveStatus === 'saving' && '🔄 Kaydediliyor'}
                {saveStatus === 'saved' && '✅ Kaydedildi'}
                {saveStatus === 'error' && '❌ Hata!'}
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-lg">
              Maliyetlerinizi ve kâr marjlarınızı modern bir arayüzle takip edin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Rates Summary Popovers */}
            <div className="flex items-center gap-2 glass-panel p-1.5 px-3">
              <RatePopover title="KDV Oranı" label="KDV:" rate={kdvRate} onSave={(val) => { isDirtyRef.current = true; setKdvRate(val); }} maxLimit={100} />
              <Separator orientation="vertical" className="h-4" />
              <RatePopover title="Banka Komisyonu" label="Banka:" rate={bankCommissionRate} onSave={(val) => { isDirtyRef.current = true; setBankCommissionRate(val); }} maxLimit={100} />
              <Separator orientation="vertical" className="h-4" />
              <RatePopover title="Platform Komisyonu" label="Platform:" rate={platformCommissionRate} onSave={(val) => { isDirtyRef.current = true; setPlatformCommissionRate(val); }} maxLimit={100} />
              <Separator orientation="vertical" className="h-4" />
              <RatePopover title="Stopaj Oranı" label="Stopaj:" rate={stopajRate} onSave={(val) => { isDirtyRef.current = true; setStopajRate(val); }} maxLimit={100} />
              <Separator orientation="vertical" className="h-4" />
              <RatePopover title="Online Hedef Kâr Marjı" label="Online Hedef:" rate={onlineTargetMargin} onSave={(val) => { isDirtyRef.current = true; setOnlineTargetMargin(val); }} maxLimit={100} />
            </div>

            <Button onClick={() => setCategoryDialogOpen(true)} variant="outline" className="glass-panel border-dashed h-11 px-5">
              <Tags className="mr-2 h-4 w-4" /> Kategoriler
            </Button>

            <Button onClick={() => setAddProductDialogOpen(true)} className="h-11 px-8 font-bold shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-5 w-5" /> Yeni Ürün
            </Button>
          </div>
        </div>

        {/* Categories Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="max-w-md glass-panel border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Kategorileri Yönet</DialogTitle>
              <DialogDescription>Ürünlerinizi gruplandırmak için kategoriler oluşturun ve yönetin.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Yeni Kategori</h4>
                <div className="flex items-center gap-2">
                  <Input placeholder="Kategori Adı" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <Button onClick={handleAddCategory}>Ekle</Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Renk:</span>
                  <div className="flex gap-2">
                    {categoryColors.map(color => (
                      <button key={color} onClick={() => setNewCategoryColor(color)} className="h-7 w-7 rounded-full transition-transform active:scale-90" style={{ backgroundColor: color }}>
                        {newCategoryColor === color && <Check className="h-4 w-4 text-white m-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Mevcut Kategoriler</h4>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                  <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {categories.length > 0 ? categories.map(cat => (
                        <SortableCategoryItem key={cat.id} category={cat} onDelete={handleDeleteCategory} />
                      )) : <p className="text-sm text-muted-foreground text-center py-8 italic">Henüz kategori eklenmemiş.</p>}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Table Panel */}
        <div className="glass-panel overflow-hidden border-none shadow-2xl">
          <div className="p-1 overflow-x-auto">
            {isMounted ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table className="table-fixed min-w-[1400px]">
                  <TableHeader className="bg-muted/30 backdrop-blur-sm sticky top-0 z-20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="th-premium w-[340px] px-6">Ürün Adı</TableHead>
                      <TableHead className="th-premium w-[120px]">Maliyet</TableHead>
                      <TableHead className="th-premium w-[160px] py-2">
                        <div className="flex flex-col justify-center">
                          <span>Mağaza Fiyatı</span>
                          <MarginDisplay marginData={productAverages.overallStore} />
                        </div>
                      </TableHead>
                      {renderMarginHeaders(storeMargins)}
                      <TableHead className="w-8 px-0 border-x border-border/20" />
                      <TableHead className="th-premium w-[160px] py-2">
                        <div className="flex flex-col justify-center">
                          <span>Online Fiyat</span>
                          <MarginDisplay marginData={productAverages.overallOnline} />
                        </div>
                      </TableHead>
                      {platforms.map(p => (
                        <TableHead key={p.key} className="th-premium w-[140px] px-2 relative group">
                          <RatePopover
                            title={`${p.name} Komisyonu`}
                            rate={p.commission}
                            onSave={(val) => updatePlatformCommission(p.key, val)}
                            trigger={
                              <HeaderColumnLabel
                                title={p.name}
                                subtitle={`%${p.commission} Kom.`}
                              />
                            }
                          />
                        </TableHead>
                      ))}
                      <TableHead className="th-premium text-center w-[80px]">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
                    <TableBody>
                      {products.length > 0 ? (
                        productsByCategory.map(({ category, products: productGroup, avgStoreMargin, avgOnlineMargin }) => (
                          <React.Fragment key={category?.id || 'uncategorized'}>
                            <TableRow
                              className={`border-y border-border/10 ${!category ? 'bg-muted/10' : ''}`}
                              style={{
                                backgroundColor: category ? `${category.color}15` : undefined,
                                borderLeft: category ? `4px solid ${category.color}` : 'none'
                              }}
                            >
                              <TableCell colSpan={2} className="py-2.5 px-6">
                                <div className="flex items-center justify-between w-full h-8">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className="font-bold text-sm tracking-wide uppercase"
                                      style={{ color: category ? category.color : 'inherit', filter: 'brightness(0.8)' }}
                                    >
                                      {category?.name || 'Kategorisiz Ürünler'}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-left px-4 py-2">
                                <div className="flex items-center">
                                  <MarginDisplay marginData={avgStoreMargin as any} colorStyle={{ color: category ? category.color : 'inherit' }} />
                                </div>
                              </TableCell>

                              {/* Store Dynamic Margin Inputs for Category */}
                              {storeMargins.map(m => {
                                const mv = category?.storeMarginValues?.find(v => v.marginId === m.id);
                                const currentVal = mv?.value || 0;
                                return (
                                  <TableCell key={m.id} className="px-2 py-2">
                                    {category ? (
                                      <div className="flex items-center gap-1 group/input">
                                        <Input
                                          type="number"
                                          className="h-7 w-16 text-xs font-bold bg-background/50 border-dashed focus:bg-background transition-all"
                                          defaultValue={currentVal}
                                          onBlur={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val !== currentVal) {
                                              updateCategoryMargin(category.id, 'store', val, m.id);
                                            }
                                          }}
                                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        />
                                        <span className="text-[10px] font-bold text-muted-foreground">%</span>
                                      </div>
                                    ) : null}
                                  </TableCell>
                                );
                              })}

                              <TableCell colSpan={2} className="w-[40px] px-0" />

                              <TableCell className="text-left px-4 py-2">
                                <div className="flex items-center">
                                  <MarginDisplay marginData={avgOnlineMargin as any} colorStyle={{ color: category ? category.color : 'inherit' }} />
                                </div>
                              </TableCell>

                              <TableCell colSpan={platforms.length} className="text-center py-2">
                                {category && (
                                  <div className="flex items-center justify-center">
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 hover:bg-indigo-500/15 transition-all cursor-default">
                                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Hedef:</span>
                                      <span className="text-xs font-bold text-indigo-400">%{category.targetOnlineMargin || onlineTargetMargin}</span>
                                      <RatePopover
                                        title={category.name}
                                        description="Online Kâr Marjı Hedefi (%)"
                                        rate={category.targetOnlineMargin || onlineTargetMargin}
                                        onSave={(val) => updateCategoryMargin(category.id, 'online', val)}
                                        trigger={
                                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-primary/50 hover:text-primary hover:bg-primary/10 transition-all">
                                            <PlusCircle className="h-4 w-4" />
                                          </Button>
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </TableCell>

                              <TableCell className="text-right py-2.5 px-2">
                                <div className="flex justify-end items-center h-full">
                                  <span className="text-[10px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 whitespace-nowrap">
                                    {productGroup.length} ÜRÜN
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {productGroup.map(product => (
                              <React.Fragment key={product.id}>
                                <SortableProductRow
                                  product={product}
                                  ingredients={ingredients}
                                  storeMargins={storeMargins}
                                  categories={categories}
                                  platformCommissionRate={platformCommissionRate}
                                  bankCommissionRate={bankCommissionRate}
                                  kdvRate={kdvRate}
                                  stopajRate={stopajRate}
                                  updateProduct={updateProduct}
                                  deleteProduct={deleteProduct}
                                  isExpanded={expandedProductIds.includes(product.id)}
                                  onToggleExpand={toggleProductExpansion}
                                  updateIngredientPrice={updateIngredientPrice}
                                  onlineTargetMargin={onlineTargetMargin}
                                  platforms={platforms}
                                  category={category}
                                />
                                {expandedProductIds.includes(product.id) && (
                                  <TableRow className="bg-primary/5 hover:bg-primary/5">
                                    <TableCell colSpan={totalColumns} className="p-0 border-b border-primary/10">
                                      <div className="p-4 md:p-6">
                                        <InlineRecipeEditor
                                          product={product}
                                          ingredients={ingredients}
                                          allProducts={products}
                                          onSave={(newRecipe) => updateProductRecipe(product.id, newRecipe)}
                                          updateProduct={updateProduct}
                                          updateIngredientPrice={updateIngredientPrice}
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={totalColumns} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <p className="text-muted-foreground text-lg italic">{!isMounted || isLoading ? 'Veriler Yükleniyor...' : 'Henüz ürün eklenmemiş.'}</p>
                              {isMounted && !isLoading && <Button onClick={() => setAddProductDialogOpen(true)} variant="outline" size="sm">Hemen Bir Ürün Ekleyin</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
            ) : (
              <div className="h-[600px] flex items-center justify-center">
                <p className="text-muted-foreground animate-pulse font-medium">Tablo hazırlanıyor...</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Product Dialog */}
        <Dialog open={isAddProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
          <DialogContent className="glass-panel border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Yeni Ürün Ekle</DialogTitle>
              <DialogDescription>Yeni bir ürün oluşturun ve fiyatlandırma analizine başlayın.</DialogDescription>
            </DialogHeader>
            <ProductForm addProduct={addProduct} categories={categories} />
          </DialogContent>
        </Dialog>

        {/* Dynamic Ingredient Price Update Section */}
        {pricedIngredients.length > 0 && (
          <div className="glass-panel p-8 mt-12 overflow-hidden relative border-none shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
              <Tags size={180} />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-foreground">Hızlı Malzeme Güncelleme</h3>
                  <p className="text-muted-foreground text-lg mt-1">Birim fiyatı tanımlı malzemeleri anında güncelleyin.</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Anlık Otomatik Hesaplama</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {pricedIngredients.map((ing) => (
                  <div key={ing.id} className="group relative bg-muted/40 dark:bg-muted/20 hover:bg-card transition-all duration-300 p-5 rounded-2xl border border-border/50 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary/30 group-hover:bg-primary transition-colors" />
                    <div className="flex flex-col space-y-3 relative z-10 pl-2">
                      <Label
                        htmlFor={`price-${ing.id}`}
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors truncate"
                        title={ing.name}
                      >
                        {ing.name}
                      </Label>

                      <div className="flex items-end gap-2">
                        <div className="relative flex-grow">
                          <Input
                            id={`price-${ing.id}`}
                            type="number"
                            className="w-full text-2xl font-black pr-8 bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-foreground"
                            key={ing.id + (ing.price || 0)}
                            defaultValue={ing.price}
                            onBlur={(e) => {
                              const newPrice = parseFloat(e.target.value.replace(',', '.'));
                              if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== ing.price) {
                                updateIngredientPrice(ing.id, newPrice);
                              } else {
                                e.target.value = String(ing.price || '');
                              }
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                          <span className="absolute right-0 bottom-1 font-black text-xl text-primary/30 group-hover:text-primary transition-opacity">₺</span>
                        </div>
                        <div className="pb-1">
                          <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase tracking-tighter border border-border/50">
                            / {ing.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
