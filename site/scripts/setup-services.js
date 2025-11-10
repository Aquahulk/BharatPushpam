// Seed demo services for booking portal
// Run with: node scripts/setup-services.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const services = [
    {
      name: 'Garden Services',
      description: 'Regular garden maintenance, pruning, and soil health improvement.',
      priceMin: 499,
      imagePublicId: 'services/garden-services'
    },
    {
      name: 'Kitchen Gardening',
      // Updated: tagline + description
      description: 'Eat fresh, eat home-grown — bring your kitchen garden to life. We help you grow fresh, chemical-free vegetables and herbs right in your balcony, terrace, or backyard.',
      // Updated: monthly maintenance starts at ₹300 per vegetable
      priceMin: 300,
      imagePublicId: 'services/kitchen-gardening'
    },
    {
      name: 'Plants on Rent',
      description: 'Short and long-term plant rentals for offices, events, and functions.',
      priceMin: 999,
      imagePublicId: 'services/plants-on-rent'
    },
    {
      name: 'Plant Hostel Service',
      description: 'We take care of your plants while you’re away and return them healthy.',
      priceMin: 599,
      imagePublicId: 'services/plant-hostel-service'
    },
    {
      name: 'Landscape Design',
      description: 'Custom garden and landscape design, plant selection, and installation.',
      priceMin: 1499,
      imagePublicId: 'services/landscape-design'
    }
  ];

  for (const svc of services) {
    const slug = slugify(svc.name);
    await prisma.service.upsert({
      where: { slug },
      update: {
        description: svc.description,
        priceMin: svc.priceMin,
        imagePublicId: svc.imagePublicId
      },
      create: {
        name: svc.name,
        slug,
        description: svc.description,
        priceMin: svc.priceMin,
        imagePublicId: svc.imagePublicId
      }
    });
  }

  console.log('Seeded demo services');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });