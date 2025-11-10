import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/app/lib/prisma';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('Razorpay secret not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { orderId, paymentId, signature } = body || {};
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid payment signature for booking');
      await prisma.serviceBooking.updateMany({
        where: { paymentId: orderId },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Find booking by stored Razorpay order id in paymentId field
    const booking = await prisma.serviceBooking.findFirst({
      where: { paymentId: orderId },
      include: { service: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found for order' }, { status: 404 });
    }

    // Confirm atomically only if no other booking is CONFIRMED for this slot
    // Use plan amount for inspection and kitchen gardening bookings
    let amountPaise = Math.max(0, Math.floor((booking.service?.priceMin || 0) * 100));
    if ((booking as any).type === 'INSPECTION') {
      amountPaise = booking.planPricePaise || 0;
    } else if (booking.planPricePaise && booking.planPricePaise > 0) {
      amountPaise = booking.planPricePaise;
    }
    // India timezone helpers for first payment date/day
    const INDIA_TZ = 'Asia/Kolkata';
    const indiaDayStr = new Intl.DateTimeFormat('en-GB', { timeZone: INDIA_TZ, day: '2-digit' }).format(new Date());
    const todayDay = parseInt(indiaDayStr, 10);
    const todayYmd = new Date().toLocaleDateString('en-CA', { timeZone: INDIA_TZ });

    const confirmed = await prisma.$transaction(async (tx) => {
      const conflict = await tx.serviceBooking.findFirst({
        where: {
          id: { not: booking.id },
          serviceId: booking.serviceId,
          date: booking.date,
          startMinutes: booking.startMinutes,
          status: 'CONFIRMED'
        }
      });
      if (conflict) {
        // Cancel this booking to free the slot
        await tx.serviceBooking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
        return null;
      }
      // Set monthly day from first payment date if this is a monthly plan and no monthlyDay set yet.
      const shouldSetMonthlyDay = (booking.planType as any) === 'MONTHLY' && (booking.monthlyDay === null || booking.monthlyDay === undefined);
      const hasFirstPaymentNote = (booking.notes || '').includes('firstPaymentDate=');
      const nextNotes = shouldSetMonthlyDay && !hasFirstPaymentNote
        ? [booking.notes || '', `firstPaymentDate=${todayYmd}`].filter(Boolean).join('\n')
        : booking.notes || undefined;

      return tx.serviceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          amountPaid: amountPaise,
          // Only set on first successful payment
          monthlyDay: shouldSetMonthlyDay ? todayDay : undefined,
          notes: nextNotes
        }
      });
    });

    if (!confirmed) {
      return NextResponse.json({ error: 'Slot already taken' }, { status: 409 });
    }

    // Create an Order record so bookings appear in Admin Orders
    try {
      const address = [
        confirmed.addressLine1 || '',
        confirmed.addressLine2 || ''
      ].filter(Boolean).join(', ');

      const amountToCharge = amountPaise;

      // Ensure order exists or create one for this booking confirmation
      await prisma.order.upsert({
        where: { id: confirmed.id },
        update: {
          status: 'PAID' as any,
          paymentId: paymentId,
          totalPrice: amountToCharge,
          updatedAt: new Date()
        },
        create: {
          id: confirmed.id,
          customer: confirmed.customerName || 'Customer',
          email: confirmed.customerEmail || null,
          phone: confirmed.customerPhone || null,
          address: address,
          city: confirmed.city || 'Pune',
          pincode: confirmed.pincode || '000000',
          totalMrp: amountToCharge,
          totalPrice: amountToCharge,
          shippingFee: 0,
          status: 'PAID' as any,
          paymentId: paymentId,
          paymentMethod: 'Razorpay',
          paymentDetails: JSON.stringify({
            type: 'service',
            serviceName: confirmed.service?.name || '',
            date: confirmed.date,
            startMinutes: confirmed.startMinutes,
            bookingId: confirmed.id
          })
        }
      });
    } catch (orderErr) {
      console.error('Failed to create/update order for booking:', orderErr);
      // Do not fail verification if order creation fails; booking is confirmed
    }

    return NextResponse.json({ success: true, booking: confirmed });
  } catch (error: any) {
    console.error('Booking payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}