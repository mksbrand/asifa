from django.urls import path

from .views import TripPlanView, TripDetailView, TripListView, health_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("trips/plan/", TripPlanView.as_view(), name="trip-plan"),
    path("trips/<int:pk>/", TripDetailView.as_view(), name="trip-detail"),
    path("trips/", TripListView.as_view(), name="trip-list"),
]
