import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Cleaning up tables...');
    await prisma.categoryStoreMargin.deleteMany({});
    await prisma.margin.deleteMany({ where: { type: 'store' } });
    console.log('Done cleaning.');
    
    console.log('Creating a test store margin column...');
    await prisma.margin.create({
      data: {
        id: 'test-margin-id',
        name: 'Test Kolon',
        type: 'store',
        value: 0
      }
    });
    console.log('Done creating test margin.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
