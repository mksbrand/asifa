"""Routing service backed by the free OSRM demo routing API."""
from dataclasses import dataclass, field
from typing import List, Tuple

import requests
from django.conf import settings


class RoutingError(Exception):
    """Raised when a route cannot be calculated between two or more points."""


@dataclass
class RouteLeg:
    distance_miles: float
    duration_hours: float


@dataclass
class RouteResult:
    distance_miles: float
    duration_hours: float
    geometry: List[List[float]] = field(default_factory=list)  # [[lat, lng], ...]
    legs: List[RouteLeg] = field(default_factory=list)


METERS_TO_MILES = 0.000621371
SECONDS_TO_HOURS = 1 / 3600


def get_route(
    waypoints: List[Tuple[float, float]], timeout: int = 15
) -> RouteResult:
    """
    Calculate a driving route through an ordered list of (lat, lng) waypoints
    using the public OSRM routing API.
    """
    if len(waypoints) < 2:
        raise RoutingError("At least two waypoints are required to calculate a route.")

    coords = ";".join(f"{lng},{lat}" for lat, lng in waypoints)
    url = f"{settings.OSRM_BASE_URL}/route/v1/driving/{coords}"
    params = {"overview": "full", "geometries": "geojson"}

    try:
        response = requests.get(url, params=params, timeout=timeout)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.Timeout as exc:
        raise RoutingError("Routing service timed out. Please try again.") from exc
    except requests.exceptions.RequestException as exc:
        raise RoutingError(f"Routing service error: {exc}") from exc

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RoutingError("No route could be found between the provided locations.")

    route = data["routes"][0]
    distance_miles = route["distance"] * METERS_TO_MILES
    duration_hours = route["duration"] * SECONDS_TO_HOURS

    raw_coords = route.get("geometry", {}).get("coordinates", [])
    # GeoJSON coordinates are [lng, lat]; flip to [lat, lng] for Leaflet.
    geometry = [[lat, lng] for lng, lat in raw_coords]

    legs = [
        RouteLeg(
            distance_miles=round(leg["distance"] * METERS_TO_MILES, 1),
            duration_hours=round(leg["duration"] * SECONDS_TO_HOURS, 2),
        )
        for leg in route.get("legs", [])
    ]

    return RouteResult(
        distance_miles=round(distance_miles, 1),
        duration_hours=round(duration_hours, 2),
        geometry=geometry,
        legs=legs,
    )
