import { prisma } from '@/app/lib/prisma';
import Image from 'next/image';
import BookingWidget from './BookingWidget';
import { buildCloudinaryUrl, getPlaceholderImage } from '@/app/lib/cloudinary';
import HoldBanner from '@/app/components/HoldBanner';
import Link from 'next/link';

export default async function ServiceDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, locale } = await params;
  const service = await prisma.service.findUnique({ where: { slug } });

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Unavailable</h1>
          <p className="text-gray-600 mb-8">This service is currently unavailable. Our other garden services are still available for booking.</p>
          <Link 
            href={`/${locale}/services`} 
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-300 font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            View All Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Hero / Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 noise-overlay pointer-events-none"></div>
        <Image src="/plam-left.png" alt="" width={160} height={160} className="hidden md:block absolute bottom-0 left-0 translate-y-10 -translate-x-6 opacity-70 leaf-sway" />
        <Image src="/palm-right.png" alt="" width={180} height={180} className="hidden md:block absolute -top-6 right-0 translate-x-6 opacity-70 leaf-sway" />
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{service.name}</h1>
              <p className="text-green-100 mb-4">Professional 2-hour sessions • Expert tools • Flexible timing</p>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 text-sm">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                From ₹{service.priceMin} per session
              </div>
              {service.slug === 'garden-services' && (
                <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                  Free Inspection • Pay after inspection & plan selection
                </div>
              )}
            </div>
            <div className="flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={service.imagePublicId ? buildCloudinaryUrl(service.imagePublicId, 1000) : getPlaceholderImage(800, 600, service.name)}
                alt={service.name}
                className="w-full rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">About this service</h2>
          <p className="text-gray-700 leading-relaxed mb-6">{service.description}</p>

          {/* Kitchen Gardening specific details */}
          {service.slug === 'kitchen-gardening' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
                <div className="font-bold text-emerald-900 mb-1">Eat fresh, eat home-grown</div>
                <p className="text-emerald-800 text-sm">Bring your kitchen garden to life — grow chemical-free vegetables and herbs at home.</p>
              </div>
              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">What you can grow</h3>
                <p className="text-sm text-gray-700">Leafy Greens: Palak, Methi, Coriander, Pudina, Spinach</p>
                <p className="text-sm text-gray-700">Fruity Vegetables: Tomato, Brinjal, Chilli, Capsicum, Lady Finger, etc.</p>
              </div>
              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Setup & Pricing</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>One-time setup: Variable, based on number and type of vegetables selected</li>
                  <li>Monthly maintenance: ₹300 per vegetable per month</li>
                </ul>
              </div>
              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Includes</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>Customized vegetable & herb garden setup</li>
                  <li>Organic soil and fertilizer mix</li>
                  <li>Seasonal planting & harvesting guidance</li>
                  <li>Drip irrigation (optional add-on)</li>
                  <li>Monthly maintenance & support</li>
                </ul>
              </div>
            </div>
          )}

          {/* Plants on Rent specific details */}
          {service.slug === 'plants-on-rent' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
                <div className="font-bold text-green-900 mb-1">Green décor made easy</div>
                <p className="text-green-800 text-sm">Rent plants that breathe life into your space — with maintenance and free replacements included.</p>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Pricing & Rental Plans</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>Basic Plan: 5 plants</li>
                  <li>Cost: ₹1/day/plant = ₹150/month total</li>
                  <li>Security Deposit (Refundable): ₹1,000/plant × 5 = ₹5,000 total</li>
                  <li>Swap Option: Swap any or all plants every month — Free</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">Choose from 250+ indoor and outdoor varieties ranging from ₹50 to ₹2,000 and 4” to 50” sizes.</p>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Key Highlights</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>No charge for plant damage</li>
                  <li>Free plant replacement within 2 working days</li>
                  <li>Swap plants monthly — experience 60 different plants in a year</li>
                  <li>Maintenance included in rent</li>
                  <li>Perfect for corporate offices, homes, and events</li>
                </ul>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Includes</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>Short-term & long-term rental options</li>
                  <li>Regular maintenance & plant replacement</li>
                  <li>Indoor & outdoor plant selection</li>
                  <li>Customized décor for events/offices</li>
                </ul>
              </div>
            </div>
          )}

          {/* Plant Hostel specific details */}
          {service.slug === 'plant-hostel-service' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
                <div className="font-bold text-green-900 mb-1">“While you’re away, your plants stay happy with us.”</div>
                <p className="text-green-800 text-sm">Going on vacation or too busy to care for your plants? We provide Plant Hostel Service — where we take care of your plants like our own until you’re ready to bring them back.</p>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>Per Day: ₹10 per plant per day</li>
                  <li>Delivery: Minimal pickup & drop charge</li>
                </ul>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Includes</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>Safe plant pickup & drop</li>
                  <li>Daily watering and sunlight exposure</li>
                  <li>Humidity & temperature control</li>
                  <li>Plant health monitoring</li>
                  <li>Periodic updates (optional via WhatsApp)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Existing Garden Services info block */}
          {service.slug === 'garden-services' && (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
               <div className="flex items-start gap-3">
                 <div className="text-green-600 text-2xl">🌿</div>
                 <div>
                   <div className="font-bold text-green-900 mb-1">How Garden Services Works</div>
                   <ul className="text-green-800 text-sm space-y-2">
                     <li>1) Book a <span className="font-semibold">Free Inspection</span> for your garden.</li>
                     <li>2) Our expert inspects and recommends the right maintenance plan.</li>
                     <li>3) Choose a plan (per-visit or monthly) and complete payment.</li>
                     <li>4) We schedule visits and keep your garden in top shape.</li>
                   </ul>
                 </div>
               </div>
             </div>
           )}
           {/* Existing generic info cards */}
           <div className="grid grid-cols-1 gap-6">
               <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4 reveal reveal-in" style={{animationDelay:'100ms'}}>
                 <h3 className="font-semibold text-gray-900 mb-2">What’s included</h3>
                 <p className="text-sm text-gray-600">Tools, cleanup, and care recommendations</p>
               </div>
               <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4 reveal reveal-in" style={{animationDelay:'250ms'}}>
                 <h3 className="font-semibold text-gray-900 mb-2">Timing</h3>
                 <p className="text-sm text-gray-600">2-hour sessions, flexible slots</p>
               </div>
               <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4 reveal reveal-in" style={{animationDelay:'400ms'}}>
                 <h3 className="font-semibold text-gray-900 mb-2">Satisfaction</h3>
                 <p className="text-sm text-gray-600">Guaranteed service quality</p>
               </div>
             </div>
           </div>
           <div>
             <BookingWidget serviceSlug={service.slug} />
           </div>
         </div>
       </div>      );
    }
