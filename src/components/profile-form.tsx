"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FloatingInput, FloatingTextarea, GlassCard, Button } from "@/components/ui";
import { AirportSearch } from "@/components/airport-search";
import { AirlineSelect } from "@/components/airline-select";
import { saveProfileAction } from "@/app/actions/profile";
import type { PreferredAirline, UserProfile } from "@/lib/types";

const CABINS = [
  { value: "economy", label: "Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];
const LOCATIONS = [
  { value: "city_centre", label: "City centre" },
  { value: "airport", label: "Near airport" },
  { value: "flexible", label: "Flexible" },
];

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [airports, setAirports] = useState<string[]>(
    profile.defaultAirports.length ? profile.defaultAirports : [""]
  );
  const [airlines, setAirlines] = useState<PreferredAirline[]>(
    profile.preferredAirlines.length
      ? profile.preferredAirlines
      : [{ airline: "", rewardsNumber: "" }]
  );
  const [cabin, setCabin] = useState(profile.defaultCabinClass);
  const [stars, setStars] = useState<number | null>(profile.defaultHotelStars);
  const [location, setLocation] = useState(profile.defaultLocationPreference);
  const [requirements, setRequirements] = useState(profile.standingRequirements);

  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function setAirport(i: number, v: string) {
    setAirports((prev) => prev.map((a, idx) => (idx === i ? v : a)));
  }
  function setAirlineField(i: number, patch: Partial<PreferredAirline>) {
    setAirlines((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function save() {
    setSaved(false);
    startTransition(async () => {
      await saveProfileAction({
        name,
        phone,
        defaultAirports: airports,
        preferredAirlines: airlines,
        defaultCabinClass: cabin,
        defaultHotelStars: stars,
        defaultLocationPreference: location,
        standingRequirements: requirements,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile & preferences</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Saved here once, these details pre-fill every new trip you plan.
        </p>
      </div>

      <GlassCard strong className="p-6 space-y-5">
        <SectionTitle>Contact</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <FloatingInput label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <FloatingInput
            label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <FloatingInput label="Email" value={profile.email} disabled />
      </GlassCard>

      <GlassCard strong className="p-6 space-y-4">
        <SectionTitle>Home airports</SectionTitle>
        <p className="text-sm text-[var(--text-muted)] -mt-2">
          Airports you frequently depart from. Shown as quick-select chips on the trip form.
        </p>
        <div className="space-y-3">
          {airports.map((a, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <AirportSearch label={`Airport ${i + 1}`} value={a} onChange={(v) => setAirport(i, v)} />
              </div>
              {airports.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAirports((p) => p.filter((_, idx) => idx !== i))}
                  className="mt-3 text-[var(--text-dim)] hover:text-[var(--danger)] text-xl px-1"
                  aria-label="Remove airport"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAirports((p) => [...p, ""])}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          + Add airport
        </button>
      </GlassCard>

      <GlassCard strong className="p-6 space-y-4">
        <SectionTitle>Airlines & rewards</SectionTitle>
        <p className="text-sm text-[var(--text-muted)] -mt-2">
          Preferred carriers and your frequent-flyer numbers. Applied automatically when you
          select that airline for a trip.
        </p>
        <div className="space-y-3">
          {airlines.map((a, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <AirlineSelect
                label="Airline"
                value={a.airline}
                onSelect={(air) => setAirlineField(i, { airline: air?.name ?? "" })}
              />
              <FloatingInput
                label="Rewards number"
                value={a.rewardsNumber}
                onChange={(e) => setAirlineField(i, { rewardsNumber: e.target.value })}
              />
              {airlines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAirlines((p) => p.filter((_, idx) => idx !== i))}
                  className="mt-3 text-[var(--text-dim)] hover:text-[var(--danger)] text-xl px-1"
                  aria-label="Remove airline"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAirlines((p) => [...p, { airline: "", rewardsNumber: "" }])}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          + Add airline
        </button>
      </GlassCard>

      <GlassCard strong className="p-6 space-y-5">
        <SectionTitle>Travel defaults</SectionTitle>
        <div>
          <FieldLabel>Preferred cabin class</FieldLabel>
          <Segmented
            options={CABINS}
            value={cabin}
            onChange={(v) => setCabin(v as UserProfile["defaultCabinClass"])}
          />
        </div>
        <div>
          <FieldLabel>Preferred hotel rating</FieldLabel>
          <Segmented
            options={[3, 4, 5].map((s) => ({ value: String(s), label: `${s}★` }))}
            value={stars ? String(stars) : ""}
            onChange={(v) => setStars(v ? Number(v) : null)}
          />
        </div>
        <div>
          <FieldLabel>Hotel location preference</FieldLabel>
          <Segmented
            options={LOCATIONS}
            value={location}
            onChange={(v) => setLocation(v as UserProfile["defaultLocationPreference"])}
          />
        </div>
        <FloatingTextarea
          label="Standing special requirements"
          rows={3}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </GlassCard>

      <div className="flex items-center gap-4 sticky bottom-4">
        <Button onClick={save} loading={pending}>
          Save preferences
        </Button>
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-[var(--success)]"
            >
              ✓ Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--text-muted)] mb-2">{children}</p>;
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(selected ? "" : o.value)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              selected
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${options.map((x) => x.value).join("")}`}
                className="absolute inset-0 rounded-xl bg-[var(--accent-soft)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
