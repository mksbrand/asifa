from datetime import datetime

from django.test import TestCase

from trips.services.scheduler import build_schedule, Leg
from trips.services.eld import generate_eld_logs


class ELDGenerationTests(TestCase):
    def test_single_day_log_totals(self):
        start = datetime(2026, 1, 1, 8, 0)
        legs = [
            Leg("to_pickup", distance_miles=100, duration_hours=2, start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=100, duration_hours=2, start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, start, current_cycle_used=0)
        logs = generate_eld_logs(result.events, start.date())
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertAlmostEqual(log.total_driving_hours, 4, delta=0.1)
        self.assertGreater(log.total_on_duty_hours, 0)

    def test_multi_day_split_at_midnight(self):
        start = datetime(2026, 1, 1, 8, 0)
        legs = [
            Leg("to_pickup", distance_miles=1500, duration_hours=30, start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=200, duration_hours=4, start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, start, current_cycle_used=0)
        logs = generate_eld_logs(result.events, start.date())
        self.assertGreaterEqual(len(logs), 2)
        for log in logs:
            total = (
                log.total_driving_hours + log.total_on_duty_hours
                + log.total_off_duty_hours + log.total_sleeper_hours
            )
            self.assertLessEqual(total, 24.01)

    def test_day_numbers_increment(self):
        start = datetime(2026, 1, 1, 8, 0)
        legs = [
            Leg("to_pickup", distance_miles=1500, duration_hours=30, start_location="A", end_location="B"),
            Leg("to_dropoff", distance_miles=200, duration_hours=4, start_location="B", end_location="C"),
        ]
        result = build_schedule(legs, start, current_cycle_used=0)
        logs = generate_eld_logs(result.events, start.date())
        day_numbers = [log.day_number for log in logs]
        self.assertEqual(day_numbers, sorted(day_numbers))
        self.assertEqual(day_numbers[0], 1)
