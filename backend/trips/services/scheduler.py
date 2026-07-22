"""
Dynamic HOS-compliant scheduling engine.

Given route legs (current -> pickup -> dropoff), a start datetime, and the
driver's current cycle hours used, this module simulates the trip minute by
minute (in variable-length chunks) and produces a chronological list of
ScheduleEvent-shaped dictionaries plus a parallel list of stop dictionaries
suitable for map markers.

This is a simulation, not a lookup table: every event is derived from the
actual distance/duration of each route leg and the HOS constants in
trips.services.hos.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

from .hos import HOSRules
from .routing import RouteLeg


@dataclass
class Leg:
    name: str  # "to_pickup" | "to_dropoff"
    distance_miles: float
    duration_hours: float
    start_location: str
    end_location: str


@dataclass
class SimEvent:
    event_type: str
    start_time: datetime
    end_time: datetime
    location: str
    description: str
    miles_covered: float = 0.0


@dataclass
class SchedulerResult:
    events: List[SimEvent] = field(default_factory=list)
    stops: List[SimEvent] = field(default_factory=list)
    total_miles: float = 0.0
    total_driving_hours: float = 0.0
    cycle_hours_used_end: float = 0.0
    status: str = "planned"  # planned | cycle_exceeded
    trip_days: int = 1


def build_schedule(
    legs: List[Leg],
    start_datetime: datetime,
    current_cycle_used: float,
    rules: Optional[HOSRules] = None,
) -> SchedulerResult:
    rules = rules or HOSRules()

    events: List[SimEvent] = []
    stops: List[SimEvent] = []

    current_time = start_datetime
    shift_hours_driven = 0.0          # counts toward the 11-hour driving limit
    window_start = start_datetime     # counts toward the 14-hour window
    hours_since_break = 0.0           # counts toward the 8-hour break trigger
    miles_since_fuel = 0.0
    cycle_used = current_cycle_used
    total_miles = 0.0
    total_driving_hours = 0.0
    status = "planned"

    safety_counter = 0
    max_iterations = 2000

    for leg in legs:
        remaining_leg_hours = leg.duration_hours
        speed_mph = (leg.distance_miles / leg.duration_hours) if leg.duration_hours > 0 else 45.0

        while remaining_leg_hours > 1e-6:
            safety_counter += 1
            if safety_counter > max_iterations:
                break

            if cycle_used >= rules.max_cycle_hours - 1e-6:
                status = "cycle_exceeded"
                break

            window_elapsed = (current_time - window_start).total_seconds() / 3600
            cap_shift = rules.max_driving_hours - shift_hours_driven
            cap_window = rules.max_driving_window_hours - window_elapsed
            cap_break = rules.required_break_after_hours - hours_since_break
            cap_cycle = rules.max_cycle_hours - cycle_used

            miles_to_fuel = rules.fuel_stop_interval_miles - miles_since_fuel
            cap_fuel = (miles_to_fuel / speed_mph) if speed_mph > 0 else float("inf")

            drivable_hours = min(
                remaining_leg_hours, cap_shift, cap_window, cap_break, cap_cycle, cap_fuel
            )

            if drivable_hours > 1e-6:
                chunk_hours = drivable_hours
                chunk_miles = chunk_hours * speed_mph
                chunk_end = current_time + timedelta(hours=chunk_hours)

                events.append(
                    SimEvent(
                        event_type="driving",
                        start_time=current_time,
                        end_time=chunk_end,
                        location=f"En route to {leg.end_location}",
                        description=f"Driving toward {leg.end_location}",
                        miles_covered=round(chunk_miles, 1),
                    )
                )

                current_time = chunk_end
                remaining_leg_hours -= chunk_hours
                shift_hours_driven += chunk_hours
                hours_since_break += chunk_hours
                miles_since_fuel += chunk_miles
                cycle_used += chunk_hours
                total_miles += chunk_miles
                total_driving_hours += chunk_hours
                continue

            # No more driving possible right now -- figure out which limit triggered
            # and insert the appropriate non-driving event. Priority: shift/window
            # (10-hr reset) > break > fuel.
            if cap_shift <= 1e-6 or cap_window <= 1e-6:
                rest_end = current_time + timedelta(hours=rules.required_off_duty_hours)
                events.append(
                    SimEvent(
                        event_type="sleeper",
                        start_time=current_time,
                        end_time=rest_end,
                        location="Sleeper Berth",
                        description="Required 10-hour off-duty / sleeper berth rest",
                    )
                )
                stops.append(events[-1])
                current_time = rest_end
                shift_hours_driven = 0.0
                hours_since_break = 0.0
                window_start = current_time
                continue

            if cap_break <= 1e-6:
                break_end = current_time + timedelta(minutes=rules.break_duration_minutes)
                events.append(
                    SimEvent(
                        event_type="break",
                        start_time=current_time,
                        end_time=break_end,
                        location="Rest Area",
                        description="Required 30-minute break",
                    )
                )
                stops.append(events[-1])
                current_time = break_end
                hours_since_break = 0.0
                continue

            if cap_fuel <= 1e-6:
                fuel_end = current_time + timedelta(minutes=rules.fuel_stop_duration_minutes)
                events.append(
                    SimEvent(
                        event_type="fuel",
                        start_time=current_time,
                        end_time=fuel_end,
                        location="Fuel Station",
                        description="Fuel stop",
                    )
                )
                stops.append(events[-1])
                current_time = fuel_end
                miles_since_fuel = 0.0
                cycle_used += rules.fuel_stop_duration_minutes / 60
                continue

            # Fallback safety exit
            break

        if status == "cycle_exceeded":
            break

        # Leg finished -- insert pickup/dropoff on-duty event
        if leg.name == "to_pickup":
            duration_min = rules.pickup_duration_minutes
            evt_type = "pickup"
            desc = f"Pickup at {leg.end_location}"
        else:
            duration_min = rules.dropoff_duration_minutes
            evt_type = "dropoff"
            desc = f"Dropoff at {leg.end_location}"

        stop_end = current_time + timedelta(minutes=duration_min)
        stop_event = SimEvent(
            event_type=evt_type,
            start_time=current_time,
            end_time=stop_end,
            location=leg.end_location,
            description=desc,
        )
        events.append(stop_event)
        stops.append(stop_event)
        current_time = stop_end
        cycle_used += duration_min / 60

    trip_days = (current_time.date() - start_datetime.date()).days + 1

    return SchedulerResult(
        events=events,
        stops=stops,
        total_miles=round(total_miles, 1),
        total_driving_hours=round(total_driving_hours, 2),
        cycle_hours_used_end=round(cycle_used, 2),
        status=status,
        trip_days=trip_days,
    )
