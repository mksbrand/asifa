from django.db import models


class Trip(models.Model):
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("cycle_exceeded", "Cycle Exceeded"),
        ("failed", "Failed"),
    ]

    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField()
    start_date = models.DateField()
    start_time = models.TimeField()

    distance_miles = models.FloatField(default=0)
    driving_hours = models.FloatField(default=0)
    cycle_remaining_hours = models.FloatField(default=0)
    trip_days = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planned")

    route_geometry = models.JSONField(default=list, blank=True)

    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    dropoff_lat = models.FloatField(null=True, blank=True)
    dropoff_lng = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Trip #{self.id}: {self.pickup_location} -> {self.dropoff_location}"


class TripStop(models.Model):
    STOP_TYPES = [
        ("current", "Current Location"),
        ("pickup", "Pickup"),
        ("dropoff", "Dropoff"),
        ("fuel", "Fuel Stop"),
        ("break", "30-Minute Break"),
        ("rest", "10-Hour Rest / Sleeper Berth"),
    ]

    trip = models.ForeignKey(Trip, related_name="stops", on_delete=models.CASCADE)
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    location = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=0)
    sequence = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.stop_type} @ {self.location}"


class ScheduleEvent(models.Model):
    EVENT_TYPES = [
        ("driving", "Driving"),
        ("break", "30-Minute Break"),
        ("fuel", "Fuel"),
        ("pickup", "Pickup"),
        ("dropoff", "Dropoff"),
        ("sleeper", "Sleeper Berth"),
        ("off_duty", "Off Duty"),
        ("on_duty", "On Duty Not Driving"),
    ]

    trip = models.ForeignKey(Trip, related_name="events", on_delete=models.CASCADE)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)
    description = models.CharField(max_length=255, blank=True)
    miles_covered = models.FloatField(default=0)
    sequence = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.event_type} {self.start_time} - {self.end_time}"


class ELDLog(models.Model):
    trip = models.ForeignKey(Trip, related_name="eld_logs", on_delete=models.CASCADE)
    date = models.DateField()
    total_driving_hours = models.FloatField(default=0)
    total_on_duty_hours = models.FloatField(default=0)
    total_off_duty_hours = models.FloatField(default=0)
    total_sleeper_hours = models.FloatField(default=0)
    total_miles = models.FloatField(default=0)
    day_number = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"ELD Log {self.date} (Trip #{self.trip_id})"


class ELDEvent(models.Model):
    STATUS_CHOICES = [
        ("off_duty", "Off Duty"),
        ("sleeper", "Sleeper Berth"),
        ("driving", "Driving"),
        ("on_duty", "On Duty Not Driving"),
    ]

    eld_log = models.ForeignKey(ELDLog, related_name="events", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    label = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.status} {self.start_time} - {self.end_time}"
