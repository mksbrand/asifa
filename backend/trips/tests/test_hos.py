from django.test import TestCase

from trips.services.hos import HOSRules, cycle_remaining_hours, validate_cycle_input


class HOSRulesTests(TestCase):
    def test_default_rule_values(self):
        rules = HOSRules()
        self.assertEqual(rules.max_cycle_hours, 70)
        self.assertEqual(rules.max_driving_hours, 11)
        self.assertEqual(rules.max_driving_window_hours, 14)
        self.assertEqual(rules.required_break_after_hours, 8)
        self.assertEqual(rules.required_off_duty_hours, 10)

    def test_cycle_remaining_hours(self):
        self.assertEqual(cycle_remaining_hours(20), 50)
        self.assertEqual(cycle_remaining_hours(70), 0)
        self.assertEqual(cycle_remaining_hours(80), 0)  # never negative

    def test_validate_cycle_input_valid(self):
        validate_cycle_input(0)
        validate_cycle_input(70)
        validate_cycle_input(35.5)

    def test_validate_cycle_input_invalid(self):
        with self.assertRaises(ValueError):
            validate_cycle_input(-1)
        with self.assertRaises(ValueError):
            validate_cycle_input(71)
