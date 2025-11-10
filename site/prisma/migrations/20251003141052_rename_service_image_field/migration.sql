/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Service` table. All the data in the column will be lost.

*/
-- RedefineTables (PostgreSQL equivalent)
ALTER TABLE "Service" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "imagePublicId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");
