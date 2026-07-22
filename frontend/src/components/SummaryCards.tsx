import type { Trip } from "../types";

function StatCard({
  label,
  value,
  suffix,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: "brand" | "amber" | "emerald" | "slate";
}) {
  const accentMap = {
    brand: "text-brand-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    slate: "text-navy-900",
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${accentMap[accent]}`}>
        {value}
        {suffix && <span className="ml-1 text-sm font-semibold text-slate-400">{suffix}</span>}
      </p>
    </div>
  );
}

export default function SummaryCards({ trip }: { trip: Trip }) {
  const stopCount = trip.stops.filter((s) => s.stop_type !== "current").length;
  const cycleAccent = trip.cycle_hours_remaining < 10 ? "amber" : "emerald";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total Distance" value={trip.distance_miles.toLocaleString()} suffix="mi" />
      <StatCard label="Driving Time" value={trip.driving_hours} suffix="hrs" />
      <StatCard
        label="Trip Duration"
        value={trip.trip_days}
        suffix={trip.trip_days === 1 ? "day" : "days"}
      />
      <StatCard
        label="Cycle Remaining"
        value={trip.cycle_hours_remaining}
        suffix="hrs"
        accent={cycleAccent}
      />
      <StatCard label="Trip Days" value={trip.trip_days} accent="slate" />
      <StatCard label="Total Stops" value={stopCount} accent="slate" />
    </div>
  );
}
