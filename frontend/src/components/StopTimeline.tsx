import type { Trip, EventType } from "../types";

const EVENT_META: Record<EventType, { emoji: string; label: string; color: string }> = {
  driving: { emoji: "🚚", label: "Driving", color: "border-brand-200 bg-brand-50" },
  break: { emoji: "☕", label: "30-Minute Break", color: "border-violet-200 bg-violet-50" },
  fuel: { emoji: "⛽", label: "Fuel Stop", color: "border-amber-200 bg-amber-50" },
  pickup: { emoji: "📦", label: "Pickup", color: "border-blue-200 bg-blue-50" },
  dropoff: { emoji: "🏁", label: "Dropoff", color: "border-emerald-200 bg-emerald-50" },
  sleeper: { emoji: "🛏️", label: "Sleeper Berth", color: "border-red-200 bg-red-50" },
  off_duty: { emoji: "🌙", label: "Off Duty", color: "border-slate-200 bg-slate-50" },
  on_duty: { emoji: "🧾", label: "On Duty", color: "border-slate-200 bg-slate-50" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startIso: string, endIso: string) {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function StopTimeline({ trip }: { trip: Trip }) {
  if (trip.events.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        No scheduled events available for this trip.
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="mb-5 font-semibold text-navy-900">Trip Timeline</h3>
      <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
        {trip.events.map((evt) => {
          const meta = EVENT_META[evt.event_type];
          return (
            <li key={evt.id} className="relative">
              <span className={`absolute -left-[31px] flex h-7 w-7 items-center justify-center rounded-full border-2 ${meta.color} text-sm`}>
                {meta.emoji}
              </span>
              <div className={`rounded-xl border p-4 ${meta.color}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy-900">{meta.label}</p>
                  <span className="text-xs font-medium text-slate-500">
                    {formatTime(evt.start_time)} – {formatTime(evt.end_time)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-600">
                  <span>⏱ {formatDuration(evt.start_time, evt.end_time)}</span>
                  {evt.miles_covered > 0 && <span>📏 {evt.miles_covered} mi</span>}
                  {evt.location && <span>📍 {evt.location}</span>}
                </div>
                {evt.description && <p className="mt-1 text-xs text-slate-500">{evt.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
