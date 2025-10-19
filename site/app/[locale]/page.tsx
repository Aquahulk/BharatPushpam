import Link from 'next/link';
import CategoryMarquee from '@/app/components/CategoryMarquee';
import LeafSway from '@/app/components/LeafSway';
import ReviewsSection from '@/app/components/ReviewsSection';
import ReactiveGradient from '@/app/components/ReactiveGradient';
import Image from 'next/image';
import { getSettings } from '@/app/lib/settings';
import { prisma } from '@/app/lib/prisma';
import { unstable_cache } from 'next/cache';
import { buildCloudinaryUrl, getPlaceholderImage } from '@/app/lib/cloudinary';
import { Reveal, Tilt, Parallax } from '@/app/components/Interactive';
import { formatINR, paiseToRupees } from '@/app/lib/currency';
import HoldBanner from '@/app/components/HoldBanner';
import HeroVideoOverlay from '@/app/components/HeroVideoOverlay';
import { DisplayAssetType } from '@prisma/client';

export const revalidate = 300;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const settings = await getSettings();
  const whatsapp = settings.whatsappNumber;
  const waHref = `https://wa.me/91${whatsapp}`;

  // Cache heavy homepage data by locale
  const getHomeData = unstable_cache(
    async (loc: string) => {
      const categories = await prisma.category.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          products: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { images: { orderBy: { position: 'asc' } } }
          }
        }
      });

      type DisplayAssetBase = {
        id: string;
        url?: string | null;
        publicId?: string;
        title?: string | null;
        color?: string;
        description?: string | null;
      };
      let hero: DisplayAssetBase | null = null;
      let banners: Array<DisplayAssetBase & { description: string | null }> = [];
      let freshPlants: Array<DisplayAssetBase> = [];
      let aboutUs: Array<DisplayAssetBase> = [];
      try {
        const client = prisma;
        if (client.displayAsset) {
          hero = await client.displayAsset.findFirst({
            where: { type: DisplayAssetType.HERO, OR: [{ locale: loc }, { locale: null }] },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          });
          banners = await client.displayAsset.findMany({
            where: {
              OR: [
                { type: DisplayAssetType.BANNER, locale: loc },
                { type: DisplayAssetType.BANNER, locale: null },
                { type: DisplayAssetType.PROMO, locale: loc },
                { type: DisplayAssetType.PROMO, locale: null }
              ]
            },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            take: 6
          });
          freshPlants = await client.displayAsset.findMany({
            where: { type: DisplayAssetType.FRESH_PLANT, OR: [{ locale: loc }, { locale: null }] },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            take: 4
          });
          aboutUs = await client.displayAsset.findMany({
            where: { type: DisplayAssetType.ABOUT_US, OR: [{ locale: loc }, { locale: null }] },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            take: 3
          });
        }
      } catch {}

      return { categories, hero, banners, freshPlants, aboutUs };
    },
    ['home-data'],
    { revalidate: 300 }
  );

  const { categories, hero, banners, freshPlants, aboutUs } = await getHomeData(locale);

  // Managed display assets are returned via cached getHomeData

  // Map category slug/name to distinct container and card backgrounds
  const getContainerClassForCategory = (name: string, slug: string) => {
    const n = name.toLowerCase();
    const s = slug.toLowerCase();
    if (/pots|planters/.test(n) || /pots|planters/.test(s)) return 'cat-shade-brown';
    if (/indoor/.test(n) || /indoor/.test(s)) return 'cat-shade-teal';
    if (/outdoor/.test(n) || /outdoor/.test(s)) return 'cat-shade-emerald';
    if (/succulent|cactus/.test(n) || /succulent|cactus/.test(s)) return 'cat-shade-lime';
    if (/fragrant|herb|medicinal/.test(n) || /fragrant|herb|medicinal/.test(s)) return 'cat-shade-rose';
    if (/fruit/.test(n) || /fruit/.test(s)) return 'cat-shade-sky';
    if (/bonsai/.test(n) || /bonsai/.test(s)) return 'cat-shade-green';
    const fallback = ['cat-shade-emerald','cat-shade-green','cat-shade-teal','cat-shade-lime','cat-shade-sky','cat-shade-rose'];
    const idx = Math.abs((name + slug).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % fallback.length;
    return fallback[idx];
  };

  const getCardBgForCategory = (name: string, slug: string) => {
    const n = name.toLowerCase();
    const s = slug.toLowerCase();
    if (/pots|planters/.test(n) || /pots|planters/.test(s)) return 'card-bg-brown border-amber-200';
    if (/indoor/.test(n) || /indoor/.test(s)) return 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200';
    if (/outdoor/.test(n) || /outdoor/.test(s)) return 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200';
    if (/succulent|cactus/.test(n) || /succulent|cactus/.test(s)) return 'bg-gradient-to-br from-lime-50 to-lime-100 border-lime-200';
    if (/fragrant|herb|medicinal/.test(n) || /fragrant|herb|medicinal/.test(s)) return 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200';
    if (/fruit/.test(n) || /fruit/.test(s)) return 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200';
    if (/bonsai/.test(n) || /bonsai/.test(s)) return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200';
    const fallback = ['bg-gradient-to-br from-emerald-50 to-emerald-100','bg-gradient-to-br from-green-50 to-green-100','bg-gradient-to-br from-teal-50 to-teal-100','bg-gradient-to-br from-lime-50 to-lime-100','bg-gradient-to-br from-sky-50 to-sky-100','bg-gradient-to-br from-rose-50 to-rose-100'];
    const idx = Math.abs((name + slug).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % fallback.length;
    return `${fallback[idx]} border-emerald-200`;
  };

  return (
    <ReactiveGradient className="relative min-h-screen noise-overlay home-bg-shades">
      {/* Enhanced soft dot pattern overlay with floating particles */}
      <div aria-hidden className="soft-pattern" />
      {/* Plant overlays for modern green aesthetic (brought forward) */}
      <Parallax speed={0.12}><div aria-hidden className="plant leaf1 plant-top-right z-10" /></Parallax>
      <Parallax speed={0.10}><div aria-hidden className="plant monstera plant-bottom-left z-10" /></Parallax>
      <Parallax speed={0.14}><div aria-hidden className="plant leaf2 plant-top-left z-10" /></Parallax>
      <Parallax speed={0.08}><div aria-hidden className="plant palm plant-bottom-right z-10" /></Parallax>
      {/* Floating particle elements for unique motion */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-10 w-2 h-2 bg-green-300 rounded-full animate-bounce-slow animate-ping" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/2 right-20 w-1 h-1 bg-emerald-400 rounded-full animate-float animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-white/50 rounded-full animate-float-reverse animate-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-1/2 right-1/4 w-2 h-2 bg-green-200 rounded-full animate-bounce-slow animate-ping" style={{ animationDelay: '1s' }} />
      </div>
      {/* Hero Section - modern gradient with subtle 3D cards and parallax hint */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 left-16 opacity-80">
            <LeafSway />
          </div>
          <div className="absolute bottom-16 right-20 opacity-70" style={{ animationDelay: '1.2s' }}>
            <LeafSway />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <HoldBanner />
        </div>
        {/* banner background image (managed via admin if available) */}
        <Image
          src={hero?.url || (hero?.publicId ? buildCloudinaryUrl(hero.publicId, 1920, 800) : getPlaceholderImage(1920, 800, 'Lush Garden'))}
          alt={hero?.title || 'Banner background'}
          fill
          priority
          sizes="100vw"
          quality={92}
          className="object-cover"
        />
        {/* Jungle video overlay above banner image, behind text */}
        {true && (
          // lightweight overlay using Wix-hosted mp4 provided
          // pointer-events disabled so links remain clickable
          <HeroVideoOverlay />
        )}
        {/* Gradient mesh overlay above banner image for modern depth */}
        <div aria-hidden className="mesh-bg" />
        {/* Animated blobs for dynamic ambiance */}
        <div aria-hidden className="blob green" style={{ top: '10%', left: '5%' }} />
        <div aria-hidden className="blob blue" style={{ top: '20%', right: '10%' }} />
        {/* Replaced pink glow with warm orange to avoid pink hue */}
        <div aria-hidden className="blob orange" style={{ bottom: '15%', left: '15%' }} />
        <div aria-hidden className="blob orange" style={{ bottom: '5%', right: '20%' }} />
        {/* Enhanced gentle noise texture with subtle parallax */}
        <div aria-hidden className="noise" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-black/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '3s' }} />
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_40%,#000_40%,transparent_80%)]" />
        {/* soft blend into page gradient with shimmer */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-100 to-transparent">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slow" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 backdrop-blur-md border border-white/30 text-xs mb-4 animate-fade-in-up">
              <span>🌿 Premium Plants & Services</span>
              <span className="w-1 h-1 rounded-full bg-white/70" />
              <span>Free delivery over ₹999</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight text-balance animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Bring Nature Home with
              <span className="block text-white/90">Bharat Pushpam</span>
            </h1>
            <p className="text-white/85 mt-4 max-w-xl text-balance animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              Curated indoor & outdoor plants, designer planters, and expert maintenance. Freshly delivered, beautifully nurtured.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <Link href={`/${locale}/products`} className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-green-700 font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0] transition group">
                Shop Plants
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-green-700/20 text-white border border-white/30 hover:bg-white/20 transition">
                WhatsApp Support
              </a>
            </div>
          </Reveal>

          {/* 3D product preview cards with enhanced glow */}
          <div className="grid grid-cols-2 gap-4 perspective-1000">
            {(() => { const previewShades = ['from-emerald-50 to-emerald-100','from-green-50 to-green-100','from-teal-50 to-teal-100','from-lime-50 to-lime-100']; return (freshPlants.length ? freshPlants : [0,1,2,3]).map((plant, i) => {
              // Handle both DisplayAsset objects and placeholder numbers
              const isPlaceholder = typeof plant === 'number';
              return (
                <Tilt key={isPlaceholder ? i : plant.id} className={`group relative h-40 rounded-2xl bg-gradient-to-br ${previewShades[i % previewShades.length]} border border-green-100 shadow-lg overflow-hidden tilt-base animate-fade-in-up`} style={{ animationDelay: `${0.2 * i}s` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-green-50/80" />
                  <div className="relative h-full w-full flex items-center justify-center">
                    <Image
                      src={isPlaceholder ? getPlaceholderImage(240, 160, 'Fresh Plant') : (plant.url ?? (plant.publicId ? buildCloudinaryUrl(plant.publicId) : getPlaceholderImage(240, 160, 'Fresh Plant')))}
                      alt={isPlaceholder ? "Fresh Plant" : (plant.title || "Fresh Plant")}
                      width={240}
                      height={160}
                      className="object-cover rounded-xl drop-shadow-sm"
                    />
                  </div>
                  {/* Subtle inner glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition blur-xl rounded-2xl" />
                </Tilt>
              );
            }); })()}
          </div>
        </div>
      </section>

      {/* About Us - playful and fun with floating icons */}
      <section className="relative py-14 section-teal">
        <div aria-hidden className="noise absolute inset-0 pointer-events-none" />
        {/* Floating leaf icons for whimsy */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-8 h-8 text-green-400 animate-float" style={{ animationDuration: '6s' }}>🍃</div>
          <div className="absolute bottom-20 right-20 w-6 h-6 text-emerald-500 animate-float-reverse" style={{ animationDuration: '8s', animationDelay: '1s' }}>🌿</div>
        </div>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 animate-fade-in-left">About Bharat Pushpam</h2>
            <p className="mt-3 text-gray-700 text-balance animate-fade-in-left" style={{ animationDelay: '0.2s' }}>
              We blend botany with design to bring joy to homes and workplaces. From curated plants to premium planters and care services, we make greenery simple, beautiful, and fun.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 animate-fade-in-left" style={{ animationDelay: '0.4s' }}>
              <span className="chip chip-small">Eco-friendly</span>
              <span className="chip chip-small">Made in India</span>
              <span className="chip chip-small">Expert Care</span>
              <span className="chip chip-small">Community</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 animate-fade-in-right">
            <div className="relative h-40 rounded-2xl overflow-hidden animated-gradient-border shadow card-hover bg-white">
              <Image 
                src={aboutUs[0]?.url || (aboutUs[0]?.publicId ? buildCloudinaryUrl(aboutUs[0].publicId, 800, 300) : getPlaceholderImage(800, 300, 'Nursery'))} 
                alt={aboutUs[0]?.title || "Our nursery"} 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={85}
                className="object-cover" 
              />
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition shine" />
            </div>
            <div className="relative h-40 rounded-2xl overflow-hidden animated-gradient-border shadow card-hover bg-white">
              <Image 
                src={aboutUs[1]?.url || (aboutUs[1]?.publicId ? buildCloudinaryUrl(aboutUs[1].publicId, 800, 300) : getPlaceholderImage(800, 300, 'Team'))} 
                alt={aboutUs[1]?.title || "Our team"} 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={85}
                className="object-cover" 
              />
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition shine" />
            </div>
            <div className="relative h-40 rounded-2xl overflow-hidden animated-gradient-border shadow card-hover bg-white col-span-2">
              <Image 
                src={aboutUs[2]?.url || (aboutUs[2]?.publicId ? buildCloudinaryUrl(aboutUs[2].publicId, 1200, 300) : getPlaceholderImage(1200, 300, 'Greenhouse'))} 
                alt={aboutUs[2]?.title || "Our greenhouse"} 
                fill 
                sizes="(max-width: 768px) 100vw, 1000px"
                quality={85}
                className="object-cover" 
              />
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition shine" />
            </div>
          </div>
          {/* decorative fun shapes with enhanced blur */}
          <div aria-hidden className="hidden md:block absolute -z-10 -top-10 -left-10 w-40 h-40 rounded-full bg-emerald-200 blur-3xl animate-pulse-slow" />
          <div aria-hidden className="hidden md:block absolute -z-10 -bottom-10 -right-10 w-40 h-40 rounded-full bg-green-200 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
      </section>

      

      {/* Category marquee - auto-scrolling badges */}
      <section className="py-2 section-sky">
        <div className="max-w-6xl mx-auto px-4">
          <CategoryMarquee locale={locale} categories={categories} />
        </div>
      </section>

      {/* Why Choose + KPIs with animated counters */}
      <section className="py-12 section-amber">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 text-balance animate-fade-in-up">Why choose Bharat Pushpam?</h2>
            <p className="text-gray-600 mt-2 text-balance animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Trusted quality, expert care, and joyful unboxing.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Free Delivery', desc: 'On orders over ₹999', icon: '🚚', count: '500+' },
              { title: 'Expert Maintenance', desc: 'Professional plant care', icon: '🧑‍🌾', count: '1K+' },
              { title: 'Premium Quality', desc: 'Handpicked and healthy', icon: '✨', count: '99%' },
            ].map((f, i) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition bg-gradient-to-br from-white to-green-50/30 glass animate-fade-in-up" style={{ animationDelay: `${0.2 * i}s` }}>
                <div className="text-3xl mb-3 animate-bounce-slow">{f.icon}</div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-green-600 font-bold text-lg mb-1">{f.count}</p>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      

      {/* Category carousels with enhanced shine and badges */}
      <section className="py-8 section-rose">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          {categories.filter(c => c.products.length > 0).map((cat) => (
            <div key={cat.id} className={`rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ${getContainerClassForCategory(cat.name, cat.slug)}`}>
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 animate-fade-in-left">
                  {cat.name}
                </h3>
                <Link href={`/${locale}/products?category=${cat.slug}`} className="text-green-700 hover:underline text-sm animate-fade-in-right">View all</Link>
              </div>
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {cat.products.map((p) => {
                    const img = p.images[0]?.publicId;
                    const src = img ? buildCloudinaryUrl(img, 480, 360) : getPlaceholderImage(480, 360, p.name);
                    return (
                      <Link key={p.id} href={`/${locale}/products/${p.slug}`} className="min-w-[240px] md:min-w-[280px] group">
                        <div className={`relative rounded-2xl ${getCardBgForCategory(cat.name, cat.slug)} shadow overflow-hidden card-hover`}>
                          {/* Dynamic badge with rotation */}
                          <div className="absolute top-2 left-2 chip chip-small bg-gradient-to-r from-green-700/10 to-emerald-700/10 border-green-700/20 text-green-800 rotate-[-2deg] animate-subtle-wobble">Popular</div>
                          <div className="relative h-40 w-full overflow-hidden">
                            <Image src={src} alt={p.name} fill className="object-cover group-hover:scale-[1.03] transition" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" quality={90} />
                            {/* Enhanced shine overlay with particles */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition shine">
                              <div className="absolute top-2 right-2 w-1 h-1 bg-white rounded-full animate-ping" />
                              <div className="absolute bottom-2 left-2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="font-semibold text-gray-900 line-clamp-1">{p.name}</div>
                            <div className="text-green-700 font-bold">{formatINR(paiseToRupees(p.price ?? 0))}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Promotional banners (admin-managed) with glassmorphism */}
      <section className="py-12 section-emerald">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6">
          {(banners.length ? banners : [
            { id: 'placeholder-1', title: 'Summer Green Sale', description: 'Up to 25% off', color: 'from-emerald-700 to-emerald-600' },
            { id: 'placeholder-2', title: 'New Arrivals', description: 'Fresh stock weekly', color: 'from-green-700 to-green-600' },
            { id: 'placeholder-3', title: 'Care & Maintenance', description: 'Plans starting ₹499', color: 'from-teal-700 to-teal-600' },
          ]).map((b, i) => (
            <div key={b.id || b.title} className={`relative rounded-2xl p-6 text-white ${b.color ? `bg-gradient-to-br ${b.color}` : 'bg-gradient-to-br from-emerald-700 to-emerald-600'} overflow-hidden backdrop-blur-md border border-white/20 animate-fade-in-up`} style={{ animationDelay: `${0.2 * i}s` }}>
              {b.url || b.publicId ? (
                <Image src={b.url || (b.publicId ? buildCloudinaryUrl(b.publicId) : getPlaceholderImage(400, 300, 'Promo'))} alt={b.title || 'Promo'} fill className="object-cover" />
              ) : (
                <div aria-hidden className="noise" />
              )}
              <h3 className="text-xl font-bold relative z-10">{b.title || 'Promo'}</h3>
              <p className="text-white/90 relative z-10">{b.description || ''}</p>
              <div className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-white/20 text-white font-semibold shadow-sm relative z-10 hover:bg-white/30 transition">Explore</div>
              {/* Inner glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl opacity-50" />
            </div>
          ))}
        </div>
      </section>

      {/* Featured collections with unique wave patterns */}
      <section className="py-10 section-lime">
        <div aria-hidden className="plant leaf1 plant-center-left z-10" />
        <div aria-hidden className="plant fern plant-center-right z-10" />
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {(() => { const featShades = ['from-emerald-50 to-emerald-100','from-green-50 to-green-100','from-teal-50 to-teal-100','from-lime-50 to-lime-100']; return [
            { t: 'Indoor Elegance' },
            { t: 'Outdoor Classics' },
            { t: 'Low Maintenance' },
            { t: 'Premium Planters' },
          ].map((c, i) => (
            <div key={c.t} className={`group relative h-36 rounded-2xl overflow-hidden border border-green-100 bg-gradient-to-br ${featShades[i % featShades.length]} animate-fade-in-up`} style={{ animationDelay: `${0.1 * i}s` }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition shine" />
              <div className="absolute inset-0 pointer-events-none noise" />
              {/* Wave overlay for uniqueness */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition" />
              <div className="absolute bottom-3 left-3 font-semibold text-green-800">{c.t}</div>
            </div>
          )); })()}
        </div>
      </section>

      {/* Happy Plant Parents - Reviews with post tab (moved here) */}
      <section className="py-14 section-sky">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 text-balance animate-fade-in-up">Happy Plant Parents</h2>
            <p className="text-gray-600 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Real reviews from our customers</p>
          </div>
          <ReviewsSection locale={locale} />
        </div>
      </section>

      {/* New: Newsletter Signup - Modern floating form */}
      <section className="py-12 bg-gradient-to-r from-emerald-50 to-green-50 relative overflow-hidden">
        <div aria-hidden className="noise absolute inset-0 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in-up">Stay in the Loop</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Get exclusive plant tips, deals, and new arrival alerts straight to your inbox.</p>
          <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-green-100 animate-float">
            <form className="space-y-4">
              <input type="email" placeholder="Enter your email" className="w-full px-4 py-3 rounded-xl border border-green-200 focus:border-green-500 focus:outline-none transition" />
              <button type="submit" className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 transition shadow-lg">Subscribe Now</button>
            </form>
          </div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-green-200 rounded-full blur-xl animate-pulse-slow" />
        </div>
      </section>

      {/* Enhanced Language Switcher with glow */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-green-200 p-0.5 flex gap-0.5 animate-float">
          <Link href="/en" className="px-3 py-1.5 text-xs font-medium rounded-full hover:bg-green-100 transition-all duration-300 text-gray-700 hover:text-green-700">EN</Link>
          <Link href="/hi" className="px-3 py-1.5 text-xs font-medium rounded-full hover:bg-green-100 transition-all duration-300 text-gray-700 hover:text-green-700">हिंदी</Link>
          <Link href="/mr" className="px-3 py-1.5 text-xs font-medium rounded-full hover:bg-green-100 transition-all duration-300 text-gray-700 hover:text-green-700">मराठी</Link>
        </div>
        {/* Bottom glow removed per request */}
      </div>
    </ReactiveGradient>
  );
}