import { useMemo, useState } from "react";
import type { Trip, ELDLog as ELDLogType, ELDEvent, DutyStatus } from "../types";

const ROW_ORDER: DutyStatus[] = ["off_duty", "sleeper", "driving", "on_duty"];
const ROW_LABELS: Record<DutyStatus, string> = {
  off_duty: "1. Off Duty",
  sleeper: "2. Sleeper Berth",
  driving: "3. Driving",
  on_duty: "4. On Duty (Not Driving)",
};
const ROW_COLORS: Record<DutyStatus, string> = {
  off_duty: "#94a3b8",
  sleeper: "#dc2626",
  driving: "#2563eb",
  on_duty: "#f59e0b",
};

const CHART_LEFT = 130;
const CHART_TOP = 24;
const HOUR_WIDTH = 34;
const ROW_HEIGHT = 42;
const CHART_WIDTH = HOUR_WIDTH * 24;
const CHART_HEIGHT = ROW_HEIGHT * 4;
const SVG_WIDTH = CHART_LEFT + CHART_WIDTH + 20;
const SVG_HEIGHT = CHART_TOP + CHART_HEIGHT + 40;

function minutesSinceMidnight(iso: string, dayDate: string) {
  const d = new Date(iso);
  const midnight = new Date(dayDate + "T00:00:00");
  return Math.max(0, Math.min(1440, (d.getTime() - midnight.getTime()) / 60000));
}

function xForMinutes(min: number) {
  return CHART_LEFT + (min / 60) * HOUR_WIDTH;
}

function yForRow(status: DutyStatus) {
  const idx = ROW_ORDER.indexOf(status);
  return CHART_TOP + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
}

function buildPath(events: ELDEvent[], dayDate: string) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const segments: { x1: number; x2: number; y: number; status: DutyStatus }[] = [];
  const connectors: { x: number; y1: number; y2: number }[] = [];

  let prevY: number | null = null;
  for (const evt of sorted) {
    const x1 = xForMinutes(minutesSinceMidnight(evt.start_time, dayDate));
    const x2 = xForMinutes(minutesSinceMidnight(evt.end_time, dayDate));
    const y = yForRow(evt.status);
    if (x2 <= x1) continue;
    segments.push({ x1, x2, y, status: evt.status });
    if (prevY !== null && prevY !== y) {
      connectors.push({ x: x1, y1: prevY, y2: y });
    }
    prevY = y;
  }
  return { segments, connectors };
}

function formatHour(h: number) {
  if (h === 0 || h === 24) return "12A";
  if (h === 12) return "12P";
  return h > 12 ? `${h - 12}P` : `${h}A`;
}

function ELDGrid({ log }: { log: ELDLogType }) {
  const { segments, connectors } = useMemo(() => buildPath(log.events, log.date), [log]);

  return (
    <div className="eld-scroll overflow-x-auto">
      <svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="min-w-[760px]">
        {/* Row labels */}
        {ROW_ORDER.map((status, i) => (
          <text
            key={status}
            x={8}
            y={CHART_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
            fontSize="11"
            fontWeight={600}
            fill="#334155"
          >
            {ROW_LABELS[status]}
          </text>
        ))}

        {/* Horizontal row separators */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`row-${i}`}
            x1={CHART_LEFT}
            y1={CHART_TOP + i * ROW_HEIGHT}
            x2={CHART_LEFT + CHART_WIDTH}
            y2={CHART_TOP + i * ROW_HEIGHT}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        {/* Vertical hour gridlines + labels */}
        {Array.from({ length: 25 }).map((_, h) => (
          <g key={`hr-${h}`}>
            <line
              x1={CHART_LEFT + h * HOUR_WIDTH}
              y1={CHART_TOP}
              x2={CHART_LEFT + h * HOUR_WIDTH}
              y2={CHART_TOP + CHART_HEIGHT}
              stroke={h % 6 === 0 ? "#cbd5e1" : "#eef2f7"}
              strokeWidth={h % 6 === 0 ? 1.4 : 1}
            />
            <text
              x={CHART_LEFT + h * HOUR_WIDTH}
              y={CHART_TOP + CHART_HEIGHT + 16}
              fontSize="9"
              textAnchor="middle"
              fill="#94a3b8"
            >
              {formatHour(h)}
            </text>
          </g>
        ))}

        {/* Duty status line segments */}
        {segments.map((seg, i) => (
          <line
            key={`seg-${i}`}
            x1={seg.x1}
            y1={seg.y}
            x2={seg.x2}
            y2={seg.y}
            stroke={ROW_COLORS[seg.status]}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
        {/* Vertical connectors between status changes */}
        {connectors.map((c, i) => (
          <line
            key={`conn-${i}`}
            x1={c.x}
            y1={c.y1}
            x2={c.x}
            y2={c.y2}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
        ))}

        {/* Outer border */}
        <rect
          x={CHART_LEFT}
          y={CHART_TOP}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}

export default function ELDLogViewer({ trip }: { trip: Trip }) {
  const [dayIndex, setDayIndex] = useState(0);
  const logs = trip.eld_logs;

  if (logs.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        No ELD logs were generated for this trip.
      </div>
    );
  }

  const log = logs[dayIndex];

  return (
    <div className="card p-6 print-area">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-navy-900">Daily ELD Log</h3>
          <p className="text-xs text-slate-500">
            Day {log.day_number} of {logs.length} &middot; {new Date(log.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            className="btn-secondary !px-3 !py-2 text-xs"
            onClick={() => setDayIndex((i) => Math.max(0, i - 1))}
            disabled={dayIndex === 0}
          >
            ← Prev Day
          </button>
          <button
            className="btn-secondary !px-3 !py-2 text-xs"
            onClick={() => setDayIndex((i) => Math.min(logs.length - 1, i + 1))}
            disabled={dayIndex === logs.length - 1}
          >
            Next Day →
          </button>
          <button className="btn-primary !px-3 !py-2 text-xs" onClick={() => window.print()}>
            🖨 Print Log
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs sm:grid-cols-5">
        <div>
          <p className="text-slate-400">Driver</p>
          <p className="font-semibold text-navy-900">_______________</p>
        </div>
        <div>
          <p className="text-slate-400">Shipping Docs</p>
          <p className="font-semibold text-navy-900">_______________</p>
        </div>
        <div>
          <p className="text-slate-400">Main Office</p>
          <p className="font-semibold text-navy-900">TripPilot Fleet HQ</p>
        </div>
        <div>
          <p className="text-slate-400">Total Miles Today</p>
          <p className="font-semibold text-navy-900">{log.total_miles} mi</p>
        </div>
        <div>
          <p className="text-slate-400">Vehicle</p>
          <p className="font-semibold text-navy-900">Trip #{trip.id}</p>
        </div>
      </div>

      <ELDGrid log={log} />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Driving" value={log.total_driving_hours} color="#2563eb" />
        <SummaryStat label="On Duty" value={log.total_on_duty_hours} color="#f59e0b" />
        <SummaryStat label="Off Duty" value={log.total_off_duty_hours} color="#94a3b8" />
        <SummaryStat label="Sleeper" value={log.total_sleeper_hours} color="#dc2626" />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold text-navy-900">{value} hrs</p>
    </div>
  );
}
