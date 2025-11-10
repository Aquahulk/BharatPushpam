"use client";
import { useEffect, useState } from 'react';
import { todayISTYYYYMMDD } from '@/app/lib/date';

type Slot = { startMinutes: number; label: string; booked: boolean };

export default function BookingWidget({ serviceSlug }: { serviceSlug: string }) {
  // Default to today in IST (Asia/Kolkata) to avoid user-local offsets
  const [date, setDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [allowedPrefixes, setAllowedPrefixes] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'date' | 'slot' | 'details' | 'address'>('date');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Kitchen Gardening plan states
  const isKitchenService = serviceSlug === 'kitchen-gardening';
  const [plan, setPlan] = useState<'SETUP' | 'MONTHLY'>('SETUP');
  const [vegCount, setVegCount] = useState<number>(1);
  const [monthlyDay, setMonthlyDay] = useState<number>(5);
  const setupUnitPrice = 300;
  const totalPrice = Math.max(0, (vegCount || 0) * setupUnitPrice);
  const totalPaise = totalPrice * 100;

  // Plants on Rent states
  const isPlantRental = serviceSlug === 'plants-on-rent';
  const [rentalPlan, setRentalPlan] = useState<'BASIC' | 'SWAP'>('BASIC');
  const [selectedPlants, setSelectedPlants] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [isPlantPickerOpen, setPlantPickerOpen] = useState(false);
  const [plantSearch, setPlantSearch] = useState('');
  const [plantResults, setPlantResults] = useState<{ id: string; slug: string; name: string; category?: { name: string } }[]>([]);
  const [isSearchingPlants, setIsSearchingPlants] = useState(false);

  // Plant Hostel states
  const isPlantHostel = serviceSlug === 'plant-hostel-service';
  const [hostelPlants, setHostelPlants] = useState<number>(1);
  const [hostelDays, setHostelDays] = useState<number>(1);
  const [hostelPickupDrop, setHostelPickupDrop] = useState<boolean>(true);
  const [hostelRatePerDay, setHostelRatePerDay] = useState<number>(10); // default; override from admin settings
  const [hostelPickupDropCharge, setHostelPickupDropCharge] = useState<number>(99); // default; override from admin settings
  const hostelTotal = Math.max(0, (hostelPlants || 0) * (hostelDays || 0) * hostelRatePerDay + hostelPickupDropCharge);
  const hostelTotalPaise = hostelTotal * 100;

  function normalizeDate(input: string) {
    const ddmmyyyy = input.match(/^([0-3]\d)-([0-1]\d)-(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      return `${yyyy}-${mm}-${dd}`;
    }
    return input; // assume YYYY-MM-DD
  }

  // Auto-pick monthly payment day for Plants on Rent from selected slot date
  useEffect(() => {
    if (isPlantRental && date) {
      const d = normalizeDate(date);
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const dom = parseInt(m[3], 10);
        const picked = Math.max(1, Math.min(dom, 28));
        if (!Number.isNaN(picked)) setMonthlyDay(picked);
      }
    }
  }, [isPlantRental, date]);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      if (!serviceSlug) { setLoading(false); return; }
      const dNorm = normalizeDate(date);
      const url = `/api/services/${serviceSlug}/slots?date=${dNorm}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load slots');
      setSlots(Array.isArray(data.slots) ? data.slots : []);
      try { console.log('[BookingWidget] slots', { date: dNorm, count: Array.isArray(data.slots) ? data.slots.length : 0 }); } catch {}
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (!serviceSlug || !date) return; loadSlots(); }, [date, serviceSlug]);
  // Periodic refresh to reflect bookings/payments made by anyone
  useEffect(() => {
    if (!serviceSlug || !date) return;
    const timer = setInterval(() => { loadSlots(); }, 15000);
    return () => clearInterval(timer);
  }, [date, serviceSlug]);

  // Load public settings to get bookings allowed pincode prefixes (fallback to Pune defaults)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const data = await res.json();
        const prefixes = data?.bookings?.allowedPincodePrefixes || data?.checkout?.allowedPincodePrefixes || [];
        if (Array.isArray(prefixes) && prefixes.length > 0) {
          setAllowedPrefixes(prefixes);
        } else {
          // Pune district defaults
          setAllowedPrefixes(['411', '412', '4131']);
        }
        // Load Plant Hostel fees from admin-managed settings if available
        const hostelFees = (data?.hostel || data?.services?.plantHostel || data?.fees?.plantHostel || {});
        const rate = Number(hostelFees?.ratePerDay);
        if (Number.isFinite(rate) && rate > 0) setHostelRatePerDay(rate);
        const pickup = Number(hostelFees?.pickupDropCharge);
        if (Number.isFinite(pickup) && pickup >= 0) setHostelPickupDropCharge(pickup);
      } catch {
        setAllowedPrefixes(['411', '412', '4131']);
      }
    })();
  }, []);

  // Plants on Rent: search products for plant selection
  useEffect(() => {
    if (!isPlantRental) return;
    const q = plantSearch.trim();
    if (q.length < 2) { setPlantResults([]); return; }
    let cancelled = false;
    setIsSearchingPlants(true);
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) {
          const products = Array.isArray(data.products) ? data.products : [];
          setPlantResults(products.map((p: any) => ({ id: p.id, slug: p.slug, name: p.name, category: p.category })));
        }
      } catch {
        if (!cancelled) setPlantResults([]);
      } finally {
        if (!cancelled) setIsSearchingPlants(false);
      }
    })();
    return () => { cancelled = true; };
  }, [plantSearch, isPlantRental]);

  async function book() {
    if (!selectedStart || !name || !phone) {
      setError('Please select a slot and enter name & phone');
      return;
    }
    if (!serviceSlug) {
      setError('Service not found');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      // Validate address fields compulsory
      const line1 = (addressLine1 || '').trim();
      const cty = (city || '').trim();
      const pin = (postalCode || '').trim();
      if (!line1 || !cty || !pin) {
        throw new Error('Please fill Address line 1, City and Pincode');
      }
      // Validate pincode format and allowed prefixes (Maharashtra Pune-only)
      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(pin)) {
        throw new Error('Please enter a valid 6-digit pincode');
      }
      const isAllowed = allowedPrefixes.length === 0 ? true : allowedPrefixes.some(p => pin.startsWith(p));
      if (!isAllowed) {
        throw new Error('We currently serve only Pune (Maharashtra) district pincodes for services.');
      }

      // Kitchen Gardening: validate plan inputs
      if (isKitchenService) {
        const vc = Number(vegCount || 0);
        if (!vc || vc < 1) throw new Error('Please enter how many vegetables (minimum 1)');
        if (plan === 'MONTHLY') {
          const md = Number(monthlyDay || 0);
          if (!md || md < 1 || md > 28) throw new Error('Please choose a monthly payment date between 1 and 28');
        }
      }

      // Plants on Rent: validate rental inputs
      if (isPlantRental) {
        if (!rentalPlan) throw new Error('Please select a rental plan');
        if (selectedPlants.length !== 5) throw new Error('Please select exactly 5 plants to rent');
        const md = Number(monthlyDay || 0);
        if (!md || md < 1 || md > 28) throw new Error('Please choose a monthly payment date between 1 and 28');
      }

      const computedPlanType = isKitchenService
        ? (plan === 'MONTHLY' ? 'MONTHLY' : 'PER_VISIT')
        : (isPlantRental ? 'MONTHLY' : (isPlantHostel ? 'PER_VISIT' : undefined));
      const computedPlanPricePaise = isKitchenService
        ? totalPaise
        : (isPlantRental ? (150 * 100 + (selectedPlants.length * 1000 * 100)) : (isPlantHostel ? hostelTotalPaise : undefined));
      const augmentedNotes = isKitchenService
        ? `${notes ? notes + '\n' : ''}KG: plan=${computedPlanType}; vegCount=${vegCount}; ${plan === 'MONTHLY' ? `monthlyDay=${monthlyDay}; ` : ''}`
        : (isPlantRental
            ? `${notes ? notes + '\n' : ''}RENT: plan=${rentalPlan}; plantCount=${selectedPlants.length}; plantSlugs=${selectedPlants.map(p => p.slug).join(',')}; depositPerPlant=1000; monthly=150; monthlyDay=${monthlyDay};`
            : (isPlantHostel
                ? `${notes ? notes + '\n' : ''}HOSTEL: plants=${hostelPlants}; days=${hostelDays}; pickupDrop=YES; ratePerDay=${hostelRatePerDay}; pickupDropCharge=${hostelPickupDropCharge};`
                : notes));

      const res = await fetch(`/api/services/${serviceSlug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startMinutes: selectedStart,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          notes: augmentedNotes,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          planType: computedPlanType,
          planPricePaise: computedPlanPricePaise,
          monthlyDay: (computedPlanType === 'MONTHLY') ? Number(monthlyDay || 0) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      // Redirect to payment checkout only when immediate payment is required
      if (data.requiresPayment && data.paymentUrl) {
        setSuccess(`Booking created. Redirecting to payment…`);
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 1500);
      } else {
        if (isKitchenService) {
          if (plan === 'MONTHLY') {
            setSuccess(`Monthly plan booked. Pay option will appear on ${monthlyDay} each month in Orders.`);
          } else {
            setSuccess('Booking created.');
          }
        } else {
          // Garden Services legacy: Free inspection booked
          setSuccess('Free inspection booked. Payment will be enabled after inspection is completed.');
        }
      }
      setSelectedStart(null);
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPostalCode('');
      // Reload slots to reflect booking
      loadSlots();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Auto-advance steps based on completion
  useEffect(() => {
    if (date && slots.length > 0 && currentStep === 'date') {
      setCurrentStep('slot');
    }
  }, [date, slots, currentStep]);

  useEffect(() => {
    if (selectedStart && currentStep === 'slot') {
      setCurrentStep('details');
    }
  }, [selectedStart, currentStep]);

  // Auto-advance to Address after entering basic details (Hostel)
  useEffect(() => {
    if (isPlantHostel && currentStep === 'details' && name.trim() && phone.trim()) {
      setCurrentStep('address');
    }
  }, [isPlantHostel, currentStep, name, phone]);

  const canProceedToAddressBase = name.trim() && phone.trim();
  const canProceedToAddress = isPlantRental
    ? (canProceedToAddressBase && rentalPlan && selectedPlants.length === 5)
    : canProceedToAddressBase;
  const canSubmit = canProceedToAddress && addressLine1.trim() && city.trim() && postalCode.trim() && (isPlantHostel ? ((hostelPlants || 0) >= 1 && (hostelDays || 0) >= 1) : true);

  const getSelectedSlotLabel = () => {
    const slot = slots.find(s => s.startMinutes === selectedStart);
    return slot ? slot.label : '';
  };

  // If slug is missing, render nothing to avoid duplicate widgets
  if (!serviceSlug) { return null; }

  const isInspectionService = serviceSlug === 'garden-services';

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { key: 'date', label: 'Date', icon: '📅' },
          { key: 'slot', label: 'Time', icon: '⏰' },
          { key: 'details', label: 'Details', icon: '👤' },
          { key: 'address', label: 'Address', icon: '📍' }
        ].map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = 
            (step.key === 'date' && date && slots.length > 0) ||
            (step.key === 'slot' && selectedStart) ||
            (step.key === 'details' && canProceedToAddress) ||
            (step.key === 'address' && canSubmit);
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-semibold transition-all duration-300 ${
                isCompleted ? 'bg-green-600 text-white' : 
                isActive ? 'bg-green-100 text-green-600 ring-2 ring-green-600' : 
                'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? '✓' : step.icon}
              </div>
              <div className="ml-2 text-sm">
                <div className={`font-medium ${isActive ? 'text-green-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                  {step.label}
                </div>
              </div>
              {index < 3 && (
                <div className={`w-8 h-0.5 mx-4 transition-colors duration-300 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-200'
                }`}></div>
               )}
             </div>
           );
        })}
      </div>

      {/* Step 1: Date Selection */}
      {currentStep === 'date' && (
        <div className={`transition-all duration-500 opacity-100 transform translate-y-0`}>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📅 Select Date
            </h3>
            <div className="flex items-center gap-4">
              <input 
                type="date" 
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                min={todayISTYYYYMMDD()}
              />
              {date && slots.length > 0 && (
                <div className="text-green-600 font-semibold animate-fade-in">
                  ✓ {slots.filter(s => !s.booked).length} slots available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Slot Selection */}
      {currentStep === 'slot' && (
        <div className={`transition-all duration-500 opacity-100 transform translate-y-0`}>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
               ⏰ Choose Time Slot
               {selectedStart && (
                 <span className="text-green-600 text-base font-normal">
                   {getSelectedSlotLabel()}
                 </span>
               )}
             </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading available slots...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                {error}
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map(slot => (
                  <button
                    key={slot.startMinutes}
                    disabled={slot.booked}
                    onClick={() => setSelectedStart(slot.startMinutes)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 transform hover:scale-105 ${
                      slot.booked 
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                        : selectedStart === slot.startMinutes 
                          ? 'bg-green-600 border-green-600 text-white shadow-lg' 
                          : 'bg-white border-gray-200 hover:border-green-500 hover:shadow-md'
                    }`}
                  >
                    <div className="font-semibold text-lg">{slot.label}</div>
                    <div className="text-sm opacity-75">
                      {slot.booked ? 'Unavailable' : 'Available'}
                    </div>
                    {selectedStart === slot.startMinutes && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <div className="text-4xl mb-2">😔</div>
                No slots available for the selected date. Please choose another date.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Personal Details */}
      <div className={currentStep === 'details' ? '' : 'hidden'}>
        <div className={`transition-all duration-500 opacity-100 transform translate-y-0`}>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">👤 Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300" 
                  placeholder="Enter your full name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300" 
                  placeholder="Enter your phone number" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email (optional)</label>
                <input 
                  type="email"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300" 
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Notes (optional)</label>
                <textarea 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 resize-none" 
                  placeholder="Any special requirements?" 
                  rows={3}
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>
            </div>
            {isKitchenService && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Plan</h4>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2">
                    <button
                      type="button"
                      aria-pressed={plan === 'SETUP'}
                      onClick={() => setPlan('SETUP')}
                      className={`min-w-[240px] p-4 rounded-xl border-2 transition-all ${plan === 'SETUP' ? 'border-green-600 bg-green-50 ring-2 ring-green-500 shadow-lg scale-[1.01]' : 'border-gray-200 bg-white hover:border-green-400 hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900">One-time Setup</div>
                        {plan === 'SETUP' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">✓ Selected</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">₹300 per vegetable</div>
                    </button>
                    <button
                      type="button"
                      aria-pressed={plan === 'MONTHLY'}
                      onClick={() => setPlan('MONTHLY')}
                      className={`min-w-[240px] p-4 rounded-xl border-2 transition-all ${plan === 'MONTHLY' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500 shadow-lg scale-[1.01]' : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900">Monthly Plan</div>
                        {plan === 'MONTHLY' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">✓ Selected</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">₹300 per vegetable per month</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How many vegetables? *</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="e.g., 10"
                      value={vegCount}
                      onChange={e => setVegCount(parseInt(e.target.value || '0', 10))}
                    />
                  </div>
                  {plan === 'MONTHLY' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly payment date *</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        placeholder="Day of month (1-28)"
                        value={monthlyDay}
                        onChange={e => setMonthlyDay(parseInt(e.target.value || '1', 10))}
                      />
                    </div>
                  )}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-sm text-gray-600">Estimated total</div>
                    <div className="text-2xl font-bold text-gray-900">₹{totalPrice.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-gray-500 mt-1">{plan === 'SETUP' ? 'One-time setup' : `Monthly on ${monthlyDay}`}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden">
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Hostel Duration</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How many plants? *</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="e.g., 3"
                      value={hostelPlants}
                      onChange={e => setHostelPlants(parseInt(e.target.value || '0', 10))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How many days? *</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="e.g., 10"
                      value={hostelDays}
                      onChange={e => setHostelDays(parseInt(e.target.value || '0', 10))}
                    />
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-sm text-gray-600">Estimated total</div>
                    <div className="text-2xl font-bold text-gray-900">₹{hostelTotal.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      ₹{hostelRatePerDay} per plant per day + ₹{hostelPickupDropCharge} pickup & drop
                    </div>
                  </div>
              </div>
            </div>
            </div>

            <div className="hidden">
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Rental Plan</h4>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2">
                    <button
                      type="button"
                      aria-pressed={rentalPlan === 'BASIC'}
                      onClick={() => setRentalPlan('BASIC')}
                      className={`min-w-[240px] p-4 rounded-xl border-2 transition-all ${rentalPlan === 'BASIC' ? 'border-green-600 bg-green-50 ring-2 ring-green-500 shadow-lg scale-[1.01]' : 'border-gray-200 bg-white hover:border-green-400 hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900">Basic Plan</div>
                        {rentalPlan === 'BASIC' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">✓ Selected</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">5 plants • ₹1 per day per plant • ₹150 per month total</div>
                      <div className="text-xs text-gray-500 mt-1">Security deposit ₹1000 per plant</div>
                    </button>
                    <button
                      type="button"
                      aria-pressed={rentalPlan === 'SWAP'}
                      onClick={() => setRentalPlan('SWAP')}
                      className={`min-w-[240px] p-4 rounded-xl border-2 transition-all ${rentalPlan === 'SWAP' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500 shadow-lg scale-[1.01]' : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900">Swap Option</div>
                        {rentalPlan === 'SWAP' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">✓ Selected</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Swap any or all plants monthly • Free</div>
                      <div className="text-xs text-gray-500 mt-1">Security deposit ₹1000 per plant</div>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">Selected: <span className="font-semibold">{selectedPlants.length}/5</span></div>
                    <div className="text-sm text-gray-700">Deposit: <span className="font-semibold">₹{(selectedPlants.length * 1000).toLocaleString('en-IN')}</span></div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPlants.map(p => (
                      <button key={p.id} onClick={() => setSelectedPlants(prev => prev.filter(sp => sp.id !== p.id))} className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-300">
                        <span>{p.name}</span>
                        <span className="text-xs">✕</span>
                      </button>
                    ))}
                    {selectedPlants.length < 5 && (
                      <button onClick={() => setPlantPickerOpen(true)} className="inline-flex items-center gap-2 bg-white text-gray-700 px-3 py-1 rounded-full border-2 border-green-300 hover:bg-green-50">
                        + Select Plants
                      </button>
                    )}
                  </div>
                </div>

                {isPlantPickerOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border-2 border-gray-200">
                      <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div className="text-lg font-semibold">Select plants to rent</div>
                        <button onClick={() => setPlantPickerOpen(false)} className="text-gray-600 hover:text-gray-900">✕</button>
                      </div>
                      <div className="p-6 space-y-4">
                        <input
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                          placeholder="Search plants (type at least 2 characters)"
                          value={plantSearch}
                          onChange={e => setPlantSearch(e.target.value)}
                        />
                        {isSearchingPlants ? (
                          <div className="text-gray-600">Searching…</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {plantResults.map(p => (
                              <button
                                key={p.id}
                                disabled={selectedPlants.some(sp => sp.id === p.id) || selectedPlants.length >= 5}
                                onClick={() => setSelectedPlants(prev => prev.some(sp => sp.id === p.id) ? prev : [...prev, { id: p.id, slug: p.slug, name: p.name }])}
                                className={`text-left p-4 rounded-xl border-2 transition-all ${selectedPlants.some(sp => sp.id === p.id) ? 'bg-green-50 border-green-400 text-green-800' : 'bg-white border-gray-200 hover:border-green-500 hover:shadow-md'}`}
                              >
                                <div className="font-semibold">{p.name}</div>
                                <div className="text-xs text-gray-500">{p.category?.name || 'Plant'}</div>
                              </button>
                            ))}
                            {plantResults.length === 0 && plantSearch.trim().length >= 2 && (
                              <div className="text-gray-600">No matching plants found.</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-gray-600">Selected {selectedPlants.length}/5</div>
                        <button
                          onClick={() => setPlantPickerOpen(false)}
                          className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {canProceedToAddress && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setCurrentStep('address')}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all duration-300 font-semibold"
                >
                  Continue to Address
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

{/* Booking Summary & Submit */}
      {currentStep === 'address' && (
         <div className="bg-white rounded-2xl border-2 border-green-200 p-6 shadow-lg">
           <div className="mb-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-3">Address</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Address line 1 *</label>
                 <input
                   className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                   placeholder="House/Flat, Street"
                   value={addressLine1}
                   onChange={e => setAddressLine1(e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Address line 2</label>
                 <input
                   className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                   placeholder="Area, Landmark"
                   value={addressLine2}
                   onChange={e => setAddressLine2(e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                 <input
                   className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                   placeholder="City"
                   value={city}
                   onChange={e => setCity(e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                 <input
                   className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                   placeholder="State"
                   value={state}
                   onChange={e => setState(e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                 <input
                   className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                   placeholder="6-digit"
                   value={postalCode}
                   onChange={e => setPostalCode(e.target.value)}
                 />
               </div>
           </div>
          </div>
          {isPlantRental && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Rental Billing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <div className="text-sm text-gray-600">Estimated monthly</div>
                  <div className="text-2xl font-bold text-gray-900">₹{(150).toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-500 mt-1">Monthly on {monthlyDay} + refundable deposit</div>
                  <div className="text-xs text-gray-500 mt-1">Auto-set from your slot date.</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <div className="text-sm text-gray-600">Estimated monthly</div>
                  <div className="text-2xl font-bold text-gray-900">₹{(150).toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-500 mt-1">Monthly on {monthlyDay} + refundable deposit</div>
                </div>
              </div>
            </div>
          )}
          {isPlantHostel && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Plant Hostel Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How many plants? *</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                    placeholder="e.g., 3"
                    value={hostelPlants}
                    onChange={e => setHostelPlants(parseInt(e.target.value || '0', 10))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How many days? *</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                    placeholder="e.g., 10"
                    value={hostelDays}
                    onChange={e => setHostelDays(parseInt(e.target.value || '0', 10))}
                  />
                </div>
                 <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                   <div className="text-sm text-gray-600">Estimated total</div>
                   <div className="text-2xl font-bold text-gray-900">₹{hostelTotal.toLocaleString('en-IN')}</div>
                   <div className="text-xs text-gray-500 mt-1">
                     ₹{hostelRatePerDay} per plant per day + ₹{hostelPickupDropCharge} pickup & drop
                   </div>
                 </div>
               </div>
             </div>
           )}
            <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Summary</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-semibold">{new Date(date).toLocaleDateString()} - {getSelectedSlotLabel()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">2 hours</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{name}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Phone:</span>
                <span className="font-semibold">{phone}</span>
              </div>

              {/* Amount summary for Plants on Rent */}
              {isPlantRental && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Monthly Fee:</span>
                    <span className="font-semibold">₹{(150).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Refundable Deposit:</span>
                    <span className="font-semibold">₹{(selectedPlants.length * 1000).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-800 font-semibold">Amount Due Now:</span>
                    <span className="text-xl font-bold text-gray-900">₹{(150 + selectedPlants.length * 1000).toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              {/* Amount summary for Plant Hostel */}
              {isPlantHostel && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Per-day charges:</span>
                    <span className="font-semibold">₹{(hostelRatePerDay).toLocaleString('en-IN')} × {hostelPlants} plants × {hostelDays} days</span>
                  </div>
                 <div className="flex justify-between items-center py-2 border-b border-gray-100">
                   <span className="text-gray-600">Pickup & drop:</span>
                   <span className="font-semibold">₹{hostelPickupDropCharge.toLocaleString('en-IN')}</span>
                 </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-800 font-semibold">Amount Due Now:</span>
                    <span className="text-xl font-bold text-gray-900">₹{hostelTotal.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
            
            <button 
              onClick={book} 
              disabled={!canSubmit || isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing Booking...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {isInspectionService ? '📋 Book Free Inspection' : '🎉 Confirm Booking & Pay'}
                </div>
              )}
            </button>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="text-green-600 text-2xl">✅</div>
              <div>
                <div className="font-bold text-green-900">Booking Successful!</div>
                <div className="text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="text-red-600 text-2xl">❌</div>
              <div>
                <div className="font-bold text-red-900">Booking Error</div>
                <div className="text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}


      </div>
    );
}