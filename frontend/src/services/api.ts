import axios from "axios";
import type { Trip, TripPlanRequest, ApiError } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export class TripPlanningError extends Error {
  details?: string;
  constructor(message: string, details?: string) {
    super(message);
    this.name = "TripPlanningError";
    this.details = details;
  }
}

function extractApiError(err: unknown): TripPlanningError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.error) {
      return new TripPlanningError(data.error, data.details);
    }
    if (err.code === "ECONNABORTED") {
      return new TripPlanningError("The request timed out. Please try again.");
    }
    if (!err.response) {
      return new TripPlanningError(
        "Could not reach the TripPilot server. Is the backend running?"
      );
    }
  }
  return new TripPlanningError("Something went wrong while planning your trip.");
}

export async function planTrip(payload: TripPlanRequest): Promise<Trip> {
  try {
    const response = await apiClient.post<{ success: true; trip: Trip }>(
      "/trips/plan/",
      payload
    );
    return response.data.trip;
  } catch (err) {
    throw extractApiError(err);
  }
}

export async function getTrip(id: number | string): Promise<Trip> {
  try {
    const response = await apiClient.get<{ success: true; trip: Trip }>(
      `/trips/${id}/`
    );
    return response.data.trip;
  } catch (err) {
    throw extractApiError(err);
  }
}

export async function listTrips(): Promise<Trip[]> {
  try {
    const response = await apiClient.get<{ success: true; trips: Trip[] }>("/trips/");
    return response.data.trips;
  } catch (err) {
    throw extractApiError(err);
  }
}
