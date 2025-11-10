import Link from 'next/link';
import { prisma } from '@/app/lib/prisma';
import { getSessionFromCookies } from '@/app/lib/auth';

function parseMonthlyDay(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const m = notes.match(/monthlyDay\s*=\s*(\d{1,2})/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  if (isNaN(day) || day < 1 || day > 28) return null;
  return day;
}

function daysUntilMonthlyDay(today: Date, monthlyDay: number): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetThisMonth = new Date(today.getFullYear(), today.getMonth(), monthlyDay);
  const target = start.getDate() > monthlyDay
    ? new Date(today.getFullYear(), today.getMonth() + 1, monthlyDay)
    : targetThisMonth;
  const ms = target.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function daysUntilDate(today: Date, yyyyMmDd: string): number | null {
  const m = yyyyMmDd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1, d = parseInt(m[3], 10);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(y, mo, d);
  const ms = target.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default async function MonthlyPlanReminder({ locale }: { locale: string }) {
  const session = await getSessionFromCookies();
  if (!session) return null;

  // Fetch active monthly plan bookings for this customer
  const bookings = await prisma.serviceBooking.findMany({
    where: {
      customerEmail: session.email,
      planType: 'MONTHLY',
      serviceCompleted: false
    },
    include: { service: { select: { name: true, slug: true } } }
  });

  const today = new Date();
  // Build entries with and without a configured monthly day
  const entries = bookings.map((b) => {
    const md = (b as any).monthlyDay ?? parseMonthlyDay(b.notes || '');
    const days = typeof md === 'number' ? daysUntilMonthlyDay(today, md) : null;
    const daysToSlot = daysUntilDate(today, b.date);
    return { booking: b, monthlyDay: md as number | null, days: days as number | null, daysToSlot: daysToSlot as number | null };
  });

  // Any service that has a monthly day: show reminder within 0–5 days
  const upcoming = entries.filter((x) => typeof x.monthlyDay === 'number' && x.days !== null && x.days >= 0 && x.days <= 5);
  // Monthly bookings without a specific day yet: show generic reminder with Pay Now
  const anytime = entries.filter((x) => x.monthlyDay === null);
  // First-month scheduling for monthly bookings without a set monthly day: show a 5-day prior reminder to the booked slot date
  const slotSoon = entries.filter((x) => x.monthlyDay === null && x.daysToSlot !== null && x.daysToSlot! >= 0 && x.daysToSlot! <= 5);

  if (upcoming.length === 0 && anytime.length === 0 && slotSoon.length === 0) return null;

  return (
    <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">Monthly service payment reminder</div>
        <Link href={`/${locale}/account/orders`} className="text-xs text-green-700 hover:underline">
          View orders
        </Link>
      </div>
      <div className="mt-2 space-y-2">
        {/* Upcoming due-day reminders (e.g., Kitchen Gardening monthly) */}
        {upcoming.map(({ booking, monthlyDay, days }) => (
          <div key={booking.id} className="flex items-center justify-between">
            <div className="text-sm text-gray-800">
              {(booking.service?.name as string) || 'Service'} • Due on {monthlyDay}
              {days! > 0 ? ` (in ${days} day${days === 1 ? '' : 's'})` : ' (today)'}
            </div>
            <div className="flex items-center gap-2">
              {days === 0 ? (
                <a
                  href={`/${locale}/pay/booking/${booking.id}`}
                  className="px-2 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                >
                  Pay now
                </a>
              ) : (
                <span className="text-xs text-gray-600">Payment opens on day {monthlyDay}</span>
              )}
            </div>
          </div>
        ))}

        {/* Monthly bookings without a fixed payment day */}
        {anytime.map(({ booking }) => (
          <div key={booking.id} className="flex items-center justify-between">
            <div className="text-sm text-gray-800">
              {(booking.service?.name as string) || 'Service'} • Monthly plan
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/${locale}/pay/booking/${booking.id}`}
                className="px-2 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700"
              >
                Pay now
              </a>
            </div>
          </div>
        ))}

        {/* Scheduled soon (5-day prior to selected slot date) */}
        {slotSoon.map(({ booking, daysToSlot }) => (
          <div key={booking.id} className="flex items-center justify-between">
            <div className="text-sm text-gray-800">
              {(booking.service?.name as string) || 'Service'} • {booking.service?.slug === 'plants-on-rent' ? 'Renting is ending soon' : 'Scheduled soon'} — {booking.date}
              {daysToSlot! > 0 ? ` (in ${daysToSlot} day${daysToSlot === 1 ? '' : 's'})` : ' (today)'}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/account/orders`}
                className="px-2 py-1.5 rounded border border-green-600 text-green-700 text-xs hover:bg-green-50"
              >
                Manage booking
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}