import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Require authenticated user session to initiate payment for a booking
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Please login to proceed with payment' }, { status: 401 });
    }
    const { id } = await params;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    // Load booking with service pricing
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { service: true }
    });
    if (!booking || !booking.service) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Booking is cancelled' }, { status: 400 });
    }

    // If logged-in user is on hold, block payment initiation for booking
    try {
      if (session) {
        const user = await prisma.user.findUnique({ where: { email: session.email } });
        if (user?.isOnHold) {
          return NextResponse.json({ error: 'Your account is on hold. Please contact support to lift the hold.' }, { status: 403 });
        }
      }
    } catch (_) {}

    // Determine payable amount and enforce inspection-first flow
    let amountPaise: number;
    const currency = 'INR';

    // Helper: read monthlyDay from booking or notes
    const resolveMonthlyDay = (): number | null => {
      let md: number | null = (booking as any).monthlyDay ?? null;
      if (!md) {
        try {
          const m = (booking.notes || '').match(/monthlyDay\s*=\s*(\d{1,2})/i);
          if (m) md = parseInt(m[1], 10);
        } catch (_) {}
      }
      return md && md >= 1 && md <= 28 ? md : null;
    };
    const indiaDay = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit' });
    const todayDay = parseInt(indiaDay, 10);

    if ((booking as any).type === 'INSPECTION') {
      // For inspection bookings: no payment until inspection is completed and a plan is chosen
      if (!booking.inspectionCompleted) {
        return NextResponse.json({ error: 'Inspection pending. No payment required now.' }, { status: 400 });
      }
      if (booking.planType === 'NONE' || !booking.planPricePaise || booking.planPricePaise <= 0) {
        return NextResponse.json({ error: 'Please select a plan to proceed with payment.' }, { status: 400 });
      }
      // If inspection resulted in a monthly plan, restrict payments to chosen day-of-month
      if (booking.planType === 'MONTHLY') {
        const md = resolveMonthlyDay();
        if (md !== null && todayDay !== md) {
          return NextResponse.json({ error: 'Payment is not due today for this monthly plan.' }, { status: 400 });
        }
      }
      amountPaise = booking.planPricePaise;
    } else {
      // Default service payment for non-inspection bookings
      if (booking.planType !== 'NONE' && booking.planPricePaise && booking.planPricePaise > 0) {
        // For any monthly plan with a configured monthly day, restrict to that day
        if (booking.planType === 'MONTHLY') {
          const md = resolveMonthlyDay();
          if (md !== null && todayDay !== md) {
            return NextResponse.json({ error: 'Payment is not due today for this monthly plan.' }, { status: 400 });
          }
        }
        // If no monthly day configured, allow payment any day
        amountPaise = booking.planPricePaise;
      } else {
        amountPaise = Math.max(100, Math.floor((booking.service.priceMin || 0) * 100));
      }
    }

    // Always create a real Razorpay order; no dev auto-confirm
    const instance = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
    const razorpayOrder = await instance.orders.create({
      amount: amountPaise,
      currency,
      receipt: `booking_${booking.id}`,
      notes: {
        bookingId: booking.id,
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        customerEmail: booking.customerEmail || ''
      }
    });

    // Store Razorpay order id against booking for verification
    await prisma.serviceBooking.update({
      where: { id: booking.id },
      data: { paymentId: razorpayOrder.id }
    });

    return NextResponse.json({ order: razorpayOrder, bookingId: booking.id });
  } catch (error: any) {
    console.error('Booking order creation error:', error);
    return NextResponse.json({ error: 'Failed to create booking order' }, { status: 500 });
  }
}