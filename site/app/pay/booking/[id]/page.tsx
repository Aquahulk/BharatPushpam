"use client";
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { formatINR, paiseToRupees } from '@/app/lib/currency';

export default function PayBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'PER_VISIT' | 'NONE'>('NONE');
  const [savingPlan, setSavingPlan] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { id } = await params;
      try {
        const res = await fetch(`/api/bookings/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load booking');
        setBooking(data.booking);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  async function startPayment() {
    if (!booking) return;
    try {
      // Ensure Razorpay script is loaded
      if (typeof window === 'undefined' || !(window as any).Razorpay || !razorpayLoaded) {
        alert('Razorpay is not loaded. Please wait a moment and try again.');
        return;
      }
      const res = await fetch(`/api/payments/booking/${booking.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!data.order) throw new Error(data.error || 'Order failed');
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string;
      if (!keyId) {
        alert('Payment configuration missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID.');
        return;
      }

      const options: any = {
        key: keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Bharat Pushpam',
        description: booking.service?.name || 'Service Booking',
        order_id: data.order.id,
        prefill: {
          name: booking.customerName || '',
          email: booking.customerEmail || '',
          contact: booking.customerPhone || ''
        },
        notes: {
          bookingId: booking.id
        },
        modal: {
          ondismiss: async () => {
            try {
              await fetch(`/api/payments/booking/${booking.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'dismissed' })
              });
            } catch (_) {}
            alert('Payment cancelled.');
            window.location.href = `/account/orders`;
          }
        },
        handler: async function (response: any) {
          // Verify payment and update booking
          try {
            const verifyRes = await fetch('/api/payments/booking/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.order.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                bookingId: booking.id
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setBooking(verifyData.booking);
              alert('Payment successful! Booking confirmed.');
              window.location.href = `/account/orders`;
            } else {
              alert('Payment verification failed.');
              window.location.href = `/account/orders`;
            }
          } catch (err) {
            alert('Payment verification error.');
            window.location.href = `/account/orders`;
          }
        }
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async function (response: any) {
        const err = response?.error || {};
        const details = [
          err.code && `Code: ${err.code}`,
          err.reason && `Reason: ${err.reason}`,
          err.description && `Description: ${err.description}`
        ].filter(Boolean).join('\n');
        alert(`Payment failed. ${details || ''}`.trim());
        try {
          await fetch(`/api/payments/booking/${booking.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'payment_failed' })
          });
        } catch (_) {}
        window.location.href = `/account/orders`;
      });
      rzp.open();
      // Fallback: poll booking status until confirmed
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/bookings/${booking!.id}`);
          const data = await res.json();
          if (data?.booking?.status === 'CONFIRMED') {
            setBooking(data.booking);
            clearInterval(poll);
          }
        } catch {}
      }, 3000);
      setTimeout(() => clearInterval(poll), 60000);
    } catch (e: any) {
      alert(e.message || 'Checkout failed');
    }
  }

  async function savePlan() {
    if (!booking) return;
    if (selectedPlan === 'NONE') {
      alert('Please select a plan');
      return;
    }
    const basePaise = Math.max(100, Math.floor((booking.service?.priceMin || 0) * 100));
    const planPaise = selectedPlan === 'MONTHLY' ? basePaise * 4 : basePaise;
    try {
      setSavingPlan(true);
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan, planPricePaise: planPaise })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save plan');
      setBooking(data.booking || { ...booking, planType: selectedPlan, planPricePaise: planPaise });
      alert('Plan saved. You can proceed to payment.');
    } catch (e: any) {
      alert(e.message || 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : booking ? (
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="font-semibold">{booking.service?.name || 'Service'}</div>
            <div className="text-sm text-gray-600">Date: {booking.date}</div>
            <div className="text-sm text-gray-600">Customer: {booking.customerName}</div>
            <div className="text-sm text-gray-600">Phone: {booking.customerPhone}</div>
            <div className="text-sm text-gray-600">Address: {[booking.addressLine1, booking.addressLine2, booking.city, booking.state, booking.postalCode].filter(Boolean).join(', ')}</div>
            <div className="text-sm text-gray-600">Status: {booking.status}</div>
            {booking.amountPaid ? (
              <div className="text-sm text-gray-600">Paid: {formatINR(paiseToRupees(booking.amountPaid))}</div>
            ) : null}
          </div>
          {booking.status === 'CONFIRMED' ? (
            <div className="space-y-2">
              <p className="text-green-700">Booking confirmed and payment recorded.</p>
              <a href="/account/orders" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Go to My Orders</a>
            </div>
          ) : booking.status === 'CANCELLED' ? (
            <div className="space-y-2">
              <p className="text-red-700">Payment cancelled. This booking won’t be processed.</p>
              <a href="/account/orders" className="inline-block bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">Go to My Orders</a>
            </div>
          ) : (
            <div className="space-y-4">
              {booking.type === 'INSPECTION' ? (
                !booking.inspectionCompleted ? (
                  <div className="space-y-2">
                    <p className="text-gray-700">Free inspection scheduled. Payment will be enabled after inspection is completed.</p>
                  </div>
                ) : (booking.planType === 'NONE' || !booking.planPricePaise) ? (
                  <div className="space-y-3">
                    <p className="text-gray-700">Select a maintenance plan to proceed:</p>
                    <div className="flex gap-3">
                      <button
                        className={`px-3 py-2 rounded border transition-colors ${selectedPlan === 'PER_VISIT' ? 'border-green-600 bg-green-50 ring-2 ring-green-500 text-green-800' : 'border-gray-300 hover:border-gray-400'}`}
                        aria-pressed={selectedPlan === 'PER_VISIT'}
                        onClick={() => setSelectedPlan('PER_VISIT')}
                      >
                        Per Visit — {formatINR(paiseToRupees(Math.max(100, Math.floor((booking.service?.priceMin || 0) * 100))))}
                      </button>
                      <button
                        className={`px-3 py-2 rounded border transition-colors ${selectedPlan === 'MONTHLY' ? 'border-green-600 bg-green-50 ring-2 ring-green-500 text-green-800' : 'border-gray-300 hover:border-gray-400'}`}
                        aria-pressed={selectedPlan === 'MONTHLY'}
                        onClick={() => setSelectedPlan('MONTHLY')}
                      >
                        Monthly — {formatINR(paiseToRupees(Math.max(100, Math.floor((booking.service?.priceMin || 0) * 100)) * 4))}
                      </button>
                    </div>
                    <button
                      onClick={savePlan}
                      disabled={savingPlan || selectedPlan === 'NONE'}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingPlan ? 'Saving…' : 'Save Plan'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700">Click below to pay securely via Razorpay.</p>
                    <button onClick={startPayment} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Pay Now</button>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-700">Click below to pay securely via Razorpay.</p>
                  <button onClick={startPayment} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Pay Now</button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>No booking found.</div>
      )}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => {
          setRazorpayLoaded(false);
          alert('Failed to load Razorpay. Please refresh and try again.');
        }}
      />
    </div>
  );
}
// Razorpay checkout script is loaded via Next.js Script component
