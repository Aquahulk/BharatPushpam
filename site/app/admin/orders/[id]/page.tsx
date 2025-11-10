import { prisma } from '@/app/lib/prisma';
import { formatDateTimeIST } from '@/app/lib/date';
import { formatINR, paiseToRupees } from '@/app/lib/currency';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { OrderStatus } from '@prisma/client';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true
            }
          },
          variant: true
        }
      }
    }
  }) as any;

  if (!order) {
    return notFound();
  }

  let parsedPaymentDetails: any = null;
  if (order.paymentDetails) {
    try {
      parsedPaymentDetails = JSON.parse(order.paymentDetails);
    } catch {
      parsedPaymentDetails = null;
    }
  }

  // Fetch related booking for legacy orders (or when payment details lack bookingId)
  let bookingForOrder: any = null;
  if (order.items.length === 0 && order.paymentId) {
    bookingForOrder = await prisma.serviceBooking.findFirst({
      where: { paymentId: order.paymentId },
      include: { service: true },
      select: { id: true, date: true, startMinutes: true, notes: true, monthlyDay: true, type: true, planType: true, planPricePaise: true, service: true }
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
      case 'REFUND_REQUESTED':
        return 'bg-orange-100 text-orange-800';
      case 'REFUNDED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => formatDateTimeIST(date);

  const formatCurrency = (amountPaise: number) => {
    return formatINR(paiseToRupees(amountPaise));
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h1>
          <p className="text-gray-600">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Order Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Customer Details</h3>
              <div className="space-y-1">
                <p className="text-gray-800 font-medium">{order.customer}</p>
                {order.email && <p className="text-gray-600">{order.email}</p>}
                {order.phone && <p className="text-gray-600">{order.phone}</p>}
              </div>
            </div>

            {/* Shipping Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Shipping Address</h3>
              <div className="space-y-1 text-gray-600">
                <p>{order.address}</p>
                {order.city && <p>{order.city}{order.state ? `, ${order.state}` : ''} {order.pincode}</p>}
              </div>
            </div>
          </div>

          <hr className="my-6" />

          {/* Payment Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="text-gray-800 font-medium">{order.paymentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="text-gray-800 font-medium">{order.paymentMethod || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className="text-gray-800 font-medium">{order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DELIVERED' ? 'Paid' : 'Pending'}</span>
                </div>
              </div>
              <div className="space-y-1">
                {order.paymentDetails && (
                  <>
                    <h4 className="text-sm font-medium text-gray-600">Payment Details:</h4>
                    {parsedPaymentDetails ? (
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(parsedPaymentDetails, null, 2)}
                      </pre>
                    ) : (
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {order.paymentDetails}
                      </pre>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Service Booking Details */}
          {order.items.length === 0 && order.paymentDetails && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Service Booking</h3>
              {(() => {
                const info = parsedPaymentDetails && parsedPaymentDetails.type === 'service' ? parsedPaymentDetails : null;
                const serviceName = info?.serviceName || bookingForOrder?.service?.name || 'Service';
                const date = info?.date || bookingForOrder?.date || '';
                const startMinutes = Number(info?.startMinutes || bookingForOrder?.startMinutes || 0);
                const hh = Math.floor(startMinutes / 60);
                const mm = String(startMinutes % 60).padStart(2, '0');
                const bookingId = info?.bookingId || bookingForOrder?.id || '';
                return (
                  <div className="bg-gray-50 border rounded p-4 space-y-2">
                    <div className="font-medium">{serviceName}</div>
                    {date && <div className="text-sm text-gray-700">Date: {date}</div>}
                    {startMinutes ? <div className="text-sm text-gray-700">Start: {hh}:{mm}</div> : null}
                    {bookingId && (
                      <a href={`/admin/bookings/${bookingId}`} className="text-blue-600 hover:underline">View booking</a>
                    )}
                    {bookingForOrder?.planType === 'MONTHLY' && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-600">Payment Schedule</div>
                        {(() => {
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
                          const fpd = parseFirstPaymentDate(bookingForOrder?.notes || '');
                          const md = bookingForOrder?.monthlyDay ?? null;
                          const infoSchedule = nextPaymentInfo(md);
                          if (!md) {
                            return <div className="text-sm text-gray-700">Monthly day: Not scheduled yet</div>;
                          }
                          return (
                            <div className="text-sm text-gray-700 space-y-0.5">
                              <div>Monthly day: {md}</div>
                              {fpd && <div>First payment date: {fpd}</div>}
                              {infoSchedule && (
                                <div>Next payment: {infoSchedule.nextYmd} {infoSchedule.days === 0 ? '(today)' : infoSchedule.days > 0 ? `(in ${infoSchedule.days} day${infoSchedule.days === 1 ? '' : 's'})` : ''}</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-800 font-medium">{formatCurrency(order.totalMrp)}</span>
            </div>
            {order.totalMrp > order.totalPrice && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <span className="text-green-600 font-medium">-{formatCurrency(order.totalMrp - order.totalPrice)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span className="text-gray-800 font-medium">{formatCurrency(order.shippingFee || 0)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(order.totalPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <h2 className="text-xl font-semibold p-6 border-b">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {item.product.images && item.product.images[0] && (
                        <img 
                          src={item.product.images[0].publicId ? `https://res.cloudinary.com/dkwrsd0qc/image/upload/w_100/${item.product.images[0].publicId}` : ''} 
                          alt={item.product.name} 
                          className="h-10 w-10 object-cover rounded mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.variant?.name || 'Standard'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(item.unitPrice)}
                    {item.product.mrp > item.unitPrice && (
                      <span className="line-through ml-2 text-gray-400">
                        {formatCurrency(item.product.mrp)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Timeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Order Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mt-1"></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Order Placed</p>
              <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          
          {order.status !== 'PENDING' && (
            <div className="flex items-start">
              <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mt-1"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Payment {order.status === 'CANCELLED' ? 'Failed' : 'Successful'}</p>
                <p className="text-sm text-gray-500">{formatDate(order.updatedAt)}</p>
              </div>
            </div>
          )}
          
          {order.status === 'SHIPPED' && (
            <div className="flex items-start">
              <div className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-500 mt-1"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Order Shipped</p>
                <p className="text-sm text-gray-500">{formatDate(order.updatedAt)}</p>
              </div>
            </div>
          )}
          
          {order.status === 'DELIVERED' && (
            <div className="flex items-start">
              <div className="flex-shrink-0 h-4 w-4 rounded-full bg-purple-500 mt-1"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Order Delivered</p>
                <p className="text-sm text-gray-500">{formatDate(order.updatedAt)}</p>
              </div>
            </div>
          )}
          
          {order.status === 'CANCELLED' && (
            <div className="flex items-start">
              <div className="flex-shrink-0 h-4 w-4 rounded-full bg-red-500 mt-1"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Order Cancelled</p>
                <p className="text-sm text-gray-500">{formatDate(order.updatedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}