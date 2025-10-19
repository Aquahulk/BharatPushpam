// Quick DB audit using PrismaClient to verify seeded/imported data
const { PrismaClient, DisplayAssetType } = require('@prisma/client');
const prisma = new PrismaClient();

async function countAll() {
  const [
    categories,
    products,
    variants,
    productImages,
    reviews,
    services,
    displayAssets,
    displayCategories,
    orders,
    orderItems,
    serviceBookings,
    siteSettings,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.variant.count(),
    prisma.productImage.count(),
    prisma.review.count(),
    prisma.service.count(),
    prisma.displayAsset.count(),
    prisma.displayCategory.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.serviceBooking.count(),
    prisma.siteSettings.count(),
  ]);

  return {
    categories,
    products,
    variants,
    productImages,
    reviews,
    services,
    displayAssets,
    displayCategories,
    orders,
    orderItems,
    serviceBookings,
    siteSettings,
  };
}

async function sampleProducts() {
  const items = await prisma.product.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      slug: true,
      price: true,
      stock: true,
      category: { select: { name: true, slug: true } },
      images: { take: 2, select: { publicId: true, alt: true, position: true } },
    },
  });
  return items;
}

async function sampleAssets() {
  const [logo, hero, banner] = await Promise.all([
    prisma.displayAsset.findMany({
      where: { type: DisplayAssetType.LOGO },
      take: 2,
      orderBy: { order: 'asc' },
      select: { id: true, title: true, publicId: true, url: true, locale: true }
    }),
    prisma.displayAsset.findMany({
      where: { type: DisplayAssetType.HERO },
      take: 2,
      orderBy: { order: 'asc' },
      select: { id: true, title: true, publicId: true, url: true, locale: true }
    }),
    prisma.displayAsset.findMany({
      where: { type: DisplayAssetType.BANNER },
      take: 2,
      orderBy: { order: 'asc' },
      select: { id: true, title: true, publicId: true, url: true, locale: true }
    }),
  ]);
  return { logo, hero, banner };
}

async function main() {
  const counts = await countAll();
  const products = await sampleProducts();
  const assets = await sampleAssets();

  console.log('=== Prisma DB Audit Summary ===');
  console.table(counts);

  console.log('\nSample Products (3):');
  for (const p of products) {
    console.log(`- ${p.name} [${p.slug}] | ₹${p.price} | stock=${p.stock} | category=${p.category?.name}`);
    if (p.images?.length) {
      for (const img of p.images) {
        console.log(`  • image: publicId=${img.publicId} alt=${img.alt ?? ''} pos=${img.position}`);
      }
    }
  }

  console.log('\nSample Display Assets:');
  console.log('LOGO:', assets.logo.length, assets.logo.map(a => a.publicId || a.url));
  console.log('HERO:', assets.hero.length, assets.hero.map(a => a.publicId || a.url));
  console.log('BANNER:', assets.banner.length, assets.banner.map(a => a.publicId || a.url));

  const missing = [];
  if (counts.products === 0) missing.push('Products');
  if (counts.categories === 0) missing.push('Categories');
  if (counts.services === 0) missing.push('Services');
  if (counts.displayAssets === 0) missing.push('Display Assets');

  if (missing.length) {
    console.log('\n⚠️ Missing or empty datasets:', missing.join(', '));
    console.log('Consider running:');
    console.log('- npm run import:products');
    console.log('- node scripts/setup-services.js');
    console.log('- node scripts/setup-sample-images.js (then images:upload + images:update-db)');
  } else {
    console.log('\n✅ Key datasets appear populated.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });