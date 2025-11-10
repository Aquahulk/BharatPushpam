export const dynamic = 'force-dynamic';
import { prisma } from '@/app/lib/prisma';
import DeleteOrderButton from './DeleteOrderButton';
import { formatINR, paiseToRupees } from '@/app/lib/currency';
import { formatDateIST } from '@/app/lib/date';
import AdminBookingActions from '../bookings/AdminBookingActions';
import AdminBookingStatusDropdown from '../bookings/AdminBookingStatusDropdown';
import AutoRefresh from './AutoRefresh';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const qRaw = sp?.q;
  const query = (Array.isArray(qRaw) ? qRaw[0] : qRaw)?.toString().trim().toLowerCase() || '';
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Helper to determine if an Order represents a service booking (no items, service details in paymentDetails)
  const isServiceOrder = (order: any) => {
    if (order.items.length === 0 && order.paymentDetails) {
      try {
        const info = JSON.parse(order.paymentDetails as any);
        if (info?.type === 'service') return true;
      } catch {}
      const details = (order as any).paymentDetails as string;
      if (typeof details === 'string' && details.startsWith('Service:')) return true;
    }
    return false;
  };

  // Show only product orders in this view; service bookings belong to the Bookings tab
  let productOrders = orders.filter((o) => !isServiceOrder(o));
  if (query) {
    productOrders = productOrders.filter((order) => {
      const matchesCustomer = (order.customer || '').toLowerCase().includes(query);
      const matchesItems = order.items.some((item) => {
        const p = item.product?.name || '';
        const v = item.variant?.name || '';
        return p.toLowerCase().includes(query) || v.toLowerCase().includes(query);
      });
      return matchesCustomer || matchesItems;
    });
  }

  // Prefetch bookings mapped by paymentId for legacy orders that don't include bookingId in paymentDetails
  const servicePaymentIds = orders
    .filter(o => o.items.length === 0 && !!o.paymentDetails)
    .map(o => o.paymentId)
    .filter(Boolean) as string[];
  const relatedBookings = await prisma.serviceBooking.findMany({
    where: { paymentId: { in: servicePaymentIds } },
    select: { id: true, paymentId: true }
  });
  const bookingByPaymentId = Object.fromEntries(relatedBookings.map(b => [b.paymentId, b]));
  
  // Service orders mapped to bookings via bookingId embedded in paymentDetails
  let serviceOrders = orders.filter((o) => isServiceOrder(o));
  const bookingIds = serviceOrders.map(o => {
    try {
      const info = JSON.parse(o.paymentDetails as any);
      return info?.bookingId || null;
    } catch {}
    return null;
  }).filter(Boolean) as string[];
  const serviceBookings = bookingIds.length > 0 ? await prisma.serviceBooking.findMany({
    where: { id: { in: bookingIds } },
    select: {
      id: true,
      notes: true,
      monthlyDay: true,
      type: true,
      status: true,
      planType: true,
      planPricePaise: true,
      service: { select: { name: true, slug: true } }
    }
  }) : [];
  const bookingById: Record<string, any> = Object.fromEntries(serviceBookings.map(b => [b.id, b]));

  function parseFirstPaymentDate(notes: string | null | undefined): string | null {
    if (!notes) return null;
    const m = notes.match(/firstPaymentDate\s*=\s*(\d{4}-\d{2}-\d{2})/i);
    return m ? m[1] : null;
  }

  function nextPaymentInfo(monthlyDay: number | null | undefined) {
    if (!monthlyDay || monthlyDay < 1 || monthlyDay > 28) return null;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const [y, m, d] = todayStr.split('-').map(n => parseInt(n, 10));
    const targetMonth = d > monthlyDay ? m + 1 : m;
    const targetYear = targetMonth > 12 ? y + 1 : y;
    const targetMonthClamped = ((targetMonth - 1) % 12 + 12) % 12; // 0-based
    const targetDate = new Date(targetYear, targetMonthClamped, monthlyDay);
    const nextYmd = `${targetYear}-${String(targetMonthClamped + 1).padStart(2, '0')}-${String(monthlyDay).padStart(2, '0')}`;
    const start = new Date(y, m - 1, d);
    const days = Math.round((targetDate.setHours(0,0,0,0) - start.setHours(0,0,0,0)) / (1000*60*60*24));
    return { nextYmd, days };
  }
  if (query) {
    serviceOrders = serviceOrders.filter((order) => {
      let nameFromPayment: string | undefined;
      let bookingId: string | null = null;
      try {
        const info = JSON.parse(order.paymentDetails as any);
        nameFromPayment = info?.serviceName;
        bookingId = info?.bookingId || null;
      } catch {}
      const matchesCustomer = (order.customer || '').toLowerCase().includes(query);
      if (nameFromPayment && nameFromPayment.toLowerCase().includes(query)) return true;
      const booking = bookingId ? bookingById[bookingId] : null;
      const name = booking?.service?.name as string | undefined;
      const matchesService = !!(name && name.toLowerCase().includes(query));
      return matchesCustomer || matchesService;
    });
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':
        return 'PAID';
      case 'PAID':
        return 'SHIPPED';
      case 'SHIPPED':
        return 'DELIVERED';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={15000} />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600">Manage customer orders and track fulfillment</p>
        <div className="mt-4 flex items-center gap-3">
          <a
            href="/api/admin/export/orders"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download Orders (Excel/CSV)
          </a>
          <a
            href="/api/admin/export/orders"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Sheet in New Tab
          </a>
        </div>
      </div>

      {/* Search */}
      <form action="/admin/orders" method="GET" className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search customer, product or service"
          className="w-full max-w-md border rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="px-3 py-2 text-sm rounded bg-gray-800 text-white">Search</button>
        {query && (
          <a href="/admin/orders" className="text-sm text-blue-600 hover:underline">Clear</a>
        )}
      </form>

      {/* Top Tabs: Orders | Bookings */}
      <div className="border-b">
        <nav className="flex gap-4 px-1">
          <a href="/admin/orders" className="px-3 py-2 text-sm font-medium border-b-2 border-green-600 text-green-700">Orders</a>
          <a href="/admin/bookings" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:border-b-2 hover:border-gray-300">Bookings</a>
        </nav>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        #{order.id.slice(-8)}
                      </div>
                      {order.paymentId && (
                        <div className="text-sm text-gray-500">
                          Payment: {order.paymentId.slice(-8)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.customer}</div>
                      {order.email && (
                        <div className="text-sm text-gray-500">{order.email}</div>
                      )}
                      {order.phone && (
                        <div className="text-sm text-gray-500">{order.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(() => {
                        if (order.items.length === 0 && order.paymentDetails) {
                          try {
                            const info = JSON.parse(order.paymentDetails as any);
                            if (info?.type === 'service') return 'Service';
                          } catch {}
                          if ((order as any).paymentDetails?.startsWith('Service:')) return 'Service';
                        }
                        return 'Product';
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.items.length === 0 && order.paymentDetails ? (
                      (() => {
                        try {
                          const info = JSON.parse(order.paymentDetails as any);
                          if (info?.type === 'service') {
                            const hh = Math.floor((info.startMinutes || 0) / 60);
                            const mm = String((info.startMinutes || 0) % 60).padStart(2, '0');
                            const bookingId = info.bookingId || bookingByPaymentId[order.paymentId || '']?.id || '';
                            return (
                              <div className="space-y-1 text-sm text-gray-900">
                                <div className="font-medium">{info.serviceName || 'Service Booking'}</div>
                                <div className="text-gray-700">Date: {info.date}</div>
                                <div className="text-gray-700">Start: {hh}:{mm}</div>
                                {bookingId && (
                                  <a href={`/admin/bookings/${bookingId}`} className="text-blue-600 hover:underline">View booking</a>
                                )}
                              </div>
                            );
                          }
                        } catch {}
                        // Fallback for legacy string format
                        const details = (order as any).paymentDetails as string;
                        if (typeof details === 'string' && details.startsWith('Service:')) {
                          const parts = details.split('|').map(s => s.trim());
                          const namePart = parts.find(p => p.startsWith('Service:')) || '';
                          const datePart = parts.find(p => p.startsWith('Date:')) || '';
                          const startPart = parts.find(p => p.startsWith('Start:')) || '';
                          const serviceName = namePart.replace('Service:', '').trim();
                          const date = datePart.replace('Date:', '').trim();
                          const startMinutes = Number((startPart.replace('Start:', '').trim())) || 0;
                          const hh = Math.floor(startMinutes / 60);
                          const mm = String(startMinutes % 60).padStart(2, '0');
                          const bookingId = bookingByPaymentId[order.paymentId || '']?.id || '';
                          return (
                            <div className="space-y-1 text-sm text-gray-900">
                              <div className="font-medium">{serviceName || 'Service Booking'}</div>
                              <div className="text-gray-700">Date: {date}</div>
                              <div className="text-gray-700">Start: {hh}:{mm}</div>
                              {bookingId && (
                                <a href={`/admin/bookings/${bookingId}`} className="text-blue-600 hover:underline">View booking</a>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="text-sm text-gray-900">Service Booking</div>
                        );
                      })()
                    ) : (
                      <>
                        <div className="text-sm text-gray-900">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items.slice(0, 2).map(item => item.product.name).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatINR(paiseToRupees(order.totalPrice))}
                    </div>
                    {order.totalMrp > order.totalPrice && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatINR(paiseToRupees(order.totalMrp))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateIST(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <a href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </a>
                      {getNextStatus(order.status) && (
                        <form action={`/api/admin/orders/update-status?orderId=${order.id}&status=${getNextStatus(order.status)}`} method="POST">
                          <button type="submit" className="text-green-600 hover:text-green-900">
                            Mark as {getNextStatus(order.status)}
                          </button>
                        </form>
                      )}
                      {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                        <form action={`/api/admin/orders/update-status?orderId=${order.id}&status=CANCELLED`} method="POST">
                          <button type="submit" className="text-red-600 hover:text-red-900">
                            Cancel
                          </button>
                        </form>
                      )}
                      <DeleteOrderButton id={order.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Orders (for inspection/maintenance bookings) */}
      {serviceOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mt-6">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Service Orders</h2>
            <p className="text-sm text-gray-600">Manage inspection and maintenance bookings directly from here.</p>
          </div>
          <div className="divide-y divide-gray-200">
            {serviceOrders.map(order => {
              let bookingId: string | null = null;
              let info: any = null;
              try {
                info = JSON.parse(order.paymentDetails as any);
                bookingId = info?.bookingId || null;
              } catch {}
              const booking = bookingId ? bookingById[bookingId] : null;
              const statusBadge = booking ? (booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-700';
              const hh = info?.startMinutes != null ? Math.floor(info.startMinutes / 60) : null;
              const mm = info?.startMinutes != null ? String(info.startMinutes % 60).padStart(2, '0') : null;
              return (
                <div key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">#{order.id.slice(-8)} • {(booking?.service?.name) || (info?.serviceName) || 'Service Booking'}</div>
                      <div className="mt-1 text-sm text-gray-700">Date: {info?.date || '-'}</div>
                      {hh !== null && mm !== null && (
                        <div className="text-sm text-gray-700">Start: {hh}:{mm}</div>
                      )}
                      {booking && (
                        <div className="mt-1 text-sm text-gray-700">Type: {booking.type}</div>
                      )}
                      {booking && (
                        <div className="mt-1 text-sm text-gray-700">Plan: {booking.planType} {booking.planPricePaise ? `• ${formatINR(paiseToRupees(booking.planPricePaise))}` : ''}</div>
                      )}
                      {booking && booking.planType === 'MONTHLY' && (
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="font-medium">Payment Schedule</div>
                          {(() => {
                            const fpd = parseFirstPaymentDate(booking.notes || '');
                            const md = booking.monthlyDay ?? null;
                            const info = nextPaymentInfo(md);
                            if (!md) {
                              return <div>Monthly day: Not scheduled yet</div>;
                            }
                            return (
                              <div className="space-y-0.5">
                                <div>Monthly day: {md}</div>
                                {fpd && <div>First payment date: {fpd}</div>}
                                {info && (
                                  <div>Next payment: {info.nextYmd} {info.days === 0 ? '(today)' : info.days > 0 ? `(in ${info.days} day${info.days === 1 ? '' : 's'})` : ''}</div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${statusBadge}`}>{booking?.status || order.status}</span>
                      {booking?.type === 'INSPECTION' && order.totalPrice === 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Free Inspection</span>
                      )}
                      {/* Added explicit payment status chip for clarity */}
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.status)}`}>Payment: {order.status}</span>
                      {bookingId && (
                        <a href={`/admin/bookings/${bookingId}`} className="text-blue-600 hover:underline">View booking</a>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-gray-700">Customer: {order.customer} • {order.phone} {order.email ? `• ${order.email}` : ''}</div>
                    <div className="flex items-center gap-3">
                      {booking && (
                        booking.type === 'INSPECTION' ? (
                          <AdminBookingStatusDropdown
                            id={booking.id}
                            status={booking.status as any}
                            type={booking.type as any}
                            inspectionCompleted={booking.inspectionCompleted}
                            serviceCompleted={(booking as any).serviceCompleted}
                            planType={booking.planType as any}
                          />
                        ) : (
                          <AdminBookingActions id={booking.id} status={booking.status as any} type={booking.type as any} inspectionCompleted={booking.inspectionCompleted} serviceCompleted={(booking as any).serviceCompleted} hideDelete />
                        )
                      )}
                      {/* Permanently delete the service order */}
                      <DeleteOrderButton id={order.id} />
                    </div>
                  </div>
                  {!booking && (
                    <div className="mt-2 text-sm text-gray-600">Booking details not found. Use the Bookings tab.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {productOrders.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15v-4h4v4H8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
          <p className="mt-1 text-sm text-gray-500">Orders will appear here when customers make purchases.</p>
        </div>
      )}
    </div>
  );
}
