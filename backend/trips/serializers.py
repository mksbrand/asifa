from rest_framework import serializers

from .models import Trip, TripStop, ScheduleEvent, ELDLog, ELDEvent


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255, allow_blank=False)
    pickup_location = serializers.CharField(max_length=255, allow_blank=False)
    dropoff_location = serializers.CharField(max_length=255, allow_blank=False)
    current_cycle_used = serializers.FloatField(min_value=0, max_value=70)
    start_date = serializers.DateField()
    start_time = serializers.TimeField()

    def validate(self, attrs):
        for field_name in ("current_location", "pickup_location", "dropoff_location"):
            if not attrs.get(field_name, "").strip():
                raise serializers.ValidationError({field_name: "This field is required."})
        return attrs


class TripStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripStop
        fields = [
            "id", "stop_type", "location", "latitude", "longitude",
            "start_time", "end_time", "duration_minutes", "sequence",
        ]


class ScheduleEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleEvent
        fields = [
            "id", "event_type", "start_time", "end_time",
            "location", "description", "miles_covered", "sequence",
        ]


class ELDEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ELDEvent
        fields = ["id", "status", "start_time", "end_time", "label"]


class ELDLogSerializer(serializers.ModelSerializer):
    events = ELDEventSerializer(many=True, read_only=True)

    class Meta:
        model = ELDLog
        fields = [
            "id", "date", "day_number", "total_driving_hours",
            "total_on_duty_hours", "total_off_duty_hours",
            "total_sleeper_hours", "total_miles", "events",
        ]


class TripSerializer(serializers.ModelSerializer):
    stops = TripStopSerializer(many=True, read_only=True)
    events = ScheduleEventSerializer(many=True, read_only=True)
    eld_logs = ELDLogSerializer(many=True, read_only=True)
    cycle_hours_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id", "current_location", "pickup_location", "dropoff_location",
            "current_cycle_used", "start_date", "start_time",
            "distance_miles", "driving_hours", "cycle_remaining_hours",
            "cycle_hours_remaining", "trip_days", "status", "route_geometry",
            "current_lat", "current_lng", "pickup_lat", "pickup_lng",
            "dropoff_lat", "dropoff_lng", "created_at",
            "stops", "events", "eld_logs",
        ]

    def get_cycle_hours_remaining(self, obj):
        return max(0.0, round(70 - obj.current_cycle_used, 2))
