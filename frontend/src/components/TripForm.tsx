import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { planTrip, TripPlanningError } from "../services/api";
import type { TripPlanRequest } from "../types";

interface FormState {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: string;
  start_date: string;
  start_time: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const initialState: FormState = {
  current_location: "",
  pickup_location: "",
  dropoff_location: "",
  current_cycle_used: "",
  start_date: todayISO(),
  start_time: "08:00",
};

const LOADING_STEPS = [
  "Geocoding your locations...",
  "Calculating optimized route...",
  "Applying HOS driving rules...",
  "Scheduling fuel & rest stops...",
  "Generating daily ELD logs...",
];

export default function TripForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<{ message: string; details?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.current_location.trim()) next.current_location = "Current location is required.";
    if (!form.pickup_location.trim()) next.pickup_location = "Pickup location is required.";
    if (!form.dropoff_location.trim()) next.dropoff_location = "Dropoff location is required.";

    const cycle = Number(form.current_cycle_used);
    if (form.current_cycle_used === "" || Number.isNaN(cycle)) {
      next.current_cycle_used = "Enter the current cycle hours used.";
    } else if (cycle < 0 || cycle > 70) {
      next.current_cycle_used = "Cycle hours must be between 0 and 70.";
    }

    if (!form.start_date) next.start_date = "Start date is required.";
    if (!form.start_time) next.start_time = "Start time is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    setLoadingStep(0);
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 900);

    const payload: TripPlanRequest = {
      current_location: form.current_location.trim(),
      pickup_location: form.pickup_location.trim(),
      dropoff_location: form.dropoff_location.trim(),
      current_cycle_used: Number(form.current_cycle_used),
      start_date: form.start_date,
      start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
    };

    try {
      const trip = await planTrip(payload);
      clearInterval(stepInterval);
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      clearInterval(stepInterval);
      if (err instanceof TripPlanningError) {
        setSubmitError({ message: err.message, details: err.details });
      } else {
        setSubmitError({ message: "Something went wrong. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div id="plan" className="card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-100/60 blur-3xl" />

      <div className="relative mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy-900">Plan a new trip</h3>
          <p className="text-sm text-slate-500">Enter trip details to generate an HOS-compliant schedule.</p>
        </div>
        <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-brand-50 sm:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-5" noValidate>
        <div>
          <label className="field-label" htmlFor="current_location">Current Location</label>
          <input
            id="current_location"
            className="input-field"
            placeholder="e.g. Chicago, IL"
            value={form.current_location}
            onChange={(e) => updateField("current_location", e.target.value)}
            aria-invalid={!!errors.current_location}
            aria-describedby={errors.current_location ? "current_location-error" : undefined}
          />
          {errors.current_location && (
            <p id="current_location-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.current_location}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="pickup_location">Pickup Location</label>
            <input
              id="pickup_location"
              className="input-field"
              placeholder="e.g. Dallas, TX"
              value={form.pickup_location}
              onChange={(e) => updateField("pickup_location", e.target.value)}
              aria-invalid={!!errors.pickup_location}
            />
            {errors.pickup_location && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.pickup_location}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="dropoff_location">Dropoff Location</label>
            <input
              id="dropoff_location"
              className="input-field"
              placeholder="e.g. Houston, TX"
              value={form.dropoff_location}
              onChange={(e) => updateField("dropoff_location", e.target.value)}
              aria-invalid={!!errors.dropoff_location}
            />
            {errors.dropoff_location && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.dropoff_location}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="current_cycle_used">Current Cycle Used (hrs)</label>
            <input
              id="current_cycle_used"
              type="number"
              min={0}
              max={70}
              step={0.5}
              className="input-field"
              placeholder="0 – 70"
              value={form.current_cycle_used}
              onChange={(e) => updateField("current_cycle_used", e.target.value)}
              aria-invalid={!!errors.current_cycle_used}
            />
            {errors.current_cycle_used && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.current_cycle_used}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="start_date">Start Date</label>
            <input
              id="start_date"
              type="date"
              className="input-field"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
              aria-invalid={!!errors.start_date}
            />
            {errors.start_date && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.start_date}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="start_time">Start Time</label>
            <input
              id="start_time"
              type="time"
              className="input-field"
              value={form.start_time}
              onChange={(e) => updateField("start_time", e.target.value)}
              aria-invalid={!!errors.start_time}
            />
            {errors.start_time && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.start_time}</p>}
          </div>
        </div>

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">{submitError.message}</p>
            {submitError.details && <p className="mt-0.5 text-xs text-red-600/90">{submitError.details}</p>}
          </div>
        )}

        {isSubmitting && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="h-4 w-4 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm font-medium text-brand-700">{LOADING_STEPS[loadingStep]}</p>
            </div>
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Planning your trip...
            </>
          ) : (
            <>
              Plan My Trip
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
