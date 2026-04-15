import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('--- DB TEST START ---');
    const categories = await prisma.category.findMany({
      include: { storeMarginValues: true }
    });
    console.log('Categories Count:', categories.length);
    if (categories.length > 0) {
      console.log('First Category Margins:', categories[0].storeMarginValues.length);
    }

    const margins = await prisma.margin.findMany();
    console.log('Margins Count:', margins.length);

    console.log('--- DB TEST END ---');
  } catch (err) {
    console.error('--- DB TEST ERROR ---');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
