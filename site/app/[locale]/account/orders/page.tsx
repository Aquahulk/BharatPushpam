import { prisma } from '@/app/lib/prisma';
import { getSessionFromCookies } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CancelOrderButton from './CancelOrderButton';
import OrdersDecor from './OrdersDecor';
import { formatINR, paiseToRupees } from '@/app/lib/currency';
import { buildCloudinaryUrl, getPlaceholderImage } from '@/app/lib/cloudinary';
import { formatDateTimeIST } from '@/app/lib/date';
import SelectPlanInline from './SelectPlanInline';
import MonthlyPlanReminder from '@/app/components/MonthlyPlanReminder';

export default async function AccountOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, parseInt(sp?.page ?? '1') || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const session = await getSessionFromCookies();

  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/account/orders`);
  }

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where: { email: session.email },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.order.count({ where: { email: session.email } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));

  const user = await prisma.user.findUnique({ where: { email: session.email } });

  const servicePaymentIds = orders
    .filter((o) => o.items.length === 0 && !!o.paymentDetails)
    .map((o) => o.paymentId)
    .filter(Boolean) as string[];

  const relatedBookings = await prisma.serviceBooking.findMany({
    where: { paymentId: { in: servicePaymentIds } },
    include: { service: { select: { priceMin: true, name: true } } }
  });

  const bookingByPaymentId = Object.fromEntries(
    relatedBookings.map((b) => [b.paymentId, b])
  );

  // Also prefetch bookings using bookingId embedded in paymentDetails for pending inspection orders
  const serviceOrders = orders.filter((o) => o.items.length === 0 && !!o.paymentDetails);
  const bookingIds = serviceOrders
    .map((o) => {
      try {
        const info = JSON.parse(o.paymentDetails as any);
        return info?.bookingId || null;
      } catch {}
      return null;
    })
    .filter(Boolean) as string[];

  const serviceBookings = bookingIds.length > 0
    ? await prisma.serviceBooking.findMany({
        where: { id: { in: bookingIds } },
        include: { service: { select: { priceMin: true, name: true } } },
      })
    : [];

  const bookingById: Record<string, any> = Object.fromEntries(
    serviceBookings.map((b) => [b.id, b])
  );

  function parseFirstPaymentDate(notes: string | null | undefined): string | null {
    if (!notes) return null;
    const m = notes.match(/firstPaymentDate\s*=\s*(\d{4}-\d{2}-\d{2})/i);
    return m ? m[1] : null;
  }

  return (
    <div className="relative overflow-hidden min-h-[80vh]">
      {/* Only background images used in Contact/About pages */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 z-0">
        <Image
          src="/plant-left.png"
          alt=""
          width={320}
          height={320}
          className="hidden md:block absolute left-0 top-10 opacity-70 filter brightness-110 saturate-110"
        />
        <Image
          src="/palm-right.png"
          alt=""
          width={340}
          height={340}
          className="hidden md:block absolute right-0 top-10 opacity-70 filter brightness-110 saturate-110"
        />
      </div>

      <OrdersDecor />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {user?.isOnHold && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
            Your account is on hold. Please contact support to get it unhold.
          </div>
        )}

        <MonthlyPlanReminder locale={locale} />

        <h1 className="text-2xl font-semibold mb-4">My Orders</h1>

        {orders.length === 0 ? (
          <p className="text-gray-600">
            No orders yet.{' '}
            <Link className="text-green-600" href={`/${locale}/products`}>
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4"
              >
                {/* Order header */}
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    Order ID: {order.id}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      order.status === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : order.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="text-sm text-gray-900 mb-3">
                  Placed on {formatDateTimeIST(order.createdAt)}
                </div>

                {/* Order items or service booking */}
                {order.items.length === 0 && order.paymentDetails ? (
                  <div className="bg-gray-50 border rounded p-3 space-y-1">
                    <div className="text-sm text-gray-600">Type: Service Booking</div>
                    {(() => {
                      let info: any = null;
                      try {
                        info = JSON.parse(order.paymentDetails as any);
                      } catch {}
                      if (info?.type === 'service') {
                        const hh = Math.floor((info.startMinutes || 0) / 60);
                        const mm = String((info.startMinutes || 0) % 60).padStart(2, '0');
                        const bookingId =
                          info.bookingId ||
                          bookingByPaymentId[order.paymentId || '']?.id ||
                          '';
                        const phonePrefill =
                          bookingByPaymentId[order.paymentId || '']?.customerPhone ||
                          order.phone ||
                          '';
                        return (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="font-medium">{info.serviceName || 'Service'}</div>
                              <div className="text-sm text-gray-700">Date: {info.date}</div>
                              <div className="text-sm text-gray-700">Start: {hh}:{mm}</div>
                              {(() => {
                                const bByPayment = bookingByPaymentId[order.paymentId || ''];
                                const b = bookingId ? (bookingById[bookingId] || bByPayment) : bByPayment;
                                if (!b) return null;
                                const isInspection = b.type === 'INSPECTION';
                                const done = isInspection ? !!b.inspectionCompleted : !!(b as any).serviceCompleted;
                                const label = isInspection ? (done ? 'Inspection Done' : 'Inspection Pending') : (done ? 'Service Completed' : 'Service Pending');
                                const cls = done ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                                return (
                                  <span className={`inline-block text-xs px-2 py-1 rounded ${cls}`}>{label}</span>
                                );
                              })()}
                              <div className="text-xs text-gray-600">
                                Payment: {order.paymentId || 'N/A'} (
                                {order.paymentMethod || 'Razorpay'})
                              </div>
                              {(() => {
                                const bByPayment = bookingByPaymentId[order.paymentId || ''];
                                const b = bookingId ? (bookingById[bookingId] || bByPayment) : bByPayment;
                                const fpd = parseFirstPaymentDate(b?.notes || '');
                                return fpd ? (
                                  <div className="text-xs text-gray-600">First payment date: {fpd}</div>
                                ) : null;
                              })()}
                            </div>
                            {(() => {
                              const bByPayment = bookingByPaymentId[order.paymentId || ''];
                              const b = bookingId ? (bookingById[bookingId] || bByPayment) : bByPayment;
                              const targetBookingId = bookingId || b?.id;
                              const isInspection = b?.type === 'INSPECTION';
                              const canSelectPlan = isInspection && b?.inspectionCompleted && (b?.planType === 'NONE' || !b?.planPricePaise);
                              const completed = isInspection ? !!b?.inspectionCompleted : !!(b as any)?.serviceCompleted;
                              const basePaise = Math.max(100, Math.floor(((b?.service?.priceMin || 0) * 100)));
                              if (canSelectPlan && targetBookingId) {
                                return (
                                  <SelectPlanInline
                                    bookingId={targetBookingId}
                                    basePaise={basePaise}
                                    payHref={`/${locale}/pay/booking/${targetBookingId}`}
                                  />
                                );
                              }
                              // If already paid or booking confirmed, do not show pay button
                              if ((order.status as any) === 'PAID' || (b?.status as any) === 'CONFIRMED') {
                                return (
                                  <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded">
                                    Paid
                                  </span>
                                );
                              }
                              // Show completion badge if not paid
                              if (completed) {
                                // If inspection is done and a valid plan is chosen, allow payment
                                const hasValidPlan = isInspection && b && b.planType !== 'NONE' && (b.planPricePaise || 0) > 0;
                                const needsPayment = (order.status as any) !== 'PAID' && (b?.status as any) !== 'CONFIRMED';
                                if (hasValidPlan && needsPayment && targetBookingId) {
                                  return (
                                    <Link
                                      href={`/${locale}/pay/booking/${targetBookingId}`}
                                      className="inline-block bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                    >
                                      Pay Now
                                    </Link>
                                  );
                                }
                                return (
                                  <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded">
                                    {isInspection ? 'Inspection Done' : 'Service Completed'}
                                  </span>
                                );
                              }
                              return targetBookingId ? (
                                <Link
                                  href={`/${locale}/pay/booking/${targetBookingId}`}
                                  className="inline-block bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                >
                                  {isInspection ? 'Select Plan / Pay' : 'Pay Now'}
                                </Link>
                              ) : (
                                <span className="inline-block bg-gray-300 text-gray-700 px-3 py-1 rounded cursor-not-allowed">
                                  {isInspection ? 'Awaiting inspection' : 'Preparing booking…'}
                                </span>
                              );
                            })()}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <ul className="divide-y">
                    {order.items.map((item) => (
                      <li key={item.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                            {(() => {
                              const img = item.product.images?.[0]?.publicId;
                              const src = img
                                ? buildCloudinaryUrl(img, 120, 120)
                                : getPlaceholderImage(120, 120, item.product.name);
                              return (
                                <Image
                                  src={src}
                                  alt={item.product.name}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                              );
                            })()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product.name}
                              {item.variant ? ` - ${item.variant.name}` : ''}
                            </div>
                            <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatINR(paiseToRupees(item.unitPrice))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Actions and totals */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Link
                      href={`/${locale}/account/orders/${order.id}`}
                      className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                    >
                      View details
                    </Link>
                    <Link
                      href={`/${locale}/account/orders/${order.id}/invoice`}
                      className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                    >
                      Download invoice
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-gray-900">
                      Total: {formatINR(paiseToRupees(order.totalPrice))}
                    </div>
                    <CancelOrderButton orderId={order.id} status={order.status as any} locale={locale} />
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/account/orders?${new URLSearchParams({
                    page: String(Math.max(1, page - 1)),
                  }).toString()}`}
                  className={`px-3 py-1.5 rounded border text-sm ${
                    page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  Prev
                </Link>
                <Link
                  href={`/${locale}/account/orders?${new URLSearchParams({
                    page: String(Math.min(totalPages, page + 1)),
                  }).toString()}`}
                  className={`px-3 py-1.5 rounded border text-sm ${
                    page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
