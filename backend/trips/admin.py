from django.contrib import admin

from .models import Trip, TripStop, ScheduleEvent, ELDLog, ELDEvent


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("id", "current_location", "pickup_location", "dropoff_location",
                     "distance_miles", "trip_days", "status", "created_at")
    list_filter = ("status",)


admin.site.register(TripStop)
admin.site.register(ScheduleEvent)
admin.site.register(ELDLog)
admin.site.register(ELDEvent)
