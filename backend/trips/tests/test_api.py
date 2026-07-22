from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from trips.services.geocoding import GeocodedLocation
from trips.services.routing import RouteResult, RouteLeg
from trips.models import Trip


def fake_geocode(query, timeout=10):
    fake_coords = {
        "Chicago, IL": (41.8781, -87.6298),
        "Dallas, TX": (32.7767, -96.7970),
        "Houston, TX": (29.7604, -95.3698),
    }
    lat, lng = fake_coords.get(query, (39.0, -94.0))
    return GeocodedLocation(query=query, display_name=query, latitude=lat, longitude=lng)


def fake_route(waypoints, timeout=15):
    return RouteResult(
        distance_miles=1247.0,
        duration_hours=21.5,
        geometry=[[41.87, -87.62], [37.0, -92.0], [32.77, -96.79], [29.76, -95.36]],
        legs=[
            RouteLeg(distance_miles=900.0, duration_hours=15.5),
            RouteLeg(distance_miles=347.0, duration_hours=6.0),
        ],
    )


class TripPlanAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("trips.views.get_route", side_effect=fake_route)
    @patch("trips.views.geocode_location", side_effect=fake_geocode)
    def test_plan_trip_success(self, mock_geocode, mock_route):
        payload = {
            "current_location": "Chicago, IL",
            "pickup_location": "Dallas, TX",
            "dropoff_location": "Houston, TX",
            "current_cycle_used": 10,
            "start_date": "2026-01-01",
            "start_time": "08:00:00",
        }
        response = self.client.post("/api/trips/plan/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertIn("trip", body)
        self.assertGreater(body["trip"]["distance_miles"], 0)
        self.assertTrue(len(body["trip"]["events"]) > 0)
        self.assertTrue(len(body["trip"]["eld_logs"]) >= 1)

    def test_plan_trip_missing_fields(self):
        response = self.client.post("/api/trips/plan/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])

    def test_plan_trip_invalid_cycle_hours(self):
        payload = {
            "current_location": "Chicago, IL",
            "pickup_location": "Dallas, TX",
            "dropoff_location": "Houston, TX",
            "current_cycle_used": 90,
            "start_date": "2026-01-01",
            "start_time": "08:00:00",
        }
        response = self.client.post("/api/trips/plan/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("trips.views.get_route", side_effect=fake_route)
    @patch("trips.views.geocode_location", side_effect=fake_geocode)
    def test_trip_detail_endpoint(self, mock_geocode, mock_route):
        payload = {
            "current_location": "Chicago, IL",
            "pickup_location": "Dallas, TX",
            "dropoff_location": "Houston, TX",
            "current_cycle_used": 10,
            "start_date": "2026-01-01",
            "start_time": "08:00:00",
        }
        create_resp = self.client.post("/api/trips/plan/", payload, format="json")
        trip_id = create_resp.json()["trip"]["id"]

        detail_resp = self.client.get(f"/api/trips/{trip_id}/")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.json()["trip"]["id"], trip_id)

    def test_trip_detail_not_found(self):
        response = self.client.get("/api/trips/99999/")
        self.assertEqual(response.status_code, 404)

    def test_trip_list_endpoint(self):
        response = self.client.get("/api/trips/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("trips", response.json())
