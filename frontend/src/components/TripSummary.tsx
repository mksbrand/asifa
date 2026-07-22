import type { Trip } from "../types";

const STATUS_STYLES: Record<Trip["status"], { label: string; className: string }> = {
  planned: { label: "Compliant Schedule", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cycle_exceeded: { label: "Cycle Limit Exceeded", className: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { label: "Planning Failed", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function TripSummary({ trip }: { trip: Trip }) {
  const statusStyle = STATUS_STYLES[trip.status];

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trip #{trip.id}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-navy-900">
            <span>{trip.current_location}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-brand-600">{trip.pickup_location}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-emerald-600">{trip.dropoff_location}</span>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle.className}`}>
          {statusStyle.label}
        </span>
      </div>

      {trip.status === "cycle_exceeded" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This trip cannot be completed within the driver's remaining 70-hour/8-day cycle.
          A 34-hour restart or additional off-duty time is required before the full route can
          be legally driven. The schedule below reflects driving only up to the cycle limit.
        </div>
      )}
    </div>
  );
}
