-- RedefineTables (PostgreSQL equivalent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOnHold" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DisplayAsset_type_locale_order_idx" ON "DisplayAsset"("type", "locale", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_email_createdAt_idx" ON "Order"("email", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_categoryId_createdAt_idx" ON "Product"("categoryId", "createdAt");
