"""
Converts a chronological list of scheduled events into one or more daily
ELD (Electronic Logging Device) logs, each covering a single calendar day
with four duty-status rows: Off Duty, Sleeper Berth, Driving, On Duty Not
Driving. Events that cross midnight are split at the day boundary.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date as date_cls
from typing import List, Dict

# Maps scheduler event types onto the four standard FMCSA duty statuses.
STATUS_MAP = {
    "driving": "driving",
    "break": "off_duty",
    "fuel": "on_duty",
    "pickup": "on_duty",
    "dropoff": "on_duty",
    "sleeper": "sleeper",
    "off_duty": "off_duty",
    "on_duty": "on_duty",
}


@dataclass
class ELDEventOut:
    status: str
    start_time: datetime
    end_time: datetime
    label: str


@dataclass
class ELDDayLog:
    date: date_cls
    day_number: int
    events: List[ELDEventOut] = field(default_factory=list)
    total_driving_hours: float = 0.0
    total_on_duty_hours: float = 0.0
    total_off_duty_hours: float = 0.0
    total_sleeper_hours: float = 0.0
    total_miles: float = 0.0


def _split_at_midnight(start: datetime, end: datetime):
    """Yield (segment_start, segment_end) tuples, one per calendar day."""
    segments = []
    cursor = start
    while cursor.date() < end.date():
        day_end = datetime.combine(cursor.date() + timedelta(days=1), datetime.min.time())
        segments.append((cursor, day_end))
        cursor = day_end
    segments.append((cursor, end))
    return segments


def generate_eld_logs(sim_events, start_date: date_cls) -> List[ELDDayLog]:
    """
    sim_events: list of objects with .event_type, .start_time, .end_time,
    .description, .miles_covered (scheduler.SimEvent instances).
    """
    logs_by_date: Dict[date_cls, ELDDayLog] = {}
    day_number_lookup: Dict[date_cls, int] = {}

    for evt in sim_events:
        status = STATUS_MAP.get(evt.event_type, "on_duty")
        for seg_start, seg_end in _split_at_midnight(evt.start_time, evt.end_time):
            if seg_end <= seg_start:
                continue
            d = seg_start.date()
            if d not in day_number_lookup:
                day_number_lookup[d] = (d - start_date).days + 1
            log = logs_by_date.setdefault(
                d, ELDDayLog(date=d, day_number=day_number_lookup[d])
            )
            hours = (seg_end - seg_start).total_seconds() / 3600
            log.events.append(
                ELDEventOut(
                    status=status,
                    start_time=seg_start,
                    end_time=seg_end,
                    label=evt.description,
                )
            )
            if status == "driving":
                log.total_driving_hours += hours
                log.total_miles += evt.miles_covered * (hours / max(
                    (evt.end_time - evt.start_time).total_seconds() / 3600, 1e-6
                ))
            elif status == "on_duty":
                log.total_on_duty_hours += hours
            elif status == "off_duty":
                log.total_off_duty_hours += hours
            elif status == "sleeper":
                log.total_sleeper_hours += hours

    ordered_dates = sorted(logs_by_date.keys())
    result = []
    for d in ordered_dates:
        log = logs_by_date[d]
        log.total_driving_hours = round(log.total_driving_hours, 2)
        log.total_on_duty_hours = round(log.total_on_duty_hours, 2)
        log.total_off_duty_hours = round(log.total_off_duty_hours, 2)
        log.total_sleeper_hours = round(log.total_sleeper_hours, 2)
        log.total_miles = round(log.total_miles, 1)
        result.append(log)
    return result
