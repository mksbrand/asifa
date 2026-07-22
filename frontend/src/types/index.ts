export type StopType = "current" | "pickup" | "dropoff" | "fuel" | "break" | "rest";

export type EventType =
  | "driving"
  | "break"
  | "fuel"
  | "pickup"
  | "dropoff"
  | "sleeper"
  | "off_duty"
  | "on_duty";

export type DutyStatus = "off_duty" | "sleeper" | "driving" | "on_duty";

export interface TripStop {
  id: number;
  stop_type: StopType;
  location: string;
  latitude: number | null;
  longitude: number | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  sequence: number;
}

export interface ScheduleEvent {
  id: number;
  event_type: EventType;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  miles_covered: number;
  sequence: number;
}

export interface ELDEvent {
  id: number;
  status: DutyStatus;
  start_time: string;
  end_time: string;
  label: string;
}

export interface ELDLog {
  id: number;
  date: string;
  day_number: number;
  total_driving_hours: number;
  total_on_duty_hours: number;
  total_off_duty_hours: number;
  total_sleeper_hours: number;
  total_miles: number;
  events: ELDEvent[];
}

export type TripStatus = "planned" | "cycle_exceeded" | "failed";

export interface Trip {
  id: number;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  start_date: string;
  start_time: string;
  distance_miles: number;
  driving_hours: number;
  cycle_remaining_hours: number;
  cycle_hours_remaining: number;
  trip_days: number;
  status: TripStatus;
  route_geometry: [number, number][];
  current_lat: number | null;
  current_lng: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  created_at: string;
  stops: TripStop[];
  events: ScheduleEvent[];
  eld_logs: ELDLog[];
}

export interface TripPlanRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  start_date: string;
  start_time: string;
}

export interface ApiSuccess<T> {
  success: true;
  trip: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
}
