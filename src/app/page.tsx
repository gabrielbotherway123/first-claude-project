"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TripFormData } from "@/lib/types";

const CURRENCIES = ["GBP", "USD", "EUR", "CHF", "SGD", "AED", "JPY"];
const AMENITIES_OPTIONS = [
  "Gym", "Spa", "Pool", "Restaurant", "Bar", "Concierge",
  "Business Centre", "Room Service", "Parking", "Airport Shuttle",
  "Valet", "Laundry", "High-Speed WiFi",
];

const initialForm: TripFormData = {
  fullName: "",
  email: "",
  phone: "",
  originCity: "",
  destinations: [""],
  departureDate: "",
  returnDate: "",
  numberOfNights: 1,
  totalBudget: 5000,
  currency: "GBP",
  numberOfTravellers: 1,
  cabinClass: "business",
  hotelStarRating: 5,
  locationPreference: "city_centre",
  amenities: [],
  tripPurpose: "",
  specialRequirements: "",
  loyaltyNumbers: "",
  pin: "",
};

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<TripFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  function set<K extends keyof TripFormData>(key: K, value: TripFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addDestination() {
    set("destinations", [...form.destinations, ""]);
  }

  function removeDestination(idx: number) {
    set("destinations", form.destinations.filter((_, i) => i !== idx));
  }

  function setDestination(idx: number, val: string) {
    const next = [...form.destinations];
    next[idx] = val;
    set("destinations", next);
  }

  function toggleAmenity(a: string) {
    if (form.amenities.includes(a)) {
      set("amenities", form.amenities.filter((x) => x !== a));
    } else {
      set("amenities", [...form.amenities, a]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.destinations.some((d) => !d.trim())) {
      setError("Please fill in all destination fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate plans");
      router.push(`/plans/${data.tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf5]">
      <header className="bg-[#0a1628] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[#c9a84c] text-xs tracking-[4px] uppercase block mb-1">Executive</span>
            <h1 className="text-white text-2xl font-light tracking-wide">Travel Planner</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] inline-block" />
            <span className="text-[#c9a84c] text-xs tracking-widest uppercase">AI-Powered</span>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a3060] px-6 py-16 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[5px] uppercase mb-3">Premium Service</p>
        <h2 className="text-white text-4xl font-light mb-4">Plan your next journey</h2>
        <p className="text-slate-300 max-w-xl mx-auto">
          Tell us about your trip and our AI will generate five tailored itinerary options — flights, hotels, and everything in between.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {loading ? (
          <LoadingScreen />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-3 mb-8">
              {([1, 2] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`flex items-center gap-2 text-sm transition-all ${step === s ? "text-[#0a1628] font-semibold" : "text-slate-400"}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-[#c9a84c] text-white" : "bg-slate-200 text-slate-500"}`}>{s}</span>
                  {s === 1 ? "Trip Details" : "Preferences"}
                </button>
              ))}
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {step === 1 && (
              <div className="space-y-6 fade-in-up">
                <Section title="Your Details">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Full Name" required>
                      <input className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Alexandra Whitmore" required />
                    </Field>
                    <Field label="Email Address" required>
                      <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="a.whitmore@firm.com" required />
                    </Field>
                    <Field label="Phone Number">
                      <input className={inputCls} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+44 7700 900000" />
                    </Field>
                  </div>
                </Section>

                <Section title="Route & Dates">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Origin City / Airport" required>
                      <input className={inputCls} value={form.originCity} onChange={(e) => set("originCity", e.target.value)} placeholder="London Heathrow (LHR)" required />
                    </Field>
                    <Field label="Destinations" required>
                      <div className="space-y-2">
                        {form.destinations.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <input className={inputCls + " flex-1"} value={d} onChange={(e) => setDestination(i, e.target.value)} placeholder={`Destination ${i + 1}`} required />
                            {form.destinations.length > 1 && (
                              <button type="button" onClick={() => removeDestination(i)} className="text-slate-400 hover:text-red-500 text-lg px-1">×</button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={addDestination} className="text-[#c9a84c] text-sm hover:underline">+ Add destination</button>
                      </div>
                    </Field>
                    <Field label="Departure Date" required>
                      <input className={inputCls} type="date" value={form.departureDate} onChange={(e) => set("departureDate", e.target.value)} required />
                    </Field>
                    <Field label="Return Date" required>
                      <input className={inputCls} type="date" value={form.returnDate} onChange={(e) => set("returnDate", e.target.value)} required />
                    </Field>
                    <Field label="Number of Nights" required>
                      <input className={inputCls} type="number" min={1} value={form.numberOfNights} onChange={(e) => set("numberOfNights", parseInt(e.target.value))} required />
                    </Field>
                  </div>
                </Section>

                <Section title="Budget & Travellers">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="Total Budget" required>
                      <input className={inputCls} type="number" min={0} value={form.totalBudget} onChange={(e) => set("totalBudget", parseFloat(e.target.value))} required />
                    </Field>
                    <Field label="Currency">
                      <select className={selectCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Travellers">
                      <input className={inputCls} type="number" min={1} max={20} value={form.numberOfTravellers} onChange={(e) => set("numberOfTravellers", parseInt(e.target.value))} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Cabin Class">
                      <div className="flex gap-3 flex-wrap">
                        {(["economy", "business", "first"] as const).map((cls) => (
                          <label key={cls} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${form.cabinClass === cls ? "border-[#c9a84c] bg-[#f5edd8] text-[#0a1628]" : "border-slate-200 hover:border-slate-300"}`}>
                            <input type="radio" name="cabinClass" value={cls} checked={form.cabinClass === cls} onChange={() => set("cabinClass", cls)} className="hidden" />
                            <span className="capitalize text-sm font-medium">{cls}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                  </div>
                </Section>

                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep(2)} className={primaryBtn}>
                    Continue to Preferences →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 fade-in-up">
                <Section title="Accommodation">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Hotel Star Rating">
                      <div className="flex gap-2">
                        {[3, 4, 5].map((s) => (
                          <label key={s} className={`flex items-center gap-1 px-4 py-2 rounded-lg border cursor-pointer transition-all ${form.hotelStarRating === s ? "border-[#c9a84c] bg-[#f5edd8] text-[#0a1628]" : "border-slate-200 hover:border-slate-300"}`}>
                            <input type="radio" name="stars" value={s} checked={form.hotelStarRating === s} onChange={() => set("hotelStarRating", s)} className="hidden" />
                            <span className="text-sm font-medium">{s}★</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="Location Preference">
                      <select className={selectCls} value={form.locationPreference} onChange={(e) => set("locationPreference", e.target.value as TripFormData["locationPreference"])}>
                        <option value="city_centre">City Centre</option>
                        <option value="airport">Near Airport</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </Field>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Preferred Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {AMENITIES_OPTIONS.map((a) => (
                        <button key={a} type="button" onClick={() => toggleAmenity(a)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${form.amenities.includes(a) ? "border-[#c9a84c] bg-[#f5edd8] text-[#0a1628] font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section title="Trip Context">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Purpose of Trip" required>
                      <select className={selectCls} value={form.tripPurpose} onChange={(e) => set("tripPurpose", e.target.value)} required>
                        <option value="">Select purpose…</option>
                        {["Business Meeting", "Conference / Summit", "Client Entertainment", "Board Offsite", "Roadshow", "Due Diligence Visit", "Investor Relations", "Team Leadership", "Other"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Loyalty Programme Numbers">
                      <input className={inputCls} value={form.loyaltyNumbers} onChange={(e) => set("loyaltyNumbers", e.target.value)} placeholder="BA: 12345, Marriott: 67890" />
                    </Field>
                    <Field label="Special Requirements" className="sm:col-span-2">
                      <textarea className={inputCls + " resize-none h-20"} value={form.specialRequirements} onChange={(e) => set("specialRequirements", e.target.value)} placeholder="Dietary requirements, accessibility needs, early check-in, etc." />
                    </Field>
                  </div>
                </Section>

                <Section title="Access">
                  <Field label="PIN (if required)">
                    <input className={inputCls + " max-w-xs"} type="password" value={form.pin} onChange={(e) => set("pin", e.target.value)} placeholder="Leave blank if no PIN set" />
                  </Field>
                </Section>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="text-slate-600 hover:text-[#0a1628] text-sm flex items-center gap-2 transition-colors">
                    ← Back to Trip Details
                  </button>
                  <button type="submit" className={primaryBtn}>
                    Generate Itineraries →
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-24 fade-in-up">
      <div className="w-16 h-16 rounded-full border-4 border-[#0a1628] border-t-[#c9a84c] animate-spin mb-8" />
      <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">Please wait</p>
      <h3 className="text-[#0a1628] text-2xl font-light mb-3">Crafting your itineraries</h3>
      <p className="text-slate-500 text-center max-w-sm">
        Our AI is analysing flights, hotels, and schedules to build five bespoke options for your journey.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-[#0a1628] font-semibold text-sm uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, required, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-[#c9a84c]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[#0a1628] text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all";
const selectCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[#0a1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all";
const primaryBtn = "bg-[#0a1628] text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-[#122040] transition-colors shadow-sm";
