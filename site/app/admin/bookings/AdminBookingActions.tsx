"use client";
import { useState } from 'react';

export default function AdminBookingActions({ id, status, type, inspectionCompleted, serviceCompleted, hideDelete }: { id: string; status: string; type?: string; inspectionCompleted?: boolean; serviceCompleted?: boolean; hideDelete?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancelBooking() {
    setLoading('cancel');
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel booking');
      }
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Failed to cancel booking');
    } finally {
      setLoading(null);
    }
  }

  async function deleteBooking() {
    setLoading('delete');
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete booking');
      }
      window.location.href = '/admin/bookings';
    } catch (e: any) {
      setError(e.message || 'Failed to delete booking');
    } finally {
      setLoading(null);
    }
  }

  async function markInspectionDone() {
    setLoading('inspect');
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionCompleted: true })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark inspection done');
      }
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Failed to mark inspection done');
    } finally {
      setLoading(null);
    }
  }

  async function markCompleted() {
    setLoading('complete');
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'INSPECTION' ? { inspectionCompleted: true } : { serviceCompleted: true })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark completed');
      }
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Failed to mark completed');
    } finally {
      setLoading(null);
    }
  }

  const canMarkInspection = (type === 'INSPECTION') && status !== 'CANCELLED' && !inspectionCompleted;
  const canMarkCompleted = status !== 'CANCELLED' && (!(type === 'INSPECTION') ? !serviceCompleted : !inspectionCompleted);

  return (
    <div className="flex items-center gap-3 mt-2">
      {canMarkInspection && (
        <button
          onClick={markInspectionDone}
          disabled={loading !== null}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'inspect' ? 'Saving…' : 'Mark Inspection Done'}
        </button>
      )}
      {canMarkInspection && <span className="text-gray-300">|</span>}
      {canMarkCompleted && (
        <button
          onClick={markCompleted}
          disabled={loading !== null}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'complete' ? 'Saving…' : 'Mark Completed'}
        </button>
      )}
      {canMarkCompleted && <span className="text-gray-300">|</span>}
      <button
        onClick={cancelBooking}
        disabled={loading !== null || status === 'CANCELLED'}
        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
      >
        {loading === 'cancel' ? 'Cancelling…' : 'Cancel'}
      </button>
      {!hideDelete && (
        <>
          <span className="text-gray-300">|</span>
          <button
            onClick={deleteBooking}
            disabled={loading !== null}
            className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-black"
          >
            {loading === 'delete' ? 'Deleting…' : 'Delete'}
          </button>
        </>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}