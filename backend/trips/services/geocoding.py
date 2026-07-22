"""Geocoding service backed by the free OpenStreetMap Nominatim API."""
from dataclasses import dataclass
from typing import Optional

import requests
from django.conf import settings


class GeocodingError(Exception):
    """Raised when a location string cannot be resolved to coordinates."""


@dataclass
class GeocodedLocation:
    query: str
    display_name: str
    latitude: float
    longitude: float


def geocode_location(query: str, timeout: int = 10) -> GeocodedLocation:
    """Resolve a free-text address/city into latitude/longitude using Nominatim."""
    if not query or not query.strip():
        raise GeocodingError("Location cannot be empty.")

    url = f"{settings.NOMINATIM_BASE_URL}/search"
    params = {"q": query, "format": "json", "limit": 1, "addressdetails": 0}
    headers = {"User-Agent": "TripPilot-TruckPlanner/1.0 (assessment project)"}

    try:
        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.Timeout as exc:
        raise GeocodingError(f"Geocoding service timed out for '{query}'.") from exc
    except requests.exceptions.RequestException as exc:
        raise GeocodingError(f"Geocoding service error for '{query}': {exc}") from exc

    if not data:
        raise GeocodingError(f"Could not find a location matching '{query}'.")

    result = data[0]
    try:
        return GeocodedLocation(
            query=query,
            display_name=result.get("display_name", query),
            latitude=float(result["lat"]),
            longitude=float(result["lon"]),
        )
    except (KeyError, ValueError) as exc:
        raise GeocodingError(f"Malformed geocoding response for '{query}'.") from exc
