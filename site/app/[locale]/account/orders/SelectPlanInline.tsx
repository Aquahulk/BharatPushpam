"use client";
import { useState } from 'react';
import { formatINR, paiseToRupees } from '@/app/lib/currency';

export default function SelectPlanInline({ bookingId, basePaise, payHref }: { bookingId: string; basePaise: number; payHref: string }) {
  const [selected, setSelected] = useState<'NONE' | 'PER_VISIT' | 'MONTHLY'>('NONE');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyDay, setMonthlyDay] = useState<number | ''>('');
  const perVisitPaise = basePaise;
  const monthlyPaise = basePaise * 4;

  async function savePlan() {
    if (selected === 'NONE') return;
    setSaving(true);
    setError(null);
    try {
      if (selected === 'MONTHLY') {
        const md = typeof monthlyDay === 'number' ? monthlyDay : parseInt(String(monthlyDay || ''), 10);
        if (!md || md < 1 || md > 28) {
          throw new Error('Please choose a monthly payment date between 1 and 28');
        }
      }
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selected,
          planPricePaise: selected === 'PER_VISIT' ? perVisitPaise : monthlyPaise,
          monthlyDay: selected === 'MONTHLY' ? (typeof monthlyDay === 'number' ? monthlyDay : parseInt(String(monthlyDay || ''), 10)) : undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save plan');
      }
      setSaved(true);
    } catch (e: any) {
      setError(e.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-green-700">Plan saved. Proceed to payment.</div>
        <a href={payHref} className="inline-block bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Pay Now</a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-700">Select a maintenance plan to proceed:</p>
      <div className="flex gap-3">
        <button
          className={`px-3 py-2 rounded border transition-colors ${selected === 'PER_VISIT' ? 'border-green-600 bg-green-50 ring-2 ring-green-500 text-green-800' : 'border-gray-300 hover:border-gray-400'}`}
          aria-pressed={selected === 'PER_VISIT'}
          onClick={() => setSelected('PER_VISIT')}
        >
          Per Visit — {formatINR(paiseToRupees(perVisitPaise))}
        </button>
        <button
          className={`px-3 py-2 rounded border transition-colors ${selected === 'MONTHLY' ? 'border-green-600 bg-green-50 ring-2 ring-green-500 text-green-800' : 'border-gray-300 hover:border-gray-400'}`}
          aria-pressed={selected === 'MONTHLY'}
          onClick={() => setSelected('MONTHLY')}
        >
          Monthly — {formatINR(paiseToRupees(monthlyPaise))}
        </button>
      </div>
      {selected === 'MONTHLY' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Monthly payment date (1–28)</label>
          <input
            type="number"
            min={1}
            max={28}
            value={monthlyDay}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setMonthlyDay('');
              else setMonthlyDay(parseInt(v, 10));
            }}
            className="w-32 px-2 py-1 border rounded"
            placeholder="e.g. 5"
          />
          <div className="text-xs text-gray-500">Payments open on your chosen date each month.</div>
        </div>
      )}
      <button
        onClick={savePlan}
        disabled={saving || selected === 'NONE'}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Plan'}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}