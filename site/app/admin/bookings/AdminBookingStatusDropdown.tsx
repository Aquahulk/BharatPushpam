"use client";
import { useState } from 'react';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
type ServiceBookingType = 'INSPECTION' | 'MAINTENANCE';
type MaintenancePlanType = 'NONE' | 'PER_VISIT' | 'MONTHLY';

export default function AdminBookingStatusDropdown({
  id,
  status,
  type,
  inspectionCompleted,
  serviceCompleted,
  planType
}: {
  id: string;
  status: BookingStatus;
  type: ServiceBookingType;
  inspectionCompleted?: boolean;
  serviceCompleted?: boolean;
  planType?: MaintenancePlanType;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<BookingStatus>(status);
  const [localCompleted, setLocalCompleted] = useState<boolean>(type === 'INSPECTION' ? !!inspectionCompleted : !!serviceCompleted);
  const [localServiceCompleted, setLocalServiceCompleted] = useState<boolean>(!!serviceCompleted);

  async function updateBookingStatus(next: BookingStatus) {
    setLoading('status');
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update booking status');
      }
      setLocalStatus(next);
      // For simplicity, reload to refresh server-rendered list
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Failed to update booking status');
    } finally {
      setLoading(null);
    }
  }

  async function updateCompletion(next: boolean) {
    setLoading('completed');
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'INSPECTION' ? { inspectionCompleted: next } : { serviceCompleted: next })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update completion');
      }
      setLocalCompleted(next);
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Failed to update completion');
    } finally {
      setLoading(null);
    }
  }

  async function updateServiceCompletion(next: boolean) {
    setLoading('serviceCompleted');
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceCompleted: next })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update service completion');
      }
      setLocalServiceCompleted(next);
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Failed to update service completion');
    } finally {
      setLoading(null);
    }
  }

  const statusOptions: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED'];

  const processLabel = type === 'INSPECTION' ? 'Inspection' : 'Service';
  const completionLabel = type === 'INSPECTION' ? (localCompleted ? 'Inspection Done' : 'Mark Inspection Done') : (localCompleted ? 'Completed' : 'Mark Completed');

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Completion controls on top */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Completion</label>
        <select
          className="text-xs border rounded px-2 py-1"
          value={localServiceCompleted ? 'COMPLETED' : 'PENDING'}
          onChange={(e) => updateServiceCompletion(e.target.value === 'COMPLETED')}
          disabled={loading !== null || localStatus === 'CANCELLED'}
        >
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Process-specific completion toggle */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">{processLabel}</label>
        <button
          className={`text-xs px-2 py-1 rounded ${localCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} disabled:opacity-50`}
          onClick={() => updateCompletion(!localCompleted)}
          disabled={loading !== null || localStatus === 'CANCELLED'}
          title={completionLabel}
        >
          {completionLabel}
        </button>
      </div>

      {/* Booking status below completion */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Status</label>
        <select
          className="text-xs border rounded px-2 py-1"
          value={localStatus}
          onChange={(e) => updateBookingStatus(e.target.value as BookingStatus)}
          disabled={loading !== null}
        >
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}