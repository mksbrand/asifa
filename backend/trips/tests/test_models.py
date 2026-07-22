from datetime import date, time

from django.test import TestCase

from trips.models import Trip, TripStop


class TripModelTests(TestCase):
    def test_create_trip(self):
        trip = Trip.objects.create(
            current_location="Chicago, IL",
            pickup_location="Dallas, TX",
            dropoff_location="Houston, TX",
            current_cycle_used=10,
            start_date=date(2026, 1, 1),
            start_time=time(8, 0),
            distance_miles=1247,
            driving_hours=21.5,
        )
        self.assertEqual(Trip.objects.count(), 1)
        self.assertEqual(trip.status, "planned")
        self.assertIn("Dallas, TX", str(trip))

    def test_trip_stop_relationship(self):
        trip = Trip.objects.create(
            current_location="A", pickup_location="B", dropoff_location="C",
            current_cycle_used=0, start_date=date(2026, 1, 1), start_time=time(8, 0),
        )
        TripStop.objects.create(
            trip=trip, stop_type="fuel", location="Fuel Station",
            start_time="2026-01-01T10:00:00Z", end_time="2026-01-01T10:30:00Z",
            duration_minutes=30, sequence=1,
        )
        self.assertEqual(trip.stops.count(), 1)
