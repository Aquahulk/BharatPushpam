import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Workaround for Neon/pgBouncer "cached plan must not change result type"
// After schema changes, prepared statements can break in transaction pooling.
// Disable prepared statements via connection string parameters at runtime.
(() => {
  const url = process.env.DATABASE_URL || '';
  if (!url) return;
  const limit = String(process.env.DB_CONNECTION_LIMIT || (process.env.NODE_ENV === 'development' ? 5 : 1));
  let newUrl = url;
  if (!/pgbouncer=true/i.test(newUrl)) {
    newUrl += (newUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  if (/connection_limit=\d+/i.test(newUrl)) {
    newUrl = newUrl.replace(/connection_limit=\d+/i, `connection_limit=${limit}`);
  } else {
    newUrl += (newUrl.includes('?') ? '&' : '?') + `connection_limit=${limit}`;
  }
  if (!/prepared_statements=false/i.test(newUrl)) {
    newUrl += (newUrl.includes('?') ? '&' : '?') + 'prepared_statements=false';
  }
  process.env.DATABASE_URL = newUrl;
})();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['warn', 'error'],
    datasources: {
      db: { url: process.env.DATABASE_URL as string },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;