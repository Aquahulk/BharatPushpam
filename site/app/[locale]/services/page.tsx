import Link from 'next/link';
import { prisma } from '@/app/lib/prisma';
import { buildCloudinaryUrl, getPlaceholderImage } from '@/app/lib/cloudinary';
import Image from 'next/image'

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 noise-overlay pointer-events-none"></div>
        <Image src="/plam-left.png" alt="" width={180} height={180} className="hidden md:block absolute bottom-0 left-0 translate-y-12 -translate-x-8 opacity-70 leaf-sway" />
        <Image src="/palm-right.png" alt="" width={200} height={200} className="hidden md:block absolute -top-8 right-0 translate-x-8 opacity-70 leaf-sway" />
        <Image src="/hanging-top-right.png" alt="" width={160} height={160} className="hidden md:block absolute -top-10 right-10 opacity-80 leaf-sway" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in-up">
            Our Premium Services
          </h1>
          <p className="text-xl md:text-2xl text-green-100 mb-8 animate-fade-in-up animation-delay-200">
            Transform your space with our expert garden services
          </p>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 text-sm animate-fade-in-up animation-delay-400">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            Available 9:00 AM – 9:00 PM • 2-hour sessions
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      {/* Services Grid */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Service</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Professional garden services tailored to your needs. Book your preferred time slot and let our experts transform your space.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={service.id} 
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <Link href={`/${locale}/services/${service.slug}`} className="block">
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {// eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.imagePublicId ? buildCloudinaryUrl(service.imagePublicId, 800) : getPlaceholderImage(800, 600, service.name)}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Price badge */}
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                    From ₹{service.priceMin}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors duration-300">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>
                  
                  {/* CTA Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      2-hour sessions
                    </div>
                    <div className="inline-flex items-center gap-2 text-green-600 font-semibold group-hover:gap-3 transition-all duration-300">
                      Book Now
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover effect border */}
                <div className="absolute inset-0 border-2 border-green-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {services.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Services Available</h3>
            <p className="text-gray-600">Our services are being updated. Please check back soon!</p>
          </div>
        )}
      </div>

      {/* Pricing Plans */}
      <div className="bg-white/60 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Transparent Pricing</h2>
            <p className="text-gray-600">Simple, per-session pricing with clear benefits</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 p-6 animate-fade-in-up" style={{animationDelay:'100ms'}}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">Basic</h3>
                <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-600">Starter</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-2">₹499</div>
              <div className="text-sm text-gray-500 mb-4">Per 2-hour session</div>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Basic tools & cleanup</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Appointment reminders</li>
                <li className="flex items-center gap-2"><span className="text-gray-400">—</span> Priority scheduling</li>
              </ul>
              <Link href={`/${locale}/services`} aria-label="Choose Basic plan" className="block w-full text-center bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-300">
                Choose Basic
              </Link>
            </div>
            <div className="rounded-2xl bg-gradient-to-b from-emerald-50 to-white shadow-xl border-2 border-green-200 p-6 animate-fade-in-up animated-gradient-border" style={{animationDelay:'250ms'}}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">Standard</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-green-600 text-white">Popular</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-2">₹999</div>
              <div className="text-sm text-gray-500 mb-4">Per 2-hour session</div>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Advanced tools & care</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Priority scheduling</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Post-service tips</li>
              </ul>
              <Link href={`/${locale}/services`} aria-label="Choose Standard plan" className="block w-full text-center bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-300">
                Choose Standard
              </Link>
            </div>
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 p-6 animate-fade-in-up" style={{animationDelay:'400ms'}}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">Premium</h3>
                <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Best value</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-2">₹1499</div>
              <div className="text-sm text-gray-500 mb-4">Per 2-hour session</div>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Expert care & tools</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Priority + flexible rescheduling</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Personalized plan</li>
              </ul>
              <Link href={`/${locale}/services`} aria-label="Choose Premium plan" className="block w-full text-center bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                Choose Premium
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Services?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group reveal reveal-in" style={{animationDelay:'100ms'}}>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Professionals</h3>
              <p className="text-gray-600">Certified garden experts with years of experience</p>
            </div>
            <div className="text-center group reveal reveal-in" style={{animationDelay:'250ms'}}>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Flexible Timing</h3>
              <p className="text-gray-600">Book 2-hour slots from 9 AM to 9 PM daily</p>
            </div>
            <div className="text-center group reveal reveal-in" style={{animationDelay:'400ms'}}>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Satisfaction Guaranteed</h3>
              <p className="text-gray-600">100% satisfaction guarantee on all our services</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


