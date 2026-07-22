import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { Trip, StopType } from "../types";

// Fix default Leaflet marker icons under bundlers.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

const MARKER_STYLES: Record<StopType, { color: string; label: string; emoji: string }> = {
  current: { color: "#0f172a", label: "Current Location", emoji: "📍" },
  pickup: { color: "#2563eb", label: "Pickup", emoji: "📦" },
  dropoff: { color: "#16a34a", label: "Dropoff", emoji: "🏁" },
  fuel: { color: "#f59e0b", label: "Fuel Stop", emoji: "⛽" },
  break: { color: "#7c3aed", label: "30-Min Break", emoji: "☕" },
  rest: { color: "#dc2626", label: "Sleeper Berth", emoji: "🛏️" },
};

function makeIcon(stopType: StopType) {
  const style = MARKER_STYLES[stopType];
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:${style.color};transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;">
      <span style="transform:rotate(45deg);font-size:14px;">${style.emoji}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RouteMap({ trip }: { trip: Trip }) {
  const routeLine: [number, number][] = trip.route_geometry as [number, number][];
  const markers = trip.stops.filter((s) => s.latitude !== null && s.longitude !== null);
  const boundsPositions: [number, number][] =
    routeLine.length > 0 ? routeLine : markers.map((m) => [m.latitude!, m.longitude!]);
  const center: [number, number] = boundsPositions[0] || [39.8283, -98.5795];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="font-semibold text-navy-900">Interactive Route Map</h3>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(MARKER_STYLES) as StopType[]).map((key) => (
            <div key={key} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: MARKER_STYLES[key].color }}
              />
              {MARKER_STYLES[key].label}
            </div>
          ))}
        </div>
      </div>

      <div className="h-[420px] w-full sm:h-[480px]">
        <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeLine.length > 1 && (
            <Polyline positions={routeLine} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.85 }} />
          )}
          {markers.map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.latitude!, stop.longitude!]}
              icon={makeIcon(stop.stop_type)}
            >
              <Popup>
                <div className="min-w-[180px] text-sm">
                  <p className="mb-1 font-bold text-navy-900">{MARKER_STYLES[stop.stop_type].label}</p>
                  <p className="text-slate-600">{stop.location}</p>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    <p><strong>Arrival:</strong> {formatTime(stop.start_time)}</p>
                    <p><strong>Departure:</strong> {formatTime(stop.end_time)}</p>
                    <p><strong>Duration:</strong> {stop.duration_minutes} min</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          <FitBounds positions={boundsPositions} />
        </MapContainer>
      </div>
    </div>
  );
}
