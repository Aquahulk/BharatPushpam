import { PrismaClient } from '@prisma/client';

// Attach PrismaClient to global in dev to avoid exhausting connections
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Workaround for Neon/pgBouncer "cached plan must not change result type"
// Disable prepared statements via connection string parameters at runtime.
(() => {
  const url = process.env.DATABASE_URL || '';
  if (!url) return;
  const limit = String(process.env.DB_CONNECTION_LIMIT || (process.env.NODE_ENV === 'development' ? 5 : 1));
  let newUrl = url;
  // Ensure pgbouncer=true
  if (!/pgbouncer=true/i.test(newUrl)) {
    newUrl += (newUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  // Add or replace connection_limit
  if (/connection_limit=\d+/i.test(newUrl)) {
    newUrl = newUrl.replace(/connection_limit=\d+/i, `connection_limit=${limit}`);
  } else {
    newUrl += (newUrl.includes('?') ? '&' : '?') + `connection_limit=${limit}`;
  }
  // Ensure prepared_statements=false
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


