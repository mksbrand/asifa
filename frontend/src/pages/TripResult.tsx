import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTrip, TripPlanningError } from "../services/api";
import type { Trip } from "../types";
import TripSummary from "../components/TripSummary";
import SummaryCards from "../components/SummaryCards";
import RouteMap from "../components/RouteMap";
import StopTimeline from "../components/StopTimeline";
import ELDLogViewer from "../components/ELDLog";
import LoadingOverlay from "../components/LoadingOverlay";
import EmptyState from "../components/EmptyState";

export default function TripResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getTrip(id)
      .then(setTrip)
      .catch((err) => {
        setError(err instanceof TripPlanningError ? err.message : "Failed to load trip.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <LoadingOverlay message="Loading your trip results..." />
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState
          icon="🚫"
          title="Trip not found"
          message={error || "We couldn't find the trip you're looking for."}
          action={{ label: "Plan a New Trip", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <TripSummary trip={trip} />
      <SummaryCards trip={trip} />
      <RouteMap trip={trip} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <StopTimeline trip={trip} />
        <ELDLogViewer trip={trip} />
      </div>
    </main>
  );
}
