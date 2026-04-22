import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiDataLogger as log } from '@/lib/logger';
import { GlobalSettings } from '@/lib/types';

const safeFloat = (val: any): number | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val).replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export async function GET() {
  try {
    // Fetch categories with their specific margin values
    const categoriesRaw = await prisma.category.findMany({
      include: { categoryMargins: true },
      orderBy: { order: 'asc' }
    });

    const categories = categoriesRaw.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      order: c.order,
      categoryMargins: c.categoryMargins.map(mv => ({
        id: mv.id,
        categoryId: mv.categoryId,
        marginId: mv.marginId,
        value: mv.value
      }))
    }));

    const ingredients = await prisma.ingredient.findMany({
      orderBy: { order: 'asc' }
    });

    // Fetch products with their recipes
    const productsRaw = await prisma.product.findMany({
      include: { recipe: true },
      orderBy: { order: 'asc' }
    });

    const products = productsRaw.map(p => ({
      id: p.id,
      name: p.name,
      manualCost: p.manualCost,
      categoryId: p.categoryId,
      storePrice: p.storePrice,
      onlinePrice: p.onlinePrice,
      order: p.order,
      recipe: p.recipe.map(r => ({
        ingredientId: r.ingredientId || undefined,
        subProductId: r.subProductId || undefined,
        quantity: r.quantity
      }))
    }));

    const margins = await prisma.margin.findMany();
    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'default' }
    }) as GlobalSettings | null;

    log.debug('GET /api/data returning', {
      categoriesCount: categories.length,
      categoriesWithMargins: categories.filter(c => (c.categoryMargins?.length ?? 0) > 0).length,
      marginsCount: margins.length
    });

    return NextResponse.json({
      categories,
      ingredients,
      products,
      margins,
      platformCommissionRate: settings?.platformCommission ?? 15,
      kdvRate: settings?.kdvRate ?? 10,
      bankCommissionRate: settings?.bankCommissionRate ?? 2.5,
      stopajRate: settings?.stopajRate ?? 1,
      migrosCommission: settings?.migrosCommission ?? 15,
      getirCommission: settings?.getirCommission ?? 15,
      yemeksepetiCommission: settings?.yemeksepetiCommission ?? 15,
      trendyolCommission: settings?.trendyolCommission ?? 15,
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
    log.debug('POST /api/data received', {
      products: data.products?.length,
      categories: data.categories?.length,
      margins: data.margins?.length,
      ingredients: data.ingredients?.length
    });

    await prisma.$transaction(async (tx) => {
      // 1. UPSERT CATEGORIES
      if (data.categories) {
        for (const cat of data.categories) {
          await tx.category.upsert({
            where: { id: cat.id },
            update: {
              name: cat.name,
              color: cat.color || '',
              order: cat.order || 0
            },
            create: {
              id: cat.id,
              name: cat.name,
              color: cat.color || '',
              order: cat.order || 0
            }
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
              manualCost: safeFloat(prod.manualCost) ?? 0,
              storePrice: safeFloat(prod.storePrice) ?? 0,
              onlinePrice: safeFloat(prod.onlinePrice) ?? 0,
              order: prod.order || 0,
              categoryId: prod.categoryId
            },
            create: {
              id: prod.id,
              name: prod.name,
              manualCost: safeFloat(prod.manualCost) ?? 0,
              storePrice: safeFloat(prod.storePrice) ?? 0,
              onlinePrice: safeFloat(prod.onlinePrice) ?? 0,
              order: prod.order || 0,
              categoryId: prod.categoryId
            }
          });

          await tx.recipeItem.deleteMany({ where: { productId: prod.id } });
          for (const rec of prod.recipe || []) {
            if (rec.ingredientId) {
              // Ingredient-based recipe item
              const ingCount = await tx.ingredient.count({ where: { id: rec.ingredientId } });
              if (ingCount > 0) {
                await tx.recipeItem.create({
                  data: { productId: prod.id, ingredientId: rec.ingredientId, quantity: safeFloat(rec.quantity) ?? 1 }
                });
              }
            } else if (rec.subProductId) {
              // Sub-product reference recipe item
              const prodCount = await tx.product.count({ where: { id: rec.subProductId } });
              if (prodCount > 0) {
                await tx.recipeItem.create({
                  data: { productId: prod.id, subProductId: rec.subProductId, quantity: safeFloat(rec.quantity) ?? 1 }
                });
              }
            }
          }
        }
      }

      // 4. UPSERT MARGINS & THEIR CATEGORY-SPECIFIC VALUES
      if (data.margins) {
        for (const mar of data.margins) {
          const commRate = (mar.commissionRate === undefined || mar.commissionRate === null || mar.commissionRate === '')
            ? null
            : parseFloat(String(mar.commissionRate).replace(',', '.'));

          await tx.margin.upsert({
            where: { id: mar.id },
            update: {
              name: mar.name,
              value: safeFloat(mar.value) ?? 0,
              type: mar.type,
              commissionRate: commRate
            },
            create: {
              id: mar.id,
              name: mar.name,
              value: safeFloat(mar.value) ?? 0,
              type: mar.type,
              commissionRate: commRate
            }
          });
        }
      }

      // Handle Category Margin Values
      if (data.categories) {
        // Ensure online-target margin exists in the database
        await tx.margin.upsert({
          where: { id: 'online-target' },
          update: { name: 'Online Hedefi', type: 'online', value: 0 },
          create: { id: 'online-target', name: 'Online Hedefi', type: 'online', value: 0 }
        });

        for (const cat of data.categories) {
          if (cat.categoryMargins) {
            await tx.categoryMargin.deleteMany({ where: { categoryId: cat.id } });
            for (const mv of cat.categoryMargins) {
              const mCount = await tx.margin.count({ where: { id: mv.marginId } });
              if (mCount > 0) {
                await tx.categoryMargin.create({
                  data: {
                    categoryId: cat.id,
                    marginId: mv.marginId,
                    value: safeFloat(mv.value) ?? 0
                  }
                });
              }
            }
          }
        }
      }

      // 5. UPDATE SETTINGS (USING STABLE ID "default")
      const settingsFields = [
        'platformCommissionRate', 'kdvRate', 'bankCommissionRate', 'stopajRate',
        'migrosCommission', 'getirCommission',
        'yemeksepetiCommission', 'trendyolCommission'
      ];

      if (settingsFields.some(f => data[f] !== undefined)) {
        // Cleanup any potential old records that don't have the 'default' ID
        await tx.globalSettings.deleteMany({
          where: { id: { not: 'default' } }
        });

        await tx.globalSettings.upsert({
          where: { id: 'default' },
          update: {
            platformCommission: data.platformCommissionRate !== undefined ? (safeFloat(data.platformCommissionRate) ?? 15) : undefined,
            kdvRate: data.kdvRate !== undefined ? (safeFloat(data.kdvRate) ?? 10) : undefined,
            bankCommissionRate: data.bankCommissionRate !== undefined ? (safeFloat(data.bankCommissionRate) ?? 2.5) : undefined,
            stopajRate: data.stopajRate !== undefined ? (safeFloat(data.stopajRate) ?? 1) : undefined,
            migrosCommission: data.migrosCommission !== undefined ? (safeFloat(data.migrosCommission) ?? 15) : undefined,
            getirCommission: data.getirCommission !== undefined ? (safeFloat(data.getirCommission) ?? 15) : undefined,
            yemeksepetiCommission: data.yemeksepetiCommission !== undefined ? (safeFloat(data.yemeksepetiCommission) ?? 15) : undefined,
            trendyolCommission: data.trendyolCommission !== undefined ? (safeFloat(data.trendyolCommission) ?? 15) : undefined,
          },
          create: {
            id: 'default',
            platformCommission: safeFloat(data.platformCommissionRate) ?? 15,
            kdvRate: safeFloat(data.kdvRate) ?? 10,
            bankCommissionRate: safeFloat(data.bankCommissionRate) ?? 2.5,
            stopajRate: safeFloat(data.stopajRate) ?? 1,
            migrosCommission: safeFloat(data.migrosCommission) ?? 15,
            getirCommission: safeFloat(data.getirCommission) ?? 15,
            yemeksepetiCommission: safeFloat(data.yemeksepetiCommission) ?? 15,
            trendyolCommission: safeFloat(data.trendyolCommission) ?? 15,
          }
        });
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
        // Do not delete the system-level online-target margin
        await tx.margin.deleteMany({ 
          where: { 
            id: { 
              notIn: incomingMarIds,
              not: 'online-target'
            } 
          } 
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('API /data POST ERROR!', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack?.split('\n')[0]
    });
    return NextResponse.json(
      { error: 'Failed to write data', details: error.message, code: error.code },
      { status: 500 }
    );
  }
}
