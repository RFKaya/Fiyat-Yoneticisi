import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiDataLogger as log } from '@/lib/logger';

const safeFloat = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' }
    });
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { order: 'asc' }
    });
    
    // Fetch products with their recipes
    const productsRaw = await prisma.product.findMany({
      include: { recipe: true },
      orderBy: { order: 'asc' }
    });
    
    // Map products to the frontend format
    const products = productsRaw.map(p => ({
      id: p.id,
      name: p.name,
      manualCost: p.manualCost,
      categoryId: p.categoryId,
      storePrice: p.storePrice,
      onlinePrice: p.onlinePrice,
      order: p.order,
      recipe: p.recipe.map(r => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity
      }))
    }));

    const margins = await prisma.margin.findMany();
    const settings = await prisma.globalSettings.findFirst();

    return NextResponse.json({
      categories,
      ingredients,
      products,
      margins,
      platformCommissionRate: settings?.platformCommission ?? 15,
      kdvRate: settings?.kdvRate ?? 10,
      bankCommissionRate: settings?.bankCommissionRate ?? 2.5,
      stopajRate: settings?.stopajRate ?? 1,
    });
  } catch (error) {
    log.error('API /data GET Error', error);
    return NextResponse.json(
      { error: 'Failed to read data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    await prisma.$transaction(async (tx) => {
      // 1. UPSERT CATEGORIES
      if (data.categories) {
        for (const cat of data.categories) {
          await tx.category.upsert({
            where: { id: cat.id },
            update: { name: cat.name, color: cat.color || '', order: cat.order || 0 },
            create: { id: cat.id, name: cat.name, color: cat.color || '', order: cat.order || 0 }
          });
        }
      }
      
      // 2. UPSERT INGREDIENTS
      if (data.ingredients) {
        for (const ing of data.ingredients) {
          await tx.ingredient.upsert({
            where: { id: ing.id },
            update: { name: ing.name, price: ing.price, unit: ing.unit, order: ing.order || 0 },
            create: { id: ing.id, name: ing.name, price: ing.price, unit: ing.unit, order: ing.order || 0 }
          });
        }
      }

      // 3. UPSERT PRODUCTS & RECIPES
      if (data.products) {
        for (const prod of data.products) {
          await tx.product.upsert({
            where: { id: prod.id },
            update: { 
               name: prod.name, 
               manualCost: safeFloat(prod.manualCost), 
               storePrice: safeFloat(prod.storePrice), 
               onlinePrice: safeFloat(prod.onlinePrice), 
               order: prod.order || 0, 
               categoryId: prod.categoryId 
            },
            create: { 
               id: prod.id, 
               name: prod.name, 
               manualCost: safeFloat(prod.manualCost), 
               storePrice: safeFloat(prod.storePrice), 
               onlinePrice: safeFloat(prod.onlinePrice), 
               order: prod.order || 0, 
               categoryId: prod.categoryId 
            }
          });
          
          await tx.recipeItem.deleteMany({ where: { productId: prod.id } });
          for (const rec of prod.recipe || []) {
            // make sure ingredient exists
            const ingCount = await tx.ingredient.count({ where: { id: rec.ingredientId } });
            if (ingCount > 0) {
              await tx.recipeItem.create({
                data: { productId: prod.id, ingredientId: rec.ingredientId, quantity: safeFloat(rec.quantity) }
              });
            }
          }
        }
      }

      // 4. UPSERT MARGINS
      if (data.margins) {
        for (const mar of data.margins) {
          await tx.margin.upsert({
            where: { id: mar.id },
            update: { name: mar.name, value: safeFloat(mar.value), type: mar.type, commissionRate: safeFloat(mar.commissionRate) },
            create: { id: mar.id, name: mar.name, value: safeFloat(mar.value), type: mar.type, commissionRate: safeFloat(mar.commissionRate) }
          });
        }
      }

      // 5. UPDATE SETTINGS
      const settingsFields = ['platformCommissionRate', 'kdvRate', 'bankCommissionRate', 'stopajRate'];
      if (settingsFields.some(f => data[f] !== undefined)) {
        const existing = await tx.globalSettings.findFirst();
        const payload = {
          platformCommission: data.platformCommissionRate,
          kdvRate: data.kdvRate,
          bankCommissionRate: data.bankCommissionRate,
          stopajRate: data.stopajRate,
        };
        
        if (existing) {
          await tx.globalSettings.update({
            where: { id: existing.id },
            data: {
               platformCommission: data.platformCommissionRate !== undefined ? safeFloat(data.platformCommissionRate) : existing.platformCommission,
               kdvRate: data.kdvRate !== undefined ? safeFloat(data.kdvRate) : existing.kdvRate,
               bankCommissionRate: data.bankCommissionRate !== undefined ? safeFloat(data.bankCommissionRate) : existing.bankCommissionRate,
               stopajRate: data.stopajRate !== undefined ? safeFloat(data.stopajRate) : existing.stopajRate,
            }
          });
        } else {
          await tx.globalSettings.create({
            data: {
               platformCommission: safeFloat(data.platformCommissionRate) || 15,
               kdvRate: safeFloat(data.kdvRate) || 10,
               bankCommissionRate: safeFloat(data.bankCommissionRate) || 2.5,
               stopajRate: safeFloat(data.stopajRate) || 1,
            }
          });
        }
      }

      // 6. DELETE MISSING ITEMS (Cleanup)
      if (data.products) {
        const incomingProdIds = data.products.map((p: any) => p.id);
        await tx.product.deleteMany({ where: { id: { notIn: incomingProdIds } } });
      }
      
      if (data.ingredients) {
        const incomingIngIds = data.ingredients.map((i: any) => i.id);
        await tx.ingredient.deleteMany({ where: { id: { notIn: incomingIngIds } } });
      }
      
      if (data.categories) {
        const incomingCatIds = data.categories.map((c: any) => c.id);
        await tx.category.deleteMany({ where: { id: { notIn: incomingCatIds } } });
      }
      
      if (data.margins) {
        const incomingMarIds = data.margins.map((m: any) => m.id);
        await tx.margin.deleteMany({ where: { id: { notIn: incomingMarIds } } });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to save data via API', error);
    return NextResponse.json(
      { error: 'Failed to write data' },
      { status: 500 }
    );
  }
}
