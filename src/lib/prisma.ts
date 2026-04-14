import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

let dbPath = process.env.DATABASE_URL?.replace('file:', '') || './database.sqlite';
if (!path.isAbsolute(dbPath)) {
  dbPath = path.join(process.cwd(), dbPath);
}

// In Prisma 7, PrismaBetterSqlite3 is an adapter factory that takes config directly
const adapter = new PrismaBetterSqlite3({ url: "file:" + dbPath }) as any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
