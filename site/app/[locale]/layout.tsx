import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../globals.css';
import Link from 'next/link';
import { getSessionFromCookies } from '@/app/lib/auth';
import Image from 'next/image';
import { prisma } from '@/app/lib/prisma';
import { buildCloudinaryUrl } from '@/app/lib/cloudinary-server';
import { getSettings } from '@/app/lib/settings';
import MobileMenu from '@/app/components/MobileMenu';
import { DisplayAssetType } from '@prisma/client';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Bharat Pushpam - Plants, Planters & Garden Services',
    description: 'Shop indoor plants, outdoor plants, planters, and garden services. Free delivery on orders above ₹999. Expert plant care and maintenance.',
    keywords: 'plants, planters, garden services, indoor plants, outdoor plants, air purifying plants, plant maintenance',
    openGraph: {
      title: 'Bharat Pushpam - Plants, Planters & Garden Services',
      description: 'Shop indoor plants, outdoor plants, planters, and garden services. Free delivery on orders above ₹999.',
      url: 'https://bharatpushpam.com',
      siteName: 'Bharat Pushpam',
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Bharat Pushpam - Plants, Planters & Garden Services',
      description: 'Shop indoor plants, outdoor plants, planters, and garden services. Free delivery on orders above ₹999.',
    },
    alternates: {
      canonical: `https://bharatpushpam.com/${locale}`,
      languages: {
        'en': 'https://bharatpushpam.com/en',
        'hi': 'https://bharatpushpam.com/hi',
        'mr': 'https://bharatpushpam.com/mr',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  const settings = await getSettings();
  const social = settings.about?.social || {};
  const socialEntries = Object.entries(social).filter(([, url]) => typeof url === 'string' && url);
  const icons: Record<string, React.ReactElement> = {
    instagram: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm0 2h10c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3zm12 1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>
    ),
    facebook: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 10-11.6 9.9v-7h-2.7V12h2.7V9.7c0-2.7 1.6-4.2 4-4.2 1.2 0 2.4.2 2.4.2v2.6h-1.4c-1.3 0-1.7.8-1.7 1.6V12h3l-.5 2.9h-2.5v7A10 10 0 0022 12z" /></svg>
    ),
    twitter: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.26 4.26 0 001.87-2.35 8.54 8.54 0 01-2.7 1.03 4.26 4.26 0 00-7.26 3.89A12.1 12.1 0 013 4.8a4.26 4.26 0 001.32 5.68c-.67-.02-1.3-.21-1.85-.51v.05a4.26 4.26 0 003.42 4.17c-.6.16-1.23.18-1.84.07a4.27 4.27 0 003.98 2.96A8.54 8.54 0 013 19.54a12.06 12.06 0 006.53 1.91c7.84 0 12.12-6.49 12.12-12.12 0-.18-.01-.36-.02-.54A8.65 8.65 0 0022.46 6z" /></svg>
    ),
    whatsapp: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.94 14.5L2 22l5.62-1.48A10 10 0 1012 2zm5.16 13.6c-.23.65-1.35 1.24-1.86 1.31-.5.07-1.16.1-1.87-.12-.43-.13-.98-.31-1.7-.65a9.26 9.26 0 01-3.27-2.96c-.39-.56-.69-1.03-.92-1.45-.3-.52-.03-1.2.22-1.47.2-.21.45-.48.73-.49.18 0 .35-.01.51.01.16.02.39-.06.6.46.23.53.78 1.83.85 1.97.07.14.11.3.02.47-.09.17-.13.27-.26.42-.13.15-.28.34-.4.46-.13.13-.26.27-.11.54.14.27.6 1 1.3 1.62.9.8 1.66 1.07 1.93 1.2.27.13.43.11.58-.07.15-.18.67-.78.85-1.05.18-.27.36-.22.6-.13.24.09 1.55.73 1.82.86.27.13.45.2.52.32.08.12.08.67-.15 1.32z"/></svg>
    ),
    linkedin: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 102.5 6a2.5 2.5 0 002.48-2.5zM3 8h4v12H3V8zm6 0h3.6v1.7h.05c.5-.9 1.7-1.8 3.5-1.8 3.7 0 4.4 2.4 4.4 5.4V20h-4v-5.2c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H9V8z"/></svg>
    ),
    youtube: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.8 3.5 12 3.5 12 3.5s-7.8 0-9.4.6A3 3 0 00.5 6.2C0 7.8 0 12 0 12s0 4.2.5 5.8a3 3 0 002.1 2.1c1.6.6 9.4.6 9.4.6s7.8 0 9.4-.6a3 3 0 002.1-2.1c.5-1.6.5-5.8.5-5.8s0-4.2-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
    ),
  };
  
  // Fetch dynamic logo (managed via admin Home Content)
  let logo: { url?: string; publicId?: string; title?: string } | null = null;
  try {
    const client = prisma;
    if (client.displayAsset) {
      const logoData = await client.displayAsset.findFirst({
        where: {
          type: DisplayAssetType.LOGO,
          OR: [{ locale }, { locale: null }]
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });
      
      if (logoData) {
        logo = {
          url: logoData.url ?? undefined,
          publicId: logoData.publicId,
          title: logoData.title ?? undefined
        };
      }
    }
  } catch {}
  const logoSrc = logo?.url || (logo?.publicId ? buildCloudinaryUrl(logo.publicId, 64, 64) : null);
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Bharat Pushpam",
            "url": "https://bharatpushpam.com",
            "logo": logoSrc || "https://bharatpushpam.com/logo.png",
            "description": "Plants, planters, and garden services",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+91-7755963959",
              "contactType": "customer service",
              "availableLanguage": ["English", "Hindi", "Marathi"]
            },
            "sameAs": [
              "https://wa.me/917755963959"
            ]
          })
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              function updateCartCount() {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
                const cartCountElement = document.getElementById('cart-count');
                if (cartCountElement) {
                  cartCountElement.textContent = cartCount.toString();
                }
              }
              updateCartCount();
              window.addEventListener('storage', updateCartCount);
            }
          `
        }}
      />
          <header className="sticky top-0 z-50 w-full border-b topbar-green shadow-lg print:hidden">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center">
                  <Link href={`/${locale}`} className="flex items-center space-x-2">
                    {logoSrc ? (
                      <Image src={logoSrc} alt={logo?.title || 'Logo'} width={24} height={24} className="rounded-full" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-emerald-50" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <span className="text-base font-bold text-emerald-50">Bharat Pushpam</span>
  </Link>
                </div>
                
                <nav className="hidden md:flex items-center space-x-6">
                  <Link href={`/${locale}/products`} prefetch={false} className="text-sm text-emerald-100 hover:text-white transition-colors">
                    Products
                  </Link>
                  <Link href={`/${locale}/services`} prefetch={false} className="text-sm text-emerald-100 hover:text-white transition-colors">
                    Services
                  </Link>
                  <Link href={`/${locale}/account/orders`} prefetch={false} className="text-sm text-emerald-100 hover:text-white transition-colors">
                    My Orders
                  </Link>
                  <Link href={`/${locale}/about`} prefetch={false} className="text-sm text-emerald-100 hover:text-white transition-colors">
                    About
                  </Link>
                  <Link href={`/${locale}/contact`} prefetch={false} className="text-sm text-emerald-100 hover:text-white transition-colors">
                    Contact
                  </Link>
                </nav>
                
                <div className="flex items-center space-x-3">
                  {/** Mobile-only menu (three-dot) placed beside Cart */}
                  {/* Import placed at top: MobileMenu */}
                  
                  {session ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-emerald-100">Hi, {session.name || session.email}</span>
                      <form action={`/api/auth/logout`} method="POST">
                        <button type="submit" className="text-sm text-emerald-100 hover:text-white transition-colors">
                          Logout
                        </button>
                      </form>
                    </div>
                  ) : (
                    <Link href={`/${locale}/login`} prefetch={false} className="text-sm text-emerald-100 hover:text-white transition-colors">
                      Login
                    </Link>
                  )}
                  <Link href={`/${locale}/search`} className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-white/15 text-emerald-50 rounded-md border border-white/30 hover:bg-white/25 transition-colors">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <span className="text-xs font-medium">Search</span>
                  </Link>
                  <a href="https://wa.me/917755963959" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-white/15 text-emerald-50 rounded-md border border-white/30 hover:bg-white/25 transition-colors">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4a2 2 0 00-2 2v16l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                    </svg>
                    <span className="text-xs font-medium">WhatsApp</span>
                  </a>
                  <Link href={`/${locale}/cart`} prefetch={false} className="relative flex items-center space-x-1 px-3 py-1.5 bg-white text-green-800 rounded-md border border-green-700 hover:bg-emerald-50 transition-colors">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    <span className="text-xs font-medium">Cart</span>
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs text-white flex items-center justify-center" id="cart-count">0</span>
                  </Link>
                  {/* Mobile menu trigger */}
                  {/* eslint-disable-next-line @next/next/no-document-import-in-page */}
                  {/* The component hides on md+ via its own classes */}
                  <MobileMenu locale={locale} />
                </div>
              </div>
            </div>
          </header>
          <main className="pt-2">{children}</main>
          <footer className="mt-12 footer-dark relative print:hidden">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold mb-2 text-emerald-50">Bharat Pushpam</h3>
                  <p className="text-sm text-emerald-100/80">
                    Your trusted partner for plants, planters, and garden services.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-emerald-50">Quick Links</h3>
                  <div className="space-y-1 text-sm">
                    <Link href={`/${locale}/products`} className="block text-emerald-100 hover:text-white transition">Products</Link>
                    <Link href={`/${locale}/services`} className="block text-emerald-100 hover:text-white transition">Services</Link>
                    <Link href={`/${locale}/account/orders`} className="block text-emerald-100 hover:text-white transition">My Orders</Link>
                    <Link href={`/${locale}/about`} className="block text-emerald-100 hover:text-white transition">About</Link>
                    <Link href={`/${locale}/contact`} className="block text-emerald-100 hover:text-white transition">Contact</Link>
                    <Link href={`/${locale}/privacy`} className="block text-emerald-100 hover:text-white transition">Privacy Policy</Link>
                    <Link href={`/${locale}/terms`} className="block text-emerald-100 hover:text-white transition">Terms & Conditions</Link>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-emerald-50">Contact</h3>
                  <div className="space-y-1 text-sm text-emerald-100/80">
                    <p>WhatsApp: <a href="https://wa.me/917755963959" className="text-emerald-200 hover:text-white">7755963959</a></p>
                    <p>Free delivery on orders above ₹999</p>
                  </div>
                  {socialEntries.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-semibold mb-2 text-emerald-50 text-sm">Follow Us</h4>
                      <div className="flex flex-wrap gap-3 text-sm items-center">
                        {socialEntries.map(([name, url]) => (
                          <a key={name} href={url as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-emerald-100 hover:text-white">
                            {icons[name] || (
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.41-1.42 9.3-9.29H14V3z" />
                                <path d="M5 5h5v2H7v10h10v-3h2v5H5V5z" />
                              </svg>
                            )}
                            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 pt-4 text-center text-sm text-emerald-100/70 border-t border-white/10">
                <p>&copy; 2024 Bharat Pushpam. All rights reserved.</p>
              </div>
            </div>
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 opacity-70" />
          </footer>
    </>
  );
}
