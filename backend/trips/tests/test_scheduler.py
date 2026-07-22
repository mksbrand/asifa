from datetime import datetime

from django.test import TestCase

from trips.services.hos import HOSRules
from trips.services.scheduler import build_schedule, Leg


class SchedulerTests(TestCase):
    def setUp(self):
        self.start = datetime(2026, 1, 1, 8, 0)

    def test_short_trip_no_breaks_needed(self):
        legs = [
            Leg("to_pickup", distance_miles=100, duration_hours=2,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=100, duration_hours=2,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0)
        self.assertEqual(result.status, "planned")
        self.assertAlmostEqual(result.total_driving_hours, 4, delta=0.1)
        event_types = [e.event_type for e in result.events]
        self.assertIn("pickup", event_types)
        self.assertIn("dropoff", event_types)
        self.assertNotIn("break", event_types)

    def test_30_minute_break_after_8_hours_driving(self):
        legs = [
            Leg("to_pickup", distance_miles=450, duration_hours=9,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=50, duration_hours=1,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0)
        breaks = [e for e in result.events if e.event_type == "break"]
        self.assertGreaterEqual(len(breaks), 1)

    def test_11_hour_driving_limit_triggers_rest(self):
        legs = [
            Leg("to_pickup", distance_miles=750, duration_hours=15,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=50, duration_hours=1,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0)
        sleeper_events = [e for e in result.events if e.event_type == "sleeper"]
        self.assertGreaterEqual(len(sleeper_events), 1)
        # No single driving block should exceed 11 hours.
        for e in result.events:
            if e.event_type == "driving":
                duration = (e.end_time - e.start_time).total_seconds() / 3600
                self.assertLessEqual(duration, 11 + 1e-6)

    def test_14_hour_window_enforced(self):
        rules = HOSRules()
        legs = [
            Leg("to_pickup", distance_miles=900, duration_hours=18,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=100, duration_hours=2,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0, rules=rules)
        self.assertGreater(result.trip_days, 1)

    def test_fuel_stop_inserted_over_1000_miles(self):
        legs = [
            Leg("to_pickup", distance_miles=1200, duration_hours=24,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=100, duration_hours=2,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0)
        fuel_events = [e for e in result.events if e.event_type == "fuel"]
        self.assertGreaterEqual(len(fuel_events), 1)

    def test_pickup_and_dropoff_duration_one_hour(self):
        legs = [
            Leg("to_pickup", distance_miles=100, duration_hours=2,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=100, duration_hours=2,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0)
        pickup = next(e for e in result.events if e.event_type == "pickup")
        dropoff = next(e for e in result.events if e.event_type == "dropoff")
        self.assertEqual((pickup.end_time - pickup.start_time).total_seconds() / 60, 60)
        self.assertEqual((dropoff.end_time - dropoff.start_time).total_seconds() / 60, 60)

    def test_cycle_limit_exceeded_flagged(self):
        legs = [
            Leg("to_pickup", distance_miles=3000, duration_hours=60,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=500, duration_hours=10,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=65)
        self.assertEqual(result.status, "cycle_exceeded")

    def test_multi_day_trip_spans_multiple_days(self):
        legs = [
            Leg("to_pickup", distance_miles=1500, duration_hours=30,
                start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=500, duration_hours=10,
                start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, self.start, current_cycle_used=0)
        self.assertGreaterEqual(result.trip_days, 2)
