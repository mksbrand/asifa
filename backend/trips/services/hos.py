"""
Hours of Service (HOS) rules for property-carrying commercial drivers.

Reference assumptions (per the project brief):
- 70 hours / 8 days cycle
- 11 hours maximum driving after 10 consecutive hours off duty
- 14-hour driving window
- 30-minute break required after 8 cumulative hours of driving
- 10 consecutive hours off-duty/sleeper berth rest required to reset the shift
- No adverse driving conditions exception applied
"""
from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class HOSRules:
    max_cycle_hours: float = settings.MAX_CYCLE_HOURS
    max_driving_window_hours: float = settings.MAX_DRIVING_WINDOW_HOURS
    max_driving_hours: float = settings.MAX_DRIVING_HOURS
    required_break_after_hours: float = settings.REQUIRED_BREAK_AFTER_HOURS
    break_duration_minutes: int = settings.BREAK_DURATION_MINUTES
    required_off_duty_hours: float = settings.REQUIRED_OFF_DUTY_HOURS
    fuel_stop_interval_miles: float = settings.FUEL_STOP_INTERVAL_MILES
    fuel_stop_duration_minutes: int = settings.FUEL_STOP_DURATION_MINUTES
    pickup_duration_minutes: int = settings.PICKUP_DURATION_MINUTES
    dropoff_duration_minutes: int = settings.DROPOFF_DURATION_MINUTES


class CycleLimitExceeded(Exception):
    """Raised when a trip cannot be completed within the driver's remaining cycle hours."""


def cycle_remaining_hours(current_cycle_used: float, rules: HOSRules = HOSRules()) -> float:
    """Return the number of on-duty hours remaining before the 70-hour/8-day cap."""
    remaining = rules.max_cycle_hours - current_cycle_used
    return max(0.0, round(remaining, 2))


def validate_cycle_input(current_cycle_used: float) -> None:
    if current_cycle_used < 0 or current_cycle_used > 70:
        raise ValueError("Current cycle used must be between 0 and 70 hours.")
