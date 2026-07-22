from datetime import datetime

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Trip, TripStop, ScheduleEvent, ELDLog, ELDEvent
from .serializers import TripPlanRequestSerializer, TripSerializer
from .services.geocoding import geocode_location, GeocodingError
from .services.routing import get_route, RoutingError
from .services.hos import HOSRules
from .services.scheduler import build_schedule, Leg
from .services.eld import generate_eld_logs


def error_response(message: str, details: str = "", http_status=status.HTTP_400_BAD_REQUEST):
    return Response(
        {"success": False, "error": message, "details": details}, status=http_status
    )


class TripPlanView(APIView):
    """POST /api/trips/plan/ -- orchestrates the full trip-planning pipeline."""

    def post(self, request):
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                "Invalid trip input.", details=str(serializer.errors)
            )

        data = serializer.validated_data

        # --- 1. Geocode all three locations ---
        try:
            current_geo = geocode_location(data["current_location"])
            pickup_geo = geocode_location(data["pickup_location"])
            dropoff_geo = geocode_location(data["dropoff_location"])
        except GeocodingError as exc:
            return error_response("Unable to locate one of the addresses provided.", str(exc))

        # --- 2. Calculate the route across all three waypoints ---
        waypoints = [
            (current_geo.latitude, current_geo.longitude),
            (pickup_geo.latitude, pickup_geo.longitude),
            (dropoff_geo.latitude, dropoff_geo.longitude),
        ]
        try:
            route = get_route(waypoints)
        except RoutingError as exc:
            return error_response("Unable to calculate route.", str(exc))

        if len(route.legs) < 2:
            return error_response(
                "Routing service did not return complete leg information.",
                "Expected two legs: current->pickup and pickup->dropoff.",
            )

        # --- 3. Build HOS-compliant schedule ---
        start_dt = datetime.combine(data["start_date"], data["start_time"])
        legs = [
            Leg(
                name="to_pickup",
                distance_miles=route.legs[0].distance_miles,
                duration_hours=route.legs[0].duration_hours,
                start_location=data["current_location"],
                end_location=data["pickup_location"],
            ),
            Leg(
                name="to_dropoff",
                distance_miles=route.legs[1].distance_miles,
                duration_hours=route.legs[1].duration_hours,
                start_location=data["pickup_location"],
                end_location=data["dropoff_location"],
            ),
        ]

        rules = HOSRules()
        sched_result = build_schedule(
            legs=legs,
            start_datetime=start_dt,
            current_cycle_used=data["current_cycle_used"],
            rules=rules,
        )

        # --- 4. Generate ELD logs from the schedule ---
        eld_day_logs = generate_eld_logs(sched_result.events, data["start_date"])

        # --- 5. Persist everything ---
        with transaction.atomic():
            trip = Trip.objects.create(
                current_location=data["current_location"],
                pickup_location=data["pickup_location"],
                dropoff_location=data["dropoff_location"],
                current_cycle_used=data["current_cycle_used"],
                start_date=data["start_date"],
                start_time=data["start_time"],
                distance_miles=sched_result.total_miles,
                driving_hours=sched_result.total_driving_hours,
                cycle_remaining_hours=max(0.0, round(70 - sched_result.cycle_hours_used_end, 2)),
                trip_days=sched_result.trip_days,
                status=sched_result.status,
                route_geometry=route.geometry,
                current_lat=current_geo.latitude,
                current_lng=current_geo.longitude,
                pickup_lat=pickup_geo.latitude,
                pickup_lng=pickup_geo.longitude,
                dropoff_lat=dropoff_geo.latitude,
                dropoff_lng=dropoff_geo.longitude,
            )

            # Current-location marker as an implicit "stop"
            TripStop.objects.create(
                trip=trip, stop_type="current", location=data["current_location"],
                latitude=current_geo.latitude, longitude=current_geo.longitude,
                start_time=start_dt, end_time=start_dt, duration_minutes=0, sequence=0,
            )

            STOP_TYPE_MAP = {
                "pickup": "pickup", "dropoff": "dropoff", "fuel": "fuel",
                "break": "break", "sleeper": "rest",
            }
            for i, evt in enumerate(sched_result.events, start=1):
                ScheduleEvent.objects.create(
                    trip=trip, event_type=evt.event_type, start_time=evt.start_time,
                    end_time=evt.end_time, location=evt.location,
                    description=evt.description, miles_covered=evt.miles_covered,
                    sequence=i,
                )
                if evt.event_type in STOP_TYPE_MAP:
                    lat, lng = _interpolate_position(
                        route.geometry, evt, start_dt, sched_result
                    )
                    TripStop.objects.create(
                        trip=trip, stop_type=STOP_TYPE_MAP[evt.event_type],
                        location=evt.location if evt.event_type in ("pickup", "dropoff") else evt.description,
                        latitude=lat, longitude=lng,
                        start_time=evt.start_time, end_time=evt.end_time,
                        duration_minutes=int((evt.end_time - evt.start_time).total_seconds() / 60),
                        sequence=i,
                    )

            for day_log in eld_day_logs:
                log_obj = ELDLog.objects.create(
                    trip=trip, date=day_log.date, day_number=day_log.day_number,
                    total_driving_hours=day_log.total_driving_hours,
                    total_on_duty_hours=day_log.total_on_duty_hours,
                    total_off_duty_hours=day_log.total_off_duty_hours,
                    total_sleeper_hours=day_log.total_sleeper_hours,
                    total_miles=day_log.total_miles,
                )
                for e in day_log.events:
                    ELDEvent.objects.create(
                        eld_log=log_obj, status=e.status,
                        start_time=e.start_time, end_time=e.end_time, label=e.label,
                    )

        # Fix pickup/dropoff stops to use exact geocoded coordinates.
        TripStop.objects.filter(trip=trip, stop_type="pickup").update(
            latitude=pickup_geo.latitude, longitude=pickup_geo.longitude
        )
        TripStop.objects.filter(trip=trip, stop_type="dropoff").update(
            latitude=dropoff_geo.latitude, longitude=dropoff_geo.longitude
        )

        result_serializer = TripSerializer(trip)
        return Response(
            {"success": True, "trip": result_serializer.data},
            status=status.HTTP_201_CREATED,
        )


def _interpolate_position(geometry, evt, trip_start_dt, sched_result):
    """Approximate a lat/lng for a mid-trip event using the route polyline.

    Uses the event's elapsed wall-clock time as a fraction of the overall
    trip duration to pick a point along the decoded route geometry. This is
    a best-effort visual approximation for map markers; it does not affect
    HOS math, which is computed purely from distance/time, not geometry.
    """
    if not geometry or len(geometry) < 2:
        return None, None

    last_event = sched_result.events[-1] if sched_result.events else None
    trip_end_dt = last_event.end_time if last_event else trip_start_dt
    total_seconds = (trip_end_dt - trip_start_dt).total_seconds()
    if total_seconds <= 0:
        return geometry[0][0], geometry[0][1]

    elapsed = (evt.start_time - trip_start_dt).total_seconds()
    fraction = min(1.0, max(0.0, elapsed / total_seconds))
    idx = int(fraction * (len(geometry) - 1))
    return geometry[idx][0], geometry[idx][1]


class TripDetailView(APIView):
    """GET /api/trips/<id>/"""

    def get(self, request, pk):
        try:
            trip = Trip.objects.get(pk=pk)
        except Trip.DoesNotExist:
            return error_response("Trip not found.", http_status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "trip": TripSerializer(trip).data})


class TripListView(APIView):
    """GET /api/trips/"""

    def get(self, request):
        trips = Trip.objects.all()[:50]
        return Response(
            {"success": True, "trips": TripSerializer(trips, many=True).data}
        )


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})
