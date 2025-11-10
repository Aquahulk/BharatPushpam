import { prisma } from '@/app/lib/prisma';
import { getSessionFromCookies } from '@/app/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getSettings } from '@/app/lib/settings';
import PrintButton from './PrintButton';
import { formatINR, paiseToRupees } from '@/app/lib/currency';
import { formatDateIST } from '@/app/lib/date';

export default async function InvoicePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await getSessionFromCookies();
  if (!session) return redirect(`/${locale}/login?next=/${locale}/account/orders/${id}/invoice`);

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true, variant: true } } }
    }),
    getSettings()
  ]);

  if (!order || order.email !== session.email) return notFound();

  const brand = settings.invoice ?? {
    companyName: 'Bharat Pushpam',
    companyAddress: settings.storeAddress || '',
    gstNumber: '',
    logoPublicId: '',
    footerNote: 'Thank you for your purchase!',
    themeColor: '#16a34a'
  };

  const invoiceNumber = `INV-${order.id.slice(0,8)}`;
  const invoiceDate = formatDateIST(order.createdAt);
  const taxPercent = Math.max(0, Math.floor((settings.invoice?.taxPercent ?? 0)));
  const taxAmount = Math.floor(order.totalMrp * taxPercent / 100);

  // Parse payment details (for service bookings without items)
  let paymentInfo: any = null;
  if (order.paymentDetails) {
    try { paymentInfo = JSON.parse(order.paymentDetails as any); } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto p-6 print:p-0">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-xl font-semibold">Invoice</h1>
        <PrintButton />
      </div>

      <div className="bg-white border rounded p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="text-2xl font-bold" style={{ color: brand.themeColor }}>{brand.companyName}</div>
            <div className="text-sm text-gray-700 whitespace-pre-line">{brand.companyAddress}</div>
            {brand.gstNumber && (<div className="text-sm text-gray-700">GSTIN: {brand.gstNumber}</div>)}
          </div>
          <div className="text-right text-sm">
            <div>Invoice No: {invoiceNumber}</div>
            <div>Date: {invoiceDate}</div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="space-y-1 text-sm">
            <div className="font-medium">Bill To</div>
            <div>{order.customer}</div>
            {order.email && (<div>{order.email}</div>)}
            <div>{order.address}</div>
            <div>{order.city} {order.state ? `, ${order.state}` : ''}</div>
            <div>{order.pincode}</div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-medium">Payment</div>
            <div>Method: {order.paymentMethod || 'Razorpay'}</div>
            <div>ID: {order.paymentId || 'N/A'}</div>
            <div>Status: {(order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DELIVERED') ? 'Paid' : order.status}</div>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Item</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Unit Price</th>
                <th className="text-right p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.length > 0 ? (
                order.items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.product.name}{item.variant ? ` - ${item.variant.name}` : ''}</td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">{formatINR(paiseToRupees(item.unitPrice))}</td>
                    <td className="p-2 text-right">{formatINR(paiseToRupees(item.unitPrice * item.quantity))}</td>
                  </tr>
                ))
              ) : paymentInfo?.type === 'service' ? (
                <tr className="border-b">
                  <td className="p-2">{paymentInfo.serviceName || 'Service Booking'}</td>
                  <td className="p-2 text-right">1</td>
                  <td className="p-2 text-right">{formatINR(paiseToRupees(order.totalMrp || order.totalPrice))}</td>
                  <td className="p-2 text-right">{formatINR(paiseToRupees(order.totalPrice))}</td>
                </tr>
              ) : (
                <tr>
                  <td className="p-2 text-gray-600" colSpan={4}>No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(paiseToRupees(order.totalMrp))}</span></div>
            {taxPercent > 0 && (
              <div className="flex justify-between"><span>Tax ({taxPercent}%)</span><span>{formatINR(paiseToRupees(taxAmount))}</span></div>
            )}
            <div className="flex justify-between"><span>Shipping</span><span>{formatINR(paiseToRupees(order.shippingFee || 0))}</span></div>
            <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{formatINR(paiseToRupees(order.totalPrice))}</span></div>
          </div>
        </div>

        {/* Footer */}
        {brand.footerNote && (
          <div className="mt-8 text-center text-sm text-gray-700">{brand.footerNote}</div>
        )}
      </div>
    </div>
  );
}