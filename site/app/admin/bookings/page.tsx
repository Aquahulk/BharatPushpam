export const dynamic = 'force-dynamic';
import { prisma } from '@/app/lib/prisma';
import { formatDateTimeIST } from '@/app/lib/date';
import AdminBookingActions from './AdminBookingActions';
import AdminBookingStatusDropdown from './AdminBookingStatusDropdown';

function formatTimeLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const mm = m.toString().padStart(2, '0');
  return `${hour12}:${mm} ${ampm}`;
}

function formatDateHeader(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function groupByDate<T extends { date: string }>(items: T[]) {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.date;
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

export default async function AdminBookingsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const qRaw = searchParams?.q;
  const query = (Array.isArray(qRaw) ? qRaw[0] : qRaw)?.toString().trim().toLowerCase() || '';
  const bookings = await prisma.serviceBooking.findMany({
    orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
    include: { service: true }
  });

  // Hide only bookings explicitly marked as service completed
  let activeBookings = bookings.filter((b: any) => !b.serviceCompleted);
  if (query) {
    activeBookings = activeBookings.filter((b: any) => {
      const serviceName = (b.service?.name || '').toLowerCase();
      const customerName = (b.customerName || '').toLowerCase();
      const email = (b.customerEmail || '').toLowerCase();
      const phone = (b.customerPhone || '').toLowerCase();
      return (
        serviceName.includes(query) ||
        customerName.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    });
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin: Bookings</h1>
      <p className="text-gray-700">All service bookings grouped by date and time.</p>
      {/* Top Tabs: Orders | Bookings */}
      <div className="border-b">
        <nav className="flex gap-4 px-1">
          <a href="/admin/orders" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:border-b-2 hover:border-gray-300">Orders</a>
          <a href="/admin/bookings" className="px-3 py-2 text-sm font-medium border-b-2 border-green-600 text-green-700">Bookings</a>
        </nav>
      </div>

      {/* Search */}
      <form action="/admin/bookings" method="GET" className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search customer or service"
          className="w-full max-w-md border rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="px-3 py-2 text-sm rounded bg-gray-800 text-white">Search</button>
        {query && (
          <a href="/admin/bookings" className="text-sm text-blue-600 hover:underline">Clear</a>
        )}
      </form>

      {/* Grouped by Date */}
      {Object.entries(groupByDate(activeBookings)).map(([date, items]) => (
        <section key={date} className="space-y-3">
          <div className="sticky top-0 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-green-800">{formatDateHeader(date)}</div>
              <div className="text-xs text-gray-600">{items.length} bookings</div>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600">
              <div className="col-span-2">Time</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-3">Address</div>
              <div className="col-span-2">Service</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {items.sort((a: any, b: any) => a.startMinutes - b.startMinutes).map((b: any) => (
              <div key={b.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-t hover:bg-gray-50 items-start">
                <div className="col-span-2 text-sm font-mono">{formatTimeLabel(b.startMinutes)}–{formatTimeLabel((b.startMinutes || 0) + (b.durationMinutes || 120))}</div>
                <div className="col-span-2 text-sm">
                  <div>{b.customerName} • {b.customerPhone}</div>
                  {b.customerEmail && <div className="text-xs text-gray-500">{b.customerEmail}</div>}
                </div>
                <div className="col-span-3 text-xs text-gray-700 whitespace-normal break-words leading-snug pr-2 min-w-0">
                  <div className="font-medium text-gray-800">Address</div>
                  <div>
                    {[b.addressLine1, b.addressLine2].filter(Boolean).join(', ')}
                  </div>
                  <div>
                    {[b.city, b.state, b.postalCode].filter(Boolean).join(', ')}
                  </div>
                </div>
                <div className="col-span-2 text-sm min-w-0">
                  <div className="space-y-1 leading-snug">
                    <div className="font-semibold break-words whitespace-normal">{b.service?.name}</div>
                    <a href={`/admin/bookings/${b.id}`} className="text-xs text-blue-600 hover:underline inline-block">View details</a>
                    <div className="mt-2">
                      <span className={`inline-block text-xs px-2 py-1 rounded ${b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 flex flex-wrap items-center justify-end gap-2 shrink-0">
                  <AdminBookingStatusDropdown id={b.id} status={b.status} type={b.type as any} inspectionCompleted={b.inspectionCompleted} serviceCompleted={b.serviceCompleted} planType={b.planType as any} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}